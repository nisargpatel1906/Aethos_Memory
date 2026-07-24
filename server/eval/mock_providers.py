"""THIS FILE IS FOR OFFLINE BENCHMARKING ONLY AND MUST NEVER BE IMPORTED BY server.py OR ANY REAL TOOL LOGIC.

Provides deterministic offline mocks for embedding generation, vector similarity calculation,
and LLM query rewriting without requiring active API keys or external network requests.
"""

import math
import re
from typing import Any

# Fixed 128-dimensional vocabulary space for offline bag-of-words embedding simulation
VOCAB_SIZE = 128


def _tokenize(text: str) -> list[str]:
    """Simple alphanumeric tokenizer."""
    return re.findall(r"\b\w+\b", text.lower())


def mock_embed(text: str) -> list[float]:
    """Generates a deterministic 128-dimensional L2-normalized bag-of-words vector representation."""
    tokens = _tokenize(text)
    vec = [0.0] * VOCAB_SIZE
    if not tokens:
        return vec

    for token in tokens:
        # Deterministic hashing into 128 dimensions
        idx = hash(token) % VOCAB_SIZE
        vec[idx] += 1.0

    # L2 normalize
    magnitude = math.sqrt(sum(v * v for v in vec))
    if magnitude > 0:
        vec = [v / magnitude for v in vec]

    return vec


def mock_cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two normalized vectors."""
    return sum(a * b for a, b in zip(vec_a, vec_b))


def mock_llm_rewrite(query: str) -> str:
    """Mock query rewriter that expands tech terminology for testing conditional retry search."""
    synonyms = {
        "orm": "database postgres drizzle prisma SQL",
        "deployment": "main branch production release approval",
        "risk score": "volatility calculation financial portfolio",
        "credentials": "password secrets manager staging AWS",
        "colors": "slate emerald theme dark mode UI",
        "postgrest": "match_memories RPC vector similarity search",
        "groq": "LLM extraction primary openrouter provider",
        "dev": "windows powershell python setup environment",
    }
    tokens = _tokenize(query)
    extra = []
    for token in tokens:
        if token in synonyms:
            extra.append(synonyms[token])

    if extra:
        return f"{query} {' '.join(extra)}"
    return f"{query} generic concept keywords"


def mock_similarity_search(
    memories: list[dict[str, Any]],
    query_vector: list[float],
    project: str,
    threshold: float = 0.1,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Simulate Supabase vector similarity search against synthetic memory list."""
    results = []
    for mem in memories:
        # Scope by project if specified and not 'global'
        if project and project != "global" and mem["project"] != project:
            continue

        mem_vec = mock_embed(mem["content"])
        sim = mock_cosine_similarity(query_vector, mem_vec)
        if sim >= threshold:
            res_item = dict(mem)
            res_item["similarity"] = sim
            results.append(res_item)

    # Sort descending by similarity
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:limit]
