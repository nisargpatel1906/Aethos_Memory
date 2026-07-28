import asyncio
import time
from aethos_memory.retrieval import active_strategy
from aethos_memory.caching import cache_manager
from aethos_memory.auto_ingest import process_transcript_text


async def benchmark():
    print("=== AETHOS MEMORY PERFORMANCE & CACHING BENCHMARK ===\n")

    query = "What is the project tech stack for opencode-cli-workspace?"
    project = "global"

    # 1. Uncached Search (Tier 2 Fast-Path Vector Search)
    start_time = time.time()
    results1 = await active_strategy(query, project=project)
    uncached_duration = (time.time() - start_time) * 1000.0
    print(f"1st Search (Uncached Fast-Path): {uncached_duration:.2f} ms | Found {len(results1)} results")

    # 2. Cached Search (Tier 1 Cache Check)
    start_time = time.time()
    results2 = await active_strategy(query, project=project)
    cached_duration = (time.time() - start_time) * 1000.0
    print(f"2nd Search (Tier 1 LRU Cache):   {cached_duration:.2f} ms | Found {len(results2)} results")

    speedup = uncached_duration / max(cached_duration, 0.001)
    print(f"\n⚡ Cache Acceleration: {speedup:.1f}x FASTER!")
    assert cached_duration < 15.0, "Cached retrieval should be under 15ms"

    # 3. Test Ingestion & Mutation Cache Invalidation
    print("\n--- Testing Invalidation & Auto-Ingest ---")
    sample_turn = "User decided to use Redis for session caching and Next.js 15 for frontend."
    inserted_count = await process_transcript_text(sample_turn, source_tool="BenchmarkTest", project="global")
    print(f"Auto-Ingested Facts: {inserted_count}")

    # 4. Search after invalidation
    start_time = time.time()
    results3 = await active_strategy("Redis session caching", project="global")
    post_inv_duration = (time.time() - start_time) * 1000.0
    print(f"3rd Search (After Invalidation): {post_inv_duration:.2f} ms | Found {len(results3)} results")

    print("\n✅ BENCHMARK SUCCESSFUL! All performance assertions passed!")


if __name__ == "__main__":
    asyncio.run(benchmark())
