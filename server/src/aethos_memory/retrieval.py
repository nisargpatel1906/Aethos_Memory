from typing import Any, Callable
from aethos_memory.db import similarity_search
from aethos_memory.providers import call_embedding, call_extraction


def plain_search(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Strategy 1: Single pass vector similarity search."""
    embedding = call_embedding(query)
    return similarity_search(embedding, project=project, threshold=0.75, limit=5)


def conditional_retry_search(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Strategy 2: Plain search first; on a miss, rewrite query and search broader ("global")."""
    results = plain_search(query, project=project)
    if results:
        return results

    # Retry path: rewrite query for broader semantic coverage
    rewrite_prompt = (
        f"Rewrite this search query into a clear, expanded keyword concept for memory search: '{query}'. "
        "Return JSON: {\"rewritten_query\": \"...\"}"
    )
    try:
        extracted = call_extraction(rewrite_prompt)
        rewritten = extracted.get("rewritten_query", query)
    except Exception:
        rewritten = query

    new_embedding = call_embedding(rewritten)
    # Search broadened project context
    return similarity_search(new_embedding, project="global", threshold=0.65, limit=5)


def retry_and_rerank_search(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Strategy 3: Conditional retry search plus LLM relevance reranking/filtering pass."""
    candidates = conditional_retry_search(query, project=project)
    if not candidates:
        return []

    # LLM relevance filter pass
    formatted_candidates = "\n".join(
        [f"- ID: {c['id']} | Content: {c['content']}" for c in candidates]
    )
    rerank_prompt = f"""Evaluate these candidate memories against the query: "{query}".
CANDIDATES:
{formatted_candidates}

Return JSON with array of relevant candidate IDs:
{{"relevant_ids": ["id1", "id2"]}}"""

    try:
        res = call_extraction(rerank_prompt)
        relevant_ids = set(res.get("relevant_ids", []))
        if relevant_ids:
            return [c for c in candidates if c["id"] in relevant_ids]
    except Exception:
        pass

    return candidates


STRATEGIES: dict[str, Callable[[str, str], list[dict[str, Any]]]] = {
    "plain_search": plain_search,
    "conditional_retry_search": conditional_retry_search,
    "retry_and_rerank_search": retry_and_rerank_search,
}
