"""Synthetic evaluation dataset for Aethos Memory benchmark harness.

Contains 15 synthetic memories and 12 evaluation queries with ground-truth memory IDs.
"""

SYNTHETIC_MEMORIES = [
    # Project: wealth-advisor-ai
    {
        "id": "mem-001",
        "project": "wealth-advisor-ai",
        "category": "preference",
        "content": "User prefers PostgreSQL and Drizzle ORM over Prisma for backend microservices.",
    },
    {
        "id": "mem-002",
        "project": "wealth-advisor-ai",
        "category": "decision",
        "content": "Production deployment pipeline requires manual approval before pushing to main branch.",
    },
    {
        "id": "mem-003",
        "project": "wealth-advisor-ai",
        "category": "project_detail",
        "content": "Financial portfolio risk score API uses 30-day volatility calculations with 95% confidence interval.",
    },
    {
        "id": "mem-004",
        "project": "wealth-advisor-ai",
        "category": "other",
        "content": "Staging environment database connection string is stored in AWS Secrets Manager under secret key staging/db/credentials.",
    },
    {
        "id": "mem-005",
        "project": "wealth-advisor-ai",
        "category": "preference",
        "content": "User prefers dark mode slate theme with emerald accents for all dashboard interfaces.",
    },
    # Project: aethos-memory
    {
        "id": "mem-006",
        "project": "aethos-memory",
        "category": "decision",
        "content": "FastMCP standalone package is used instead of the SDK-bundled FastMCP class due to v2 beta refactoring.",
    },
    {
        "id": "mem-007",
        "project": "aethos-memory",
        "category": "project_detail",
        "content": "Supabase vector similarity search requires match_memories Postgres RPC function due to PostgREST limitations.",
    },
    {
        "id": "mem-008",
        "project": "aethos-memory",
        "category": "preference",
        "content": "Gemini gemini-embedding-001 with 768 dimensions is the exclusive embedding model with no fallback allowed.",
    },
    {
        "id": "mem-009",
        "project": "aethos-memory",
        "category": "decision",
        "content": "Memory extraction utilizes Groq as primary LLM provider with OpenRouter as secondary fallback.",
    },
    {
        "id": "mem-010",
        "project": "aethos-memory",
        "category": "other",
        "content": "Dashboard serverless re-embedding route verifies user JWT before processing embedding requests.",
    },
    # Project: global
    {
        "id": "mem-011",
        "project": "global",
        "category": "preference",
        "content": "User prefers concise code comments and concise response formatting without conversational filler.",
    },
    {
        "id": "mem-012",
        "project": "global",
        "category": "decision",
        "content": "Never commit API keys or secret tokens directly into version control or memory content.",
    },
    {
        "id": "mem-013",
        "project": "global",
        "category": "project_detail",
        "content": "Local development environment runs on Windows PowerShell using Python 3.11 virtual environment.",
    },
    {
        "id": "mem-014",
        "project": "global",
        "category": "preference",
        "content": "User prefers strict TypeScript types over any or implicit type definitions.",
    },
    {
        "id": "mem-015",
        "project": "global",
        "category": "other",
        "content": "All multi-tenant backend services require strict Row Level Security policies.",
    },
]

EVAL_QUERIES = [
    # Easy queries (closely matching wording)
    {
        "id": "q-001",
        "query": "Which ORM and database does the user prefer for backend microservices?",
        "project": "wealth-advisor-ai",
        "expected_memory_id": "mem-001",
        "difficulty": "easy",
    },
    {
        "id": "q-002",
        "query": "What is the requirement for production deployment approval?",
        "project": "wealth-advisor-ai",
        "expected_memory_id": "mem-002",
        "difficulty": "easy",
    },
    {
        "id": "q-003",
        "query": "Why is FastMCP standalone package chosen over SDK bundle?",
        "project": "aethos-memory",
        "expected_memory_id": "mem-006",
        "difficulty": "easy",
    },
    {
        "id": "q-004",
        "query": "What embedding provider and dimensions are used?",
        "project": "aethos-memory",
        "expected_memory_id": "mem-008",
        "difficulty": "easy",
    },
    {
        "id": "q-005",
        "query": "Does the user prefer concise code comments?",
        "project": "global",
        "expected_memory_id": "mem-011",
        "difficulty": "easy",
    },
    {
        "id": "q-006",
        "query": "What are the rules regarding API key secrets in git?",
        "project": "global",
        "expected_memory_id": "mem-012",
        "difficulty": "easy",
    },
    # Hard/Oblique queries (synonyms, indirect phrasing)
    {
        "id": "q-007",
        "query": "How is risk score calculated in the wealth app?",
        "project": "wealth-advisor-ai",
        "expected_memory_id": "mem-003",
        "difficulty": "hard",
    },
    {
        "id": "q-008",
        "query": "Where do we keep staging DB credentials?",
        "project": "wealth-advisor-ai",
        "expected_memory_id": "mem-004",
        "difficulty": "hard",
    },
    {
        "id": "q-009",
        "query": "Why can't we run vector search using standard PostgREST queries?",
        "project": "aethos-memory",
        "expected_memory_id": "mem-007",
        "difficulty": "hard",
    },
    {
        "id": "q-010",
        "query": "What happens if Groq API goes down during fact extraction?",
        "project": "aethos-memory",
        "expected_memory_id": "mem-009",
        "difficulty": "hard",
    },
    {
        "id": "q-011",
        "query": "What shell and OS version is used for dev setup?",
        "project": "global",
        "expected_memory_id": "mem-013",
        "difficulty": "hard",
    },
    {
        "id": "q-012",
        "query": "How are dashboard UI colors styled?",
        "project": "wealth-advisor-ai",
        "expected_memory_id": "mem-005",
        "difficulty": "hard",
    },
]
