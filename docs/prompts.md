# Aethos Memory — Prompts & Agent Rules

## Quick reference
No agent-orchestration framework for the server logic — plain, deterministic function pipelines only. Extraction output is strict JSON, always. Never store secrets verbatim. Fail loud, not silent, on total provider failure. Full 18-step build sequence, ready to paste, is below under "Build sequence" — start there.

## Standing rules for the coding agent
- Do not introduce an agent-orchestration framework (e.g. LangGraph) for `remember` or `recall`. Both are short, linear, deterministic pipelines with a fixed number of steps (embed → search → one LLM call → act on the result) — implement them as plain functions, not a graph or a loop.
- The server process must be stateless: no in-memory cache, no session state carried between tool calls. Every call reads/writes straight through to Supabase, since multiple MCP clients may each spawn their own copy of the process simultaneously and must stay consistent with each other.
- Extraction calls must request/parse strict JSON only — no leading/trailing prose, no markdown code fences around the JSON. Defensively strip stray fences before parsing anyway, since some free-tier models add them regardless of instructions.
- Use a low temperature (~0.1) for the extraction call specifically, for consistent categorization behavior call to call.
- Never store secrets: if content passed to `remember` contains an API key, password, or token, store only a reference to its existence/purpose, never the literal value.
- On total provider failure (both the primary and fallback fail for a given step), return a clear failure to the caller. Never silently drop a memory or silently return an empty recall result when the actual cause was a failed call — the caller (and eventually the user) needs to be able to tell the difference between "no memory matched" and "the lookup broke."
- Embeddings must come from exactly one provider (`gemini-embedding-001`, truncated to 768 dimensions) with no fallback. Do not add a fallback embedding provider — two different embedding models produce vectors that aren't comparable in the same space, which would silently corrupt similarity search rather than degrade gracefully. (Contrast with extraction, where a fallback provider is fine, since JSON/text output is comparable across models.)
- Extraction may fail over from Groq to OpenRouter on rate-limit/error; implement this as a small wrapper function (e.g. `call_extraction()`) that the rest of the code calls without needing to know which provider actually answered.
- Retrieval strategy for `recall` is not finalized — build all three candidate strategies (plain search; conditional retry only on a miss; retry plus relevance rerank on every call) as swappable implementations, plus a small benchmark harness (synthetic test memories + queries, scoring hit-rate@k and latency per strategy), so the final choice is made from measured results, not guessed upfront.
- Tool docstrings are functional, not cosmetic — they're what the calling AI reads to decide when to invoke each tool. Treat changes to this text with the same care as changes to the extraction prompt itself.
- **Verify the MCP SDK situation before writing server.py, don't trust this doc's syntax blindly.** As of this doc being written, the official `mcp` SDK's bundled FastMCP class is mid-rename to `MCPServer` in an unstable v2 beta, with stable v2 targeted within days of this doc being written — genuinely bad timing to pin against. The standalone `fastmcp` package (a separate PyPI package, `pip install fastmcp`, `from fastmcp import FastMCP`, currently stable at 3.x) is used in the code examples below instead, since it isn't the thing mid-rename. Confirm this is still the better call and that the import path/decorator syntax below still matches current docs before generating server.py — this is exactly the kind of detail that goes stale fast.

## Reusable prompts

