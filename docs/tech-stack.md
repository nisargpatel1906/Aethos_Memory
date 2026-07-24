# Aethos Memory — Tech Stack

## Quick reference
- **Server**: Python, MCP Python SDK, stdio transport, distributed via PyPI (`uvx aethos-memory`)
- **Dashboard**: React, deployed on Vercel
- **Database**: Supabase (Postgres + pgvector)
- **Auth**: Supabase Auth, magic link
- **Hosting**: none for the server (runs locally, spawned per session); Vercel for the dashboard; Supabase managed for storage

## Frontend
- React, deployed on Vercel — same pattern as the user's other project (Wealth Advisor AI).
- Supabase JS client for direct reads/writes to the `memories` table (the dashboard talks to Supabase directly, not through the MCP server).
- Supabase Realtime subscription on the `memories` table for the live-updating feed.
- One small Vercel serverless function to handle re-embedding when a memory is edited in the dashboard, so the Gemini API key stays server-side and never ships in browser code.

## Backend
- Python, packaged and run via `uv` (`uvx`/`uv run`).
- `fastmcp` (the standalone PyPI package, currently stable at 3.x — `pip install fastmcp`, `from fastmcp import FastMCP`), decorator-based tool definitions (`remember`, `recall`, `forget`, `list_memories`). **[TODO: verify this is still the right call before building]** — the official `mcp` SDK also ships a bundled FastMCP class, but it's mid-rename to `MCPServer` in an unstable v2 beta as of when this doc was written, with stable v2 landing within days; the standalone package was chosen specifically to avoid building against something mid-transition, but re-check both projects' current state first, since this could easily have settled one way or the other by the time building actually starts.
- Transport: stdio by default — the MCP client (Claude Code, Claude Desktop, Codex CLI, Cursor, Antigravity, etc.) spawns the script as a subprocess per session and kills it on close. No always-on process, no server to manage.
- The same package also supports Streamable HTTP transport, which would let the same codebase serve a remote/hosted mode later (e.g. for ChatGPT's Developer Mode connectors) without a rewrite — not built for v1.
- Stateless by design: the process holds nothing in memory between calls; every `remember`/`recall`/`forget`/`list_memories` call reads/writes straight through to Supabase. This is what allows several MCP clients to each spawn their own copy of the script and still stay consistent with each other.

## Data
- Supabase Postgres with the `pgvector` extension. See `data-model.md` for the full schema.
- No ORM — the script talks to Supabase directly via its client library; the dashboard also talks to Supabase directly via its own JS client.
- Embeddings: Gemini's `gemini-embedding-001`, truncated to 768 dimensions via the `output_dimensionality` parameter (default is 3072; the model is trained to support truncation without meaningful quality loss). Single provider, deliberately no fallback — see Key architectural decisions.

## Auth
- Supabase Auth, magic link only (no passwords) — for the dashboard.
- The MCP server itself doesn't use Supabase Auth; it authenticates with a Supabase service-role key and is told which user it's acting on behalf of via an `AETHOS_USER_ID` environment variable (see `data-model.md` and `api-spec.md`).

## Infrastructure & deployment
- MCP server: no deployment target at all — distributed as a PyPI package, run locally by whoever configures it in their MCP client. $0 hosting cost.
- Dashboard: Vercel.
- Database: Supabase managed Postgres, free tier.
- Each user (including the builder, for now) provides their own Supabase project and their own third-party API keys — bring-your-own-everything, no centrally hosted backend.
- **[TODO: CI/CD not discussed]**

## Third-party services
- **Groq** — primary provider for the extraction step (turning raw content into atomic facts). Chosen for its fast inference and generous free tier, especially on smaller models.
- **OpenRouter** — fallback provider for extraction only, used if Groq is rate-limited or unavailable. Not used for embeddings (see below).
- **Gemini** — sole provider for embeddings (`gemini-embedding-001`). Also available as a documented fallback path for extraction if needed, since the user already holds this key from another project.
- **Supabase** — database, auth, and (for the dashboard) realtime updates.
- **Vercel** — dashboard hosting and the serverless re-embed function.

## Key architectural decisions
- **Fully local server, no hosting** — chose spawning the script locally via stdio over running it on an always-on VM (Oracle Cloud free-tier ARM, then AWS were both considered with real cost figures worked out) because it drops hosting cost to $0 and removes an entire piece of infrastructure to maintain, at the cost of not being reachable by tools that need a remote HTTPS endpoint (ChatGPT, potentially Gemini's consumer app) — accepted as an explicit, deliberate tradeoff, not an oversight.
- **Gemini-only for embeddings, no fallback** — chose a single stable embedding provider over a primary/fallback pair (which is used for extraction) because embeddings from two different models aren't comparable in the same vector space; a fallback here would silently produce incomparable vectors and corrupt similarity search rather than degrade gracefully.
- **No agent-orchestration framework for remember/recall** — chose plain, short, deterministic function pipelines (embed → search → one LLM call → act on result) over a framework like LangGraph (used in the same developer's other project) because these operations are linear with a fixed number of steps, not autonomous multi-step loops — added orchestration machinery would cost latency and failure surface for no real benefit here.
- **Retrieval strategy left open, decided empirically** — three candidate retrieval strategies (plain search / conditional retry on a miss / retry plus rerank on every call) are all being built as swappable implementations alongside a benchmark harness, rather than picking one upfront — final choice pending actual hit-rate/latency measurements.
- **Monorepo** — one repository holds both the MCP server package and the dashboard app.

## Folder / project structure
Concrete layout, resolving the earlier open TODO:

```
aethos-memory/
├── CLAUDE.md                        # entry point for Claude Code — read this first
├── docs/
│   ├── docs-index.md
│   ├── prd.md
│   ├── tech-stack.md                # this file
│   ├── data-model.md
│   ├── api-spec.md
│   ├── brand-guide.md
│   └── prompts.md
├── supabase/
│   └── schema.sql                   # one-time migration, see data-model.md
├── server/                          # the MCP server package (PyPI: aethos-memory)
│   ├── pyproject.toml
│   ├── src/aethos_memory/
│   │   ├── __init__.py
│   │   ├── server.py                # MCP entrypoint, registers the 4 tools
│   │   ├── config.py                # env var loading/validation
│   │   ├── db.py                    # Supabase client, similarity search, CRUD
│   │   ├── providers.py             # Groq/OpenRouter extraction + Gemini embeddings
│   │   ├── prompts.py                # extraction prompt as a Python constant
│   │   └── retrieval.py             # the 3 candidate retrieval strategies
│   └── eval/
│       ├── dataset.py               # synthetic test memories + queries
│       ├── mock_providers.py        # offline mocks, no live keys needed
│       └── run_eval.py              # benchmark harness, compares the 3 strategies
└── dashboard/                       # Next.js app (see note below)
    ├── package.json
    ├── app/                         # login, onboarding, feed, projects, settings pages
    └── app/api/reembed/route.ts     # the one serverless function (re-embed on edit)
```

**[TODO: framework choice for the dashboard inferred, not explicitly named in the original conversation]** — Next.js specifically, not a plain React SPA, since "React on Vercel" plus "one small serverless function" is exactly what Next.js's App Router gives you in one project (pages + API route together), rather than standing up a separate function host next to a separate static frontend. Confirm this matches intent before building.
