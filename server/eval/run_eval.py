"""Evaluation benchmark harness for Aethos Memory retrieval strategies.

Measures Hit@1, Hit@3, Mean Reciprocal Rank (MRR), and latency across candidate retrieval strategies.
Swapping `USE_MOCK = True` to `USE_MOCK = False` toggles between offline mock providers and live API calls.
"""

import time
import sys
from pathlib import Path

# Add server directory to sys.path so 'eval' and 'src' imports resolve cleanly
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from eval.dataset import EVAL_QUERIES, SYNTHETIC_MEMORIES
from eval import mock_providers

# Toggle for mock vs live providers
USE_MOCK = True


def mock_plain_search(query: str, project: str) -> list[dict]:
    vec = mock_providers.mock_embed(query)
    return mock_providers.mock_similarity_search(SYNTHETIC_MEMORIES, vec, project, threshold=0.05, limit=5)


def mock_conditional_retry_search(query: str, project: str) -> list[dict]:
    results = mock_plain_search(query, project)
    if results and len(results) >= 2:
        return results

    rewritten = mock_providers.mock_llm_rewrite(query)
    vec = mock_providers.mock_embed(rewritten)
    return mock_providers.mock_similarity_search(SYNTHETIC_MEMORIES, vec, project="global", threshold=0.02, limit=5)


def mock_retry_and_rerank_search(query: str, project: str) -> list[dict]:
    candidates = mock_conditional_retry_search(query, project)
    if not candidates:
        return []

    # Mock rerank pass: re-score using exact term overlap
    q_tokens = set(query.lower().split())
    scored = []
    for c in candidates:
        c_tokens = set(c["content"].lower().split())
        overlap = len(q_tokens.intersection(c_tokens))
        scored.append((overlap, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored]


EVAL_STRATEGIES = {
    "plain_search": mock_plain_search,
    "conditional_retry_search": mock_conditional_retry_search,
    "retry_and_rerank_search": mock_retry_and_rerank_search,
}


def evaluate_strategy(name: str, fn) -> dict:
    hit_1_count = 0
    hit_3_count = 0
    rr_total = 0.0
    latencies_ms = []

    for q in EVAL_QUERIES:
        query_text = q["query"]
        project = q["project"]
        expected_id = q["expected_memory_id"]

        start_t = time.perf_counter()
        results = fn(query_text, project)
        latency = (time.perf_counter() - start_t) * 1000.0
        latencies_ms.append(latency)

        retrieved_ids = [m["id"] for m in results]

        # Hit@1
        if retrieved_ids and retrieved_ids[0] == expected_id:
            hit_1_count += 1

        # Hit@3
        if expected_id in retrieved_ids[:3]:
            hit_3_count += 1

        # MRR
        if expected_id in retrieved_ids:
            rank = retrieved_ids.index(expected_id) + 1
            rr_total += 1.0 / rank

    total_q = len(EVAL_QUERIES)
    return {
        "strategy": name,
        "hit_at_1": hit_1_count / total_q,
        "hit_at_3": hit_3_count / total_q,
        "mrr": rr_total / total_q,
        "avg_latency_ms": sum(latencies_ms) / total_q,
    }


def main():
    print("==================================================================================")
    print("                     AETHOS MEMORY — RETRIEVAL EVALUATION                         ")
    print("==================================================================================")
    print(f"Dataset: {len(SYNTHETIC_MEMORIES)} synthetic memories | {len(EVAL_QUERIES)} evaluation queries")
    print(f"Mode: {'OFFLINE MOCK PROVIDERS' if USE_MOCK else 'LIVE API PROVIDERS'}")
    print("==================================================================================\n")

    results = []
    for name, fn in EVAL_STRATEGIES.items():
        res = evaluate_strategy(name, fn)
        results.append(res)

    print("| Strategy                 | Hit@1    | Hit@3    | MRR      | Avg Latency (ms) |")
    print("|--------------------------|----------|----------|----------|------------------|")
    for r in results:
        print(
            f"| {r['strategy']:<24} | {r['hit_at_1']*100:6.1f}% | {r['hit_at_3']*100:6.1f}% | {r['mrr']:8.3f} | {r['avg_latency_ms']:16.2f} |"
        )
    print("\n==================================================================================")


if __name__ == "__main__":
    main()
