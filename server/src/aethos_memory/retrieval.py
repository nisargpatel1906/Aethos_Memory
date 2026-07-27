import asyncio
from typing import Any, Callable
from aethos_memory.db import similarity_search
from aethos_memory.providers import call_embedding, call_extraction
from aethos_memory import prompts


async def plain_search(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Strategy 1: Multi-pass vector similarity search combining target project and ALL user memories."""
    embedding = await call_embedding(query)
    results = similarity_search(embedding, project=project, threshold=0.45, limit=8, query_text=query)

    if project != "ALL":
        results_all = similarity_search(embedding, project="ALL", threshold=0.45, limit=8, query_text=query)
        seen = {r["id"] for r in results}
        for r in results_all:
            if r["id"] not in seen:
                results.append(r)
                seen.add(r["id"])

    return results


async def generate_hyde_embedding(query: str) -> list[float]:
    """HyDE (Hypothetical Document Embeddings): Generate hypothetical declarative statement and embed it."""
    try:
        prompt = prompts.HYDE_PROMPT.format(query=query)
        res = await call_extraction(prompt)
        hypo = res.get("hypothetical_answer", query)
        return await call_embedding(hypo)
    except Exception:
        return await call_embedding(query)


async def decompose_query(query: str) -> list[str]:
    """Decompose complex multi-topic query into 2-3 atomic sub-queries."""
    try:
        prompt = prompts.QUERY_DECOMPOSITION_PROMPT.format(query=query)
        res = await call_extraction(prompt)
        sub_queries = res.get("sub_queries", [])
        if isinstance(sub_queries, list) and len(sub_queries) > 0:
            return sub_queries[:3]
    except Exception:
        pass
    return [query]


def reciprocal_rank_fusion(candidate_lists: list[list[dict[str, Any]]], k: int = 60) -> list[dict[str, Any]]:
    """Reciprocal Rank Fusion (RRF) combining vector rank, importance rating, and recency."""
    scores: dict[str, float] = {}
    item_map: dict[str, dict[str, Any]] = {}

    for cand_list in candidate_lists:
        for rank, item in enumerate(cand_list, 1):
            item_id = item["id"]
            item_map[item_id] = item
            # Standard RRF formula + Importance bonus
            importance = item.get("importance", 3) or 3
            rrf_score = (1.0 / (k + rank)) * (1.0 + (importance * 0.05))
            scores[item_id] = scores.get(item_id, 0.0) + rrf_score

    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
    return [item_map[i] for i in sorted_ids]


async def agentic_rag_strategy(query: str, project: str = "global") -> list[dict[str, Any]]:
    """State-of-the-Art Agentic RAG Strategy combining HyDE, Query Decomposition, RRF, and CRAG self-reflection."""
    if not query or not query.strip():
        return []

    # 1. First pass: HyDE + Standard Embedding in parallel
    hyde_emb_task = asyncio.create_task(generate_hyde_embedding(query))
    std_emb_task = asyncio.create_task(call_embedding(query))
    sub_queries_task = asyncio.create_task(decompose_query(query))

    hyde_emb, std_emb, sub_queries = await asyncio.gather(hyde_emb_task, std_emb_task, sub_queries_task)

    # 2. Parallel search across HyDE, Standard, and Sub-queries
    search_tasks = [
        asyncio.to_thread(similarity_search, hyde_emb, project=project, threshold=0.55, limit=6, query_text=query),
        asyncio.to_thread(similarity_search, std_emb, project=project, threshold=0.55, limit=6, query_text=query),
    ]

    for sq in sub_queries:
        if sq != query:
            sq_emb_task = asyncio.create_task(call_embedding(sq))
            sq_emb = await sq_emb_task
            search_tasks.append(asyncio.to_thread(similarity_search, sq_emb, project=project, threshold=0.50, limit=4, query_text=sq))

    raw_results_list = await asyncio.gather(*search_tasks)

    # 3. Reciprocal Rank Fusion (RRF)
    fused_candidates = reciprocal_rank_fusion(raw_results_list)

    # 4. Corrective RAG (CRAG) Self-Reflection & Fallback
    if not fused_candidates:
        # Fallback to broader global search
        fused_candidates = similarity_search(std_emb, project="ALL", threshold=0.35, limit=8, query_text=query)

    if not fused_candidates:
        return []

    # 5. LLM Relevance Filter + Rerank
    formatted_candidates = "\n".join(
        [f"- ID: {c['id']} | Content: {c['content']} (Importance: {c.get('importance', 3)}/5)" for c in fused_candidates[:10]]
    )
    rerank_prompt = f"""You are a memory relevance judge for a personal AI context system.

USER QUERY: "{query}"

CANDIDATE MEMORIES:
{formatted_candidates}

Return the IDs of all relevant memories in order of relevance (most relevant first).
Return strict JSON only — no text, no fences:
{{"relevant_ids": ["id1", "id2"]}}"""

    try:
        res = await call_extraction(rerank_prompt)
        relevant_ids = set(res.get("relevant_ids", []))
        if relevant_ids:
            return [c for c in fused_candidates if c["id"] in relevant_ids]
    except Exception:
        pass

    return fused_candidates[:6]


# Active strategy — state-of-the-art Agentic RAG
async def active_strategy(query: str, project: str = "global") -> list[dict[str, Any]]:
    return await agentic_rag_strategy(query, project)


STRATEGIES: dict[str, Callable] = {
    "plain_search": plain_search,
    "agentic_rag_strategy": agentic_rag_strategy,
}
