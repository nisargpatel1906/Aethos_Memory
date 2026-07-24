# Aethos Memory

> Portable memory layer for AI tools.

Facts, decisions, and preferences you share with one AI tool (Claude Code, Cursor, Antigravity, etc.) become available to every other AI tool you use — instead of staying trapped in that one tool's siloed memory.

## How it works

```
Claude Code ──remember()──→ MCP Server ──→ Supabase ←──recall()── Cursor
                                              ↑
                                          Dashboard
                                     (view / edit / add)
```

A local MCP server exposes four tools over stdio. Each MCP-capable client (Claude Code, Cursor, Claude Desktop, etc.) spawns its own copy of the process per session. All copies read/write the same Supabase database, so memory is shared across tools without any always-on infrastructure.

## Repository layout

```
aethos-memory/
├── supabase/schema.sql     # One-time DB migration — run this first
├── server/                 # MCP server package (Python, PyPI: aethos-memory)
│   ├── README.md           # Server-specific setup and usage
│   ├── pyproject.toml
│   └── src/aethos_memory/
│       ├── server.py       # MCP entrypoint — registers the 4 tools
│       ├── config.py       # Env var loading/validation
│       ├── db.py           # Supabase client, similarity search, CRUD
│       ├── providers.py    # Groq/OpenRouter extraction + Gemini embeddings
│       ├── prompts.py      # Extraction prompt constant
│       └── retrieval.py    # 3 candidate retrieval strategies
├── dashboard/              # Next.js dashboard (deploy to Vercel)
│   ├── README.md
│   ├── .env.local.example  # Required env vars for the dashboard
│   └── app/
│       ├── login/          # Magic link sign-in
│       ├── onboarding/     # Step-by-step MCP config wizard
│       ├── feed/           # Live memory feed with search/filter/edit
│       ├── add/            # Manual memory entry
│       ├── projects/       # Project tag management
│       ├── settings/       # BYOK credentials + MCP snippet generator
│       └── api/reembed/    # Serverless function for server-side re-embedding
└── docs/                   # Architecture, data model, API spec, brand guide
```

## Quick start

### 1. Set up the database

In your Supabase project → SQL Editor, paste and run `supabase/schema.sql`.
This creates the `memories` table, RLS policy, and `match_memories` function.

### 2. Set up the MCP server

See [`server/README.md`](server/README.md) for the full setup guide.

**TL;DR — add to your MCP client config:**
```json
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "GROQ_API_KEY": "gsk_...",
        "OPENROUTER_API_KEY": "sk-or-...",
        "GEMINI_API_KEY": "AIzaSy...",
        "AETHOS_USER_ID": "your-supabase-user-uuid",
        "AETHOS_PROJECT": "global"
      }
    }
  }
}
```

### 3. Deploy the dashboard (optional)

1. Deploy `dashboard/` to Vercel
2. Set environment variables in Vercel's dashboard (see `dashboard/.env.local.example`)
3. Sign in via magic link → use the setup wizard to generate your MCP config snippet

## Bring your own everything

No centrally hosted backend. Each user supplies their own:
- **Supabase project** — database + auth
- **Groq API key** — primary extraction LLM
- **OpenRouter API key** — fallback extraction LLM  
- **Gemini API key** — embeddings (`gemini-embedding-001`)

Cost at personal scale: **$0**.

## MCP tools

| Tool | When the AI calls it |
|---|---|
| `remember(content, project)` | User states a preference, makes a decision, shares something worth keeping |
| `recall(query, project)` | Before answering anything referencing past decisions or project history |
| `forget(memory_id, description)` | User corrects or retracts something previously stored |
| `list_memories(project)` | Full context dump at session start |

## Tech stack

- **Server**: Python, [fastmcp](https://github.com/jlowin/fastmcp), stdio transport
- **Dashboard**: Next.js (App Router), Vercel
- **Database**: Supabase Postgres + pgvector
- **Auth**: Supabase Auth, magic link
- **Embeddings**: Gemini `gemini-embedding-001` (768 dims)
- **Extraction**: Groq → OpenRouter fallback

See `docs/` for full architecture, data model, API spec, and design decisions.