### Extraction prompt (used inside `remember`)
```
You are a memory extraction engine for a personal AI context system. Read the NEW_CONTENT below and decide what, if anything, is worth remembering long-term about the user or their project.

You will be given:
- NEW_CONTENT: the raw text to process
- EXISTING_MEMORIES: memories already stored that are semantically related to this content (may be empty)
- PROJECT: the project this content belongs to

Extract atomic facts only. A fact is atomic if it expresses exactly one idea and remains true and understandable on its own, without needing the rest of the conversation. Do not extract:
- small talk, greetings, or acknowledgments
- questions on their own (only the answer, decision, or fact that resulted)
- one-off transient details that won't matter next week, unless the user explicitly asks you to remember them
- anything already fully covered by an existing memory with no new information added

For every fact you keep, rewrite it so it stands alone. Resolve pronouns and vague references. "It broke because of that" is not acceptable. "The FastAPI backend crashed due to an unhandled Pydantic validation error on the /debate endpoint" is.

Never store secrets. If NEW_CONTENT contains an API key, password, or token, store only a reference to its existence and purpose, never the value itself.

Compare each candidate fact against EXISTING_MEMORIES:
- No related memory exists: action = "ADD"
- An existing memory already says the same thing, just worded differently: action = "SKIP"
- An existing memory is outdated or contradicted by this new fact: action = "UPDATE", include the existing memory's id
- The user is explicitly correcting or retracting something previously stored: action = "DELETE", include the id

Output strict JSON only. No text before or after it. No markdown code fences.

{
  "facts": [
    {
      "content": "string, the atomic self-contained fact",
      "category": "preference | decision | project_detail | other",
      "action": "ADD | UPDATE | SKIP | DELETE",
      "existing_id": "string or null, required when action is UPDATE or DELETE"
    }
  ]
}

If nothing in NEW_CONTENT is worth remembering, return exactly: {"facts": []}
```

### Client-side instruction snippet (dropped into the calling AI's own custom instructions, e.g. Claude Code/Claude Desktop project instructions)
```
Before responding to anything that references past decisions, preferences, or
earlier project work, call recall first. When you learn something worth
keeping, a decision, a stated preference, a correction to something already
stored, call remember before ending your turn, without asking permission
first. This should happen as a normal, silent part of how you work, not a
step you narrate to the user.
```

### Tool docstrings (used directly in the `@mcp.tool()` decorators)
Requires an instantiated server object first — a bare `@tool()` decorator with no server instance, as an earlier draft of this doc incorrectly showed, doesn't work:
```python
from fastmcp import FastMCP

mcp = FastMCP("aethos-memory")

@mcp.tool()
def remember(content: str, project: str = "global") -> str:
    """Store a fact, decision, or preference that should be available in future
    sessions and to other AI tools, not just this conversation. Call this whenever
    the user states a preference, makes a decision about how something should be
    built or done, or shares information that would matter in a later, unrelated
    conversation. Do not call this for details that only matter for the current
    task and won't be useful again."""

@mcp.tool()
def recall(query: str, project: str = "global") -> str:
    """Search stored memory for facts relevant to the current conversation. Call
    this before answering anything that references past decisions, preferences,
    or project history, and at the start of a session to load relevant context
    before doing other work."""

@mcp.tool()
def forget(memory_id: str = None, description: str = None) -> str:
    """Delete a previously stored memory, by its id if known, otherwise by a
    description of what it was. Call this when the user corrects or retracts
    something that was previously remembered."""

@mcp.tool()
def list_memories(project: str) -> str:
    """Return every stored memory for a given project, unfiltered. Use this for
    a full context load at the start of a session rather than recall's targeted
    search."""

if __name__ == "__main__":
    mcp.run()
```

## Build sequence — ready-to-paste prompts, in order

