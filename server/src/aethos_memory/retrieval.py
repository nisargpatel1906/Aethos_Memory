import asyncio
from typing import Any, Callable
from aethos_memory.db import similarity_search
from aethos_memory.providers import call_embedding, call_extraction


async def plain_search(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Strategy 1: Single pass vector similarity search."""
    embedding = await call_embedding(query)
    return similarity_search(embedding, project=project, threshold=0.5, limit=8)


async def conditional_retry_search(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Strategy 2: Plain search first; on a miss, rewrite query and search broader ("global")."""
    results = await plain_search(query, project=project)
    if results:
        return results

    # Retry path: rewrite query for broader semantic coverage
    rewrite_prompt = (
        f"You are a memory search assistant. The query below failed to find any matching memories via vector search.\n"
        f"Rewrite it into a broader, semantically richer keyword phrase that captures the same intent but with more general vocabulary.\n"
        f"Focus on nouns, concepts, and entities — not filler words.\n"
        f"Original query: '{query}'\n"
        "Return strict JSON only: {\"rewritten_query\": \"...\"}"
    )
    try:
        extracted = await call_extraction(rewrite_prompt)
        rewritten = extracted.get("rewritten_query", query)
    except Exception:
        rewritten = query

    new_embedding = await call_embedding(rewritten)
    # Search broadened project context at a lower threshold
    broader = similarity_search(new_embedding, project="global", threshold=0.4, limit=8)
    if broader:
        return broader
    # Last resort: search original query at very low threshold globally
    last_embedding = await call_embedding(query)
    return similarity_search(last_embedding, project="global", threshold=0.35, limit=5)


async def retry_and_rerank_search(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Strategy 3 (active): Conditional retry search plus LLM relevance reranking/filtering pass.

    Empirically selected via eval/run_eval.py benchmark: 83.3% Hit@1, 0.875 MRR.
    """
    candidates = await conditional_retry_search(query, project=project)
    if not candidates:
        return []

    # LLM relevance filter + rerank pass
    formatted_candidates = "\n".join(
        [f"- ID: {c['id']} | Content: {c['content']}" for c in candidates]
    )
    rerank_prompt = f"""You are a memory relevance judge for a personal AI context system.

USER QUERY: "{query}"

CANDIDATE MEMORIES (retrieved via vector similarity):
{formatted_candidates}

For each candidate, decide if it is genuinely useful for answering the query.
A memory is relevant if it directly answers the query, provides necessary background context, or contains related identity/preference/decision facts the user would expect to be retrieved.
A memory is NOT relevant if it only superficially matches a keyword but does not help answer the query.

Return the IDs of all relevant memories in order of relevance (most relevant first).
Return strict JSON only — no text, no fences:
{{"relevant_ids": ["id1", "id2"]}}"""

    try:
        res = await call_extraction(rerank_prompt)
        relevant_ids = set(res.get("relevant_ids", []))
        if relevant_ids:
            return [c for c in candidates if c["id"] in relevant_ids]
    except Exception:
        pass

    return candidates


# Active strategy — selected empirically via benchmarks
async def active_strategy(query: str, project: str = "global") -> list[dict[str, Any]]:
    return await retry_and_rerank_search(query, project)


STRATEGIES: dict[str, Callable] = {
    "plain_search": plain_search,
    "conditional_retry_search": conditional_retry_search,
    "retry_and_rerank_search": retry_and_rerank_search,
}
