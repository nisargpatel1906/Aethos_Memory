# agent.md

This file is the entry point Claude Code reads automatically. Everything here is a summary — the `docs/` folder has full depth on every point. Read the relevant doc before building the piece it covers; don't work from this summary alone for anything non-trivial.

## What this project is
Aethos Memory is a portable memory layer for AI tools. A local MCP server exposes four tools (`remember`, `recall`, `forget`, `list_memories`) that any MCP-capable AI tool (Claude Code included) can call, backed by a shared Supabase store, so facts and decisions follow the person across tools instead of staying siloed in one tool's own memory. A separate dashboard (Next.js on Vercel) lets a human view, edit, and manually add what's been stored. Full detail: `docs/prd.md`.

## Confidence level, honestly
This design has been reasoned through carefully but never built or run — nothing here has touched a real Supabase project, a real Groq call, or a real MCP client yet. Two real mistakes were found and fixed by re-checking against current docs after the fact (a wrong MCP tool decorator pattern, and a missing Postgres RPC function that pgvector similarity search actually requires through Supabase's client) — both are corrected in this version, but their existence is a signal: verify against current documentation at each step below rather than assuming every remaining detail is exactly right, especially anything naming a specific library, package, or API surface, since those are the parts most likely to have shifted by build time. The architecture and data model (what talks to what, the schema, the env var contract) are the parts to trust most — they were reasoned from first principles, not from a specific library's current API. The parts to double-check as you go are anywhere this file or `docs/` names a specific import, decorator, or method call.

## Repo map
```
supabase/schema.sql        one-time DB migration — run this first
server/                    the MCP server package, Python, published to PyPI as aethos-memory
dashboard/                 the Next.js app, deployed to Vercel
docs/                      prd, tech stack, data model, API spec, brand guide, prompts
```
Full layout with every file: `docs/tech-stack.md`.

## Build order
Follow `docs/prompts.md` — it contains the complete, ordered sequence of ready-to-use prompts for building every piece, from the schema through the last dashboard page. Don't skip ahead to the dashboard before the server modules it depends on (env var contract, schema) exist.

## Non-negotiable standing rules
These apply regardless of which specific piece you're building — see `docs/prompts.md` for the full list and reasoning behind each:
- No agent-orchestration framework (LangGraph etc.) for `remember`/`recall`. Both are short, linear, deterministic pipelines — plain functions only.
- The server process is stateless. No in-memory cache, no session state. Every call round-trips through Supabase.
- Embeddings come from exactly one provider (`gemini-embedding-001`, truncated to 768 dims), no fallback, ever — a fallback here silently corrupts similarity search rather than degrading gracefully. Extraction is allowed a fallback (Groq → OpenRouter); embeddings are not. Don't conflate the two.
- Extraction output is strict JSON only. No prose, no markdown fences around it.
- Never store secrets (API keys, tokens, passwords) verbatim in memory content — reference only.
- Fail loud on total provider failure. Never silently drop a memory or return an empty result when the real cause was a broken call.
- Don't have the server auto-create the Supabase schema. It's a one-time SQL file the user runs themselves.

## Environment variables (server)
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `AETHOS_USER_ID`, `AETHOS_PROJECT`. Exact contract and why each exists: `docs/data-model.md` and `docs/api-spec.md`.

## Naming
Product name is **Aethos Memory**, package/slug is **aethos-memory**, everywhere — MCP config key, PyPI package, repo name, dashboard title. If you find an older name anywhere (Neural Ledger, Memory Dashboard, AETHOS_MEMORY), that's leftover from an earlier draft — fix it to match, don't treat it as intentional variation.

## Docs
| File | Read it for |
|---|---|
| `docs/prd.md` | Features, user flows, non-goals, what's still an open product question |
| `docs/tech-stack.md` | Full stack, folder structure, key architectural decisions and why |
| `docs/data-model.md` | The `memories` table schema, RLS policy, the similarity-search query |
| `docs/api-spec.md` | The 4 MCP tools — exact signatures, docstrings, internal behavior |
| `docs/brand-guide.md` | Color, type, spacing, tone — dashboard UI only, not the server |
| `docs/prompts.md` | Standing rules (full list) + every ready-to-paste build prompt, in order |

## Current status
Nothing is built yet. This is a from-scratch build. Start at the top of `docs/prompts.md`.