Eighteen prompts, dependency-ordered: schema before server code that needs it, core server modules before the entrypoint that wires them together, the full server before the dashboard (whose onboarding flow needs to match the server's exact env var contract). Each one is self-contained enough to paste directly into Claude Code, referencing the other docs by name rather than repeating their full content inline. File paths match `docs/tech-stack.md`'s folder structure exactly.

### Phase 0 — Foundation

**1. Repo scaffold**
```
Set up the Aethos Memory monorepo structure exactly as described in docs/tech-stack.md's "Folder / project structure" section. Create every folder shown (supabase/, server/src/aethos_memory/, server/eval/, dashboard/app/, dashboard/app/api/reembed/) with empty placeholder files where the structure names a file that doesn't exist yet. Do not write any implementation logic in this step — scaffolding only. Initialize server/pyproject.toml with the dependencies listed in docs/tech-stack.md (fastmcp, supabase client, httpx, pydantic — check current versions rather than trusting a pin from these docs, this corner of the ecosystem moves fast) and initialize dashboard/package.json for a Next.js app (App Router) with the Supabase JS client as a dependency. Confirm the folder tree matches docs/tech-stack.md before moving on.
```

**2. Supabase schema**
```
Create supabase/schema.sql using the exact SQL in docs/data-model.md's "Full schema (as agreed)" section — copy it verbatim, don't modify column names, types, the RLS policy, or the match_memories function. That function isn't optional or a nice-to-have — Supabase's client libraries talk to Postgres through PostgREST, which can't run pgvector similarity queries directly, so the function is the only way similarity search actually works from db.py. Add a short comment block at the top noting this is a one-time migration meant to be pasted into Supabase's own SQL editor, not run automatically by the server (see the standing rules above for why). Do not add a vector index (HNSW/ivfflat) yet — docs/data-model.md explains this is deferred intentionally until the table is much larger.
```

### Phase 1 — MCP server core

**3. config.py**
```
Create server/src/aethos_memory/config.py. Load and validate these environment variables at process startup, exactly as named in docs/data-model.md and docs/api-spec.md: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, AETHOS_USER_ID, AETHOS_PROJECT (default "global" if unset). Fail fast with a clear error naming the specific missing variable if any required one is absent — don't let the process start half-configured and fail confusingly later on first tool call. Expose the loaded values as one typed config object the rest of the modules import, not scattered os.environ reads.
```

**4. providers.py**
```
Create server/src/aethos_memory/providers.py with two functions: call_extraction(prompt: str) -> dict and call_embedding(text: str) -> list[float].

call_extraction tries Groq first (a small, fast model), and on any error or rate-limit response, retries the same prompt against OpenRouter as fallback. Use JSON response mode where supported. Defensively strip markdown code fences from the response before parsing, even in JSON mode. Raise a clear, specific exception if both providers fail — never return an empty or default value, per the fail-loud standing rule above.

call_embedding calls Gemini's gemini-embedding-001 only, output_dimensionality=768. No fallback provider for this function, ever — see the standing rules above for why a fallback here is actively harmful, not just unavailable. Raise a clear exception on failure rather than returning a placeholder vector.

Use httpx for the HTTP calls. Read all keys from the config object in config.py, never directly from the environment.
```

**5. db.py**
```
Create server/src/aethos_memory/db.py, wrapping the Supabase client (authenticated with SUPABASE_SERVICE_ROLE_KEY) with:
- similarity_search(embedding, project, threshold=0.75, limit=5) — calls the match_memories Postgres function via supabase.rpc("match_memories", {...}), exactly as shown in docs/data-model.md's "Similarity search" section. Do not attempt this as a plain .select()/.filter() chain — PostgREST doesn't support the vector similarity operator directly, the rpc() call is required.
- insert_memory(content, embedding, category, project, source_tool)
- update_memory(memory_id, content, embedding) — updates content and embedding together, always. Editing content without regenerating the embedding leaves them out of sync — this exact failure mode is called out in docs/prd.md.
- delete_memory(memory_id)
- list_by_project(project) — plain filter, no similarity search, backs list_memories.

Every function scopes to AETHOS_USER_ID from config.py. Use column and function parameter names exactly as defined in docs/data-model.md.
```

**6. prompts.py**
```
Create server/src/aethos_memory/prompts.py with two string constants, EXTRACTION_PROMPT and INSTRUCTION_SNIPPET, copied verbatim from this file's "Extraction prompt" and "Client-side instruction snippet" sections above — character-for-character, this text is already finalized, don't paraphrase it. EXTRACTION_PROMPT should be a template with {new_content}, {existing_memories}, and {project} placeholders matching the NEW_CONTENT / EXISTING_MEMORIES / PROJECT fields the prompt itself describes.
```

**7. retrieval.py**
```
Create server/src/aethos_memory/retrieval.py implementing all three candidate retrieval strategies from docs/tech-stack.md as separate functions sharing one signature: (query: str, project: str) -> list[dict].
- plain_search — embed the query, call db.similarity_search once, return the result.
- conditional_retry_search — call plain_search first; only if it returns nothing or everything is below the similarity threshold, rewrite the query via a fast LLM call and search again with project=None (broadened), then return that instead.
- retry_and_rerank_search — same as conditional_retry_search, plus a relevance-filtering pass over whatever candidates exist before returning, dropping results that are a similarity match but not actually relevant to the query's intent.

Export all three under one STRATEGIES dict keyed by name, so eval/run_eval.py can iterate them without importing each individually.
```

**8. server.py**
```
Create server/src/aethos_memory/server.py, the MCP entrypoint. Instantiate `mcp = FastMCP("aethos-memory")` from the `fastmcp` package (see docs/prompts.md's standing rules on why this package specifically, not the SDK-bundled one, at least as of when these docs were written — re-verify first) and register the four tools with `@mcp.tool()` exactly per docs/api-spec.md, using the docstrings verbatim from this file's "Tool docstrings" section above:
- remember(content, project="global") — embed the content, call db.similarity_search for dedup context, format both into prompts.EXTRACTION_PROMPT, call providers.call_extraction, parse the JSON, apply each fact's action (ADD/UPDATE/SKIP/DELETE) via the matching db.py function.
- recall(query, project="global") — calls whichever strategy is currently selected in retrieval.STRATEGIES (make this one line to change — Phase 2's eval harness determines which one ships).
- forget(memory_id=None, description=None) — deletes by id directly if given, otherwise resolves description via similarity search first.
- list_memories(project) — calls db.list_by_project directly, no embedding involved.

End the file with `if __name__ == "__main__": mcp.run()`, matching pyproject.toml's [project.scripts] entry so `uvx aethos-memory` starts the server over stdio. Every tool function must catch exceptions from providers.py/db.py and return a clear error message (see docs/api-spec.md's "Error contract" for the exact expected shape) rather than crashing or silently returning empty — per the fail-loud standing rule.
```

### Phase 2 — Eval harness

**9. eval/dataset.py**
```
Create server/eval/dataset.py: roughly 15 synthetic memories spanning 2-3 project tags, covering all four categories (preference, decision, project_detail, other), and roughly 10-12 queries. Include a deliberate mix of easy queries (phrased closely to the stored memory) and hard queries (phrased very differently or obliquely — the specific failure mode that's the actual reason to consider anything beyond plain search). Each query needs a ground-truth field naming which memory id it should retrieve, so run_eval.py can score hit@k objectively.
```

**10. eval/mock_providers.py**
```
Create server/eval/mock_providers.py with mock_embed(text) and mock_llm_rewrite(query), standing in for providers.call_embedding and the query-rewrite step so the benchmark runs with no live API keys. mock_embed should be a simple bag-of-words or TF-IDF-style cosine similarity function — the point is that closely-phrased text scores high and obliquely-phrased text scores low, enough to meaningfully differentiate the three strategies without network access. Add a module docstring stating clearly this file is for offline benchmarking only and must never be imported by server.py or any real tool logic.
```

**11. eval/run_eval.py**
```
Create server/eval/run_eval.py. For each strategy in retrieval.STRATEGIES, run every query in dataset.py against it using mock_providers.py in place of the real provider calls, and report hit@1, hit@3, mean reciprocal rank, and average latency per strategy. Print a comparison table. Structure the provider calls so swapping mock_providers.py for the real providers.py later requires changing one import, not rewriting the harness. This is the artifact that settles the open retrieval-strategy question in docs/tech-stack.md.
```

### Phase 3 — Dashboard

**12. Dashboard scaffold + login**
```
Scaffold dashboard/ as a Next.js (App Router) app with the Supabase JS client configured for magic-link auth, per docs/tech-stack.md. Build the Login page per docs/prd.md: an email input, a "Send Magic Link" button, and a short line explaining what the dashboard connects to. On successful auth, redirect to the memory feed. Apply docs/brand-guide.md's conventions — check whether its color-palette TODO is resolved yet before hard-coding specific hex values.
```

**13. Onboarding/setup flow**
```
Build the first-time onboarding flow per docs/prd.md: guided, step-by-step (not one long form), collecting the user's Supabase project URL + service role key and their Groq/OpenRouter/Gemini API keys, then generating a ready-to-paste MCP config snippet. The snippet must include every variable in the env var contract — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, AETHOS_USER_ID (auto-filled from the now-signed-in user's own Supabase auth id, never something they look up themselves), and AETHOS_PROJECT. Include a way to skip the wizard and see the raw JSON config directly.
```

**14. Memory feed (home)**
```
Build the memory feed per docs/prd.md and docs/data-model.md: a list of the signed-in user's memories, newest first, showing content, project, category, source_tool, and a relative timestamp. Filter by project and by source_tool. The search box runs real semantic search (embed the query via the reembed route or a dedicated search API route, then query Supabase) rather than plain keyword matching. Subscribe to Supabase Realtime on memories, scoped to the signed-in user, so new rows appear live. Each row needs inline edit and delete.
```

**15. Memory edit panel + reembed function**
```
First create dashboard/app/api/reembed/route.ts, a serverless function taking memory text, calling gemini-embedding-001 (output_dimensionality=768) server-side with GEMINI_API_KEY from Vercel's environment — never expose this key to the browser — and returning the new embedding. Verify the caller's Supabase session/JWT before doing any embedding work; this route must reject unauthenticated requests, otherwise it's an open endpoint anyone on the internet could hit to burn through the Gemini quota, not just the signed-in user. Then build the edit panel per docs/prd.md: editable content, read-only metadata (project, category, source_tool, timestamps), and a delete action whose confirmation step only appears after delete is clicked, never permanently visible — this exact bug was flagged in an earlier mockup review, don't reintroduce it. Saving must call the reembed route first and store the new embedding alongside the new content; never save edited content against its old, now-stale embedding.
```

**16. Add memory**
```
Build the add-memory form per docs/prd.md: content field, project selector (existing or new), category selector. Manual entries skip extraction entirely (the person has already done that filtering by typing a single clean thought) but must still run the same dedup check as remember before inserting, so a manually typed fact doesn't end up sitting beside a near-duplicate an AI already wrote.
```

**17. Projects page**
```
Build the Projects page per docs/prd.md: a list of project tags, each showing a memory count, last-updated time, and per-category counts. Clicking a project filters the main feed to it. Support renaming a tag and deleting everything under one. Note: an earlier mockup review flagged inconsistent labels for what may be the same action ("New Project Tag" vs "Create Cluster") — pick one label and use it consistently unless you confirm they're genuinely two different actions.
```

**18. Settings & connections page**
```
Build the Settings page per docs/prd.md: editable Supabase connection fields and BYOK API key fields (same ones from onboarding), plus the MCP config snippet generator, regenerable per client. Reuse the exact snippet-generation logic from onboarding rather than duplicating it. Display the actually-active embedding model name dynamically rather than a hardcoded placeholder — an earlier mockup draft incorrectly showed "text-embedding-3-small" (an OpenAI model); this project uses gemini-embedding-001 exclusively.
```

## Things to avoid
- Don't add a fallback embedding provider, even though extraction has one — see the standing rule above on why this specifically would cause silent, hard-to-detect data corruption rather than a graceful degradation.
- Don't reach for an agent framework/loop for `remember` or `recall` by default — these are deliberately plain pipelines; if a future feature genuinely needs multi-step autonomous reasoning, treat that as a new, separate decision, not an incremental extension of these two.
- Don't have the script auto-create the Supabase schema on first connect — schema setup is a one-time SQL file the user runs themselves.
