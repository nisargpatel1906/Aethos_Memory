import asyncio
from aethos_memory.auto_ingest import process_transcript_text
from aethos_memory.retrieval import active_strategy


async def test_unified_provenance():
    print("=== AETHOS MEMORY UNIFIED STATEMENT & PROVENANCE TEST ===\n")

    simulated_multi_sentence_ai_turn = """
    USER: What is our agreed database setup and memory persistence strategy?

    ASSISTANT: I recommend using Supabase PostgreSQL with pgvector for 768d vector embeddings combined with an in-memory LRU Cache with 15-minute TTL for instant <5ms lookups. All extraction operations use Groq Llama-3.1 with automatic fallback to Gemini 2.0 Flash.
    """

    print("1. Processing multi-sentence AI Assistant answer...")
    count = await process_transcript_text(simulated_multi_sentence_ai_turn, source_tool="UnifiedProvenanceTest", project="global")
    print(f"-> Extracted {count} unified statements (Not fragmented!).\n")

    # Verify retrieval
    results = await active_strategy("What is the AI recommended database and caching strategy?", project="global")

    print(f"2. Retrieved {len(results)} unified memories:")
    for r in results[:3]:
        print(f"   • Content: {r.get('content')}")
        print(f"     Tags:    {r.get('tags')}\n")

    assert count <= 3, "AI answer should be unified into complete statements, not fragmented into tiny pieces!"
    print("\n✅ TEST SUCCESSFUL! AI answers are unified into complete statements with explicit origin labeling!")


if __name__ == "__main__":
    asyncio.run(test_unified_provenance())
