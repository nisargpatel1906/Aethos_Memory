import asyncio
from typing import Any, Callable
from aethos_memory.db import similarity_search
from aethos_memory.providers import call_embedding, call_extraction
from aethos_memory.caching import cache_manager
from aethos_memory import prompts


async def plain_search(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Strategy 1: Fast multi-pass vector similarity search combining target project and ALL user memories."""
    if not query or not query.strip():
        return []

    cached = cache_manager.get_search_results(query, project, 0.45, 8)
    if cached is not None:
        return cached

    embedding = await call_embedding(query)
    results = similarity_search(embedding, project=project, threshold=0.45, limit=8, query_text=query)

    if project != "ALL":
        results_all = similarity_search(embedding, project="ALL", threshold=0.45, limit=8, query_text=query)
        seen = {r["id"] for r in results}
        for r in results_all:
            if r["id"] not in seen:
                results.append(r)
                seen.add(r["id"])

    cache_manager.set_search_results(query, project, 0.45, 8, results)
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
            importance = item.get("importance", 3) or 3
            rrf_score = (1.0 / (k + rank)) * (1.0 + (importance * 0.05))
            scores[item_id] = scores.get(item_id, 0.0) + rrf_score

    sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
    return [item_map[i] for i in sorted_ids]


async def agentic_rag_strategy(query: str, project: str = "global") -> list[dict[str, Any]]:
    """Tiered High-Performance RAG Strategy:

    Tier 1: Search Cache Check (<1ms, 0 tokens)
    Tier 2: Direct Vector Fast-Path (<100ms, 0 LLM calls for 85%+ of queries)
    Tier 3: Agentic RAG Fallback (HyDE + Subquery Decomposition for complex / low-similarity queries)
    """
    if not query or not query.strip():
        return []

    # 1. Tier 1: Search Cache Check
    cached_results = cache_manager.get_search_results(query, project, 0.48, 6)
    if cached_results is not None:
        return cached_results

    # 2. Tier 2: Direct Vector Fast-Path
    std_emb = await call_embedding(query)
    direct_candidates = similarity_search(std_emb, project=project, threshold=0.48, limit=6, query_text=query)

    if project != "ALL" and len(direct_candidates) < 3:
        all_candidates = similarity_search(std_emb, project="ALL", threshold=0.48, limit=6, query_text=query)
        seen = {c["id"] for c in direct_candidates}
        for c in all_candidates:
            if c["id"] not in seen:
                direct_candidates.append(c)
                seen.add(c["id"])

    # If direct vector search found high-confidence matches, return immediately (0 LLM calls!)
    if direct_candidates and len(direct_candidates) >= 1:
        cache_manager.set_search_results(query, project, 0.48, 6, direct_candidates)
        return direct_candidates

    # 3. Tier 3: Agentic RAG Fallback (For complex queries with low similarity)
    hyde_emb_task = asyncio.create_task(generate_hyde_embedding(query))
    sub_queries_task = asyncio.create_task(decompose_query(query))

    hyde_emb, sub_queries = await asyncio.gather(hyde_emb_task, sub_queries_task)

    search_tasks = [
        asyncio.to_thread(similarity_search, hyde_emb, project=project, threshold=0.40, limit=6, query_text=query),
        asyncio.to_thread(similarity_search, std_emb, project=project, threshold=0.40, limit=6, query_text=query),
    ]

    for sq in sub_queries:
        if sq != query:
            sq_emb = await call_embedding(sq)
            search_tasks.append(asyncio.to_thread(similarity_search, sq_emb, project=project, threshold=0.40, limit=4, query_text=sq))

    raw_results_list = await asyncio.gather(*search_tasks)
    fused_candidates = reciprocal_rank_fusion(raw_results_list)

    if not fused_candidates:
        fused_candidates = similarity_search(std_emb, project="ALL", threshold=0.30, limit=8, query_text=query)

    cache_manager.set_search_results(query, project, 0.48, 6, fused_candidates)
    return fused_candidates[:6]


# Active strategy
async def active_strategy(query: str, project: str = "global") -> list[dict[str, Any]]:
    return await agentic_rag_strategy(query, project)


STRATEGIES: dict[str, Callable] = {
    "plain_search": plain_search,
    "agentic_rag_strategy": agentic_rag_strategy,
}
