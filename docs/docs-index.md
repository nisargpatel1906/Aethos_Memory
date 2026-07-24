# Aethos Memory — Docs Index

- **`CLAUDE.md`** (repo root, not in `docs/`) — the entry point Claude Code reads automatically. Short summary of everything below plus the non-negotiable standing rules, so critical constraints are visible even without opening every file.
- **`docs/prd.md`** — what the product is, who it's for, core features, user flows, non-goals, open product questions.
- **`docs/tech-stack.md`** — full stack (Python MCP server, Next.js/Vercel dashboard, Supabase), the concrete folder structure, and key architectural decisions with the reasoning behind each.
- **`docs/data-model.md`** — the `memories` table schema, RLS policy, and the similarity-search query, in full.
- **`docs/api-spec.md`** — the four MCP tools (`remember`, `recall`, `forget`, `list_memories`): exact docstrings, behavior, example response shapes, and the error contract.
- **`docs/brand-guide.md`** — tone, color, typography, UI conventions; flags one unresolved color-palette contradiction found in the designer's files.
- **`docs/prompts.md`** — standing rules, the extraction prompt, client instruction snippet, and tool docstrings verbatim, plus an 18-step, dependency-ordered, ready-to-paste build sequence covering the entire product end to end (schema → server core → eval harness → every dashboard page).

Total `[TODO: ...]` markers left across all files: **9** — two in `brand-guide.md` (the color palette contradiction, plus reconciling the four affected surfaces), three in `prd.md` (success metrics never discussed, the centralized-hosting decision explicitly parked, one inferred-not-confirmed user flow), three in `tech-stack.md` (CI/CD not discussed, Next.js inferred as the dashboard framework, and the `fastmcp` vs. SDK-bundled package choice needing a fresh check at build time), and one in `data-model.md` (flagging that the similarity-search section was itself corrected after the fact — see "Known corrections" below).

## Known corrections made after the first pass
Two real gaps were found by re-checking this design against current documentation, after being asked how confident this was likely to work as originally written. Both are now fixed in the docs above, not just noted:
- **MCP tool registration syntax was wrong.** The original `prompts.md` showed a bare `@tool()` decorator with no server instance. Real usage needs `mcp = FastMCP("name")` instantiated first, then `@mcp.tool()` on that instance. Fixed in `prompts.md`'s "Tool docstrings" section and the server.py build step.
- **Vector similarity search was missing a required piece.** Supabase's client libraries talk to Postgres through PostgREST, which can't run pgvector's similarity operator directly — the query has to be wrapped in a Postgres function and called via `rpc()`. The original `data-model.md` gave correct SQL but no function wrapper, which wouldn't have run as described. Fixed in `data-model.md` and the schema/db.py build steps in `prompts.md`.

Also flagged, not a correction but a live timing risk: the official MCP Python SDK's bundled FastMCP class is being renamed in an unstable v2 beta landing within days of these docs being written. `prompts.md` and `tech-stack.md` now specify the standalone `fastmcp` package instead, to avoid building against something mid-transition — worth re-confirming this is still the right call whenever building actually starts, since it could resolve either way by then.
