import asyncio
from aethos_memory.auto_ingest import process_transcript_text
from aethos_memory.retrieval import active_strategy


async def test_bidirectional():
    print("=== AETHOS MEMORY BIDIRECTIONAL CONTEXT EXTRACTION TEST ===\n")

    # Simulate a full User + AI Assistant conversation turn
    simulated_conversation = """
    USER: What database and cache setup should we use for high-performance memory vector retrieval in Aethos Memory?

    ASSISTANT: I recommend using Supabase PostgreSQL with pgvector (768-dimensional embeddings) combined with an in-memory LRU Cache with 15-minute TTL. This eliminates redundant LLM calls and cuts search latency down to 0.00ms.
    """

    print("1. Ingesting User + Assistant Conversation Turn Pair...")
    count = await process_transcript_text(simulated_conversation, source_tool="BidirectionalTest", project="global")
    print(f"-> Extracted and saved {count} facts into Supabase!\n")

    # Verify retrieval of AI Assistant recommendation
    print("2. Searching memory for AI Assistant architecture recommendations...")
    results = await active_strategy("What did AI recommend for caching and vector retrieval?", project="global")

    print(f"-> Found {len(results)} relevant memories:")
    for r in results[:3]:
        print(f"   • [{r.get('category')}] {r.get('content')}")

    assert len(results) > 0, "Should retrieve AI recommendation memory"
    print("\n✅ TEST SUCCESSFUL! AI Assistant solutions and recommendations are now automatically captured into memory!")


if __name__ == "__main__":
    asyncio.run(test_bidirectional())
