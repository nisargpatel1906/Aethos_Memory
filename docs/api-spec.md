# Aethos Memory — API Spec (MCP Tools)

This project's "API" is four MCP tools exposed by the local server over stdio, not HTTP routes. Adapted from the standard endpoint format accordingly.

## Quick reference
| Tool | Purpose |
|---|---|
| `remember` | Store a fact, decision, or preference |
| `recall` | Search stored memory for relevant facts |
| `forget` | Delete a memory |
| `list_memories` | Return every memory for a project, unfiltered |

## Tools

### `remember(content: str, project: str = "global")`
- **Purpose**: store something worth keeping across future sessions and other AI tools.
- **Docstring (what the calling AI reads)**: "Store a fact, decision, or preference that should be available in future sessions and to other AI tools, not just this conversation. Call this whenever the user states a preference, makes a decision about how something should be built or done, or shares information that would matter in a later, unrelated conversation. Do not call this for details that only matter for the current task and won't be useful again."
- **Behavior**: embeds and searches for similar existing memories first (dedup context) → runs the extraction prompt (Groq, fallback OpenRouter) → parses a JSON action per fact (`ADD`/`UPDATE`/`SKIP`/`DELETE`) → applies it to the `memories` table.
- **Response**: confirmation of what was stored/updated, or a clear failure message if both extraction providers fail (never a silent no-op).
- **Identity/scope requirement**: writes are tagged with `AETHOS_USER_ID` and `AETHOS_PROJECT` (or the `project` argument, if given) from the server's environment — see `data-model.md`.

### `recall(query: str, project: str = "global")`
- **Purpose**: retrieve relevant stored memories mid-conversation.
- **Docstring**: "Search stored memory for facts relevant to the current conversation. Call this before answering anything that references past decisions, preferences, or project history, and at the start of a session to load relevant context before doing other work."
- **Behavior**: embeds the query → similarity search against `memories` (same `user_id` + `project`) → returns top matches. Retrieval strategy (plain search vs. conditional retry vs. retry+rerank) is still open, pending a benchmark comparison — see `tech-stack.md`.
- **Response**: matching memory contents, or nothing if no sufficiently similar memory exists.

### `forget(memory_id: str = None, description: str = None)`
- **Purpose**: delete a previously stored memory.
- **Docstring**: "Delete a previously stored memory, by its id if known, otherwise by a description of what it was. Call this when the user corrects or retracts something that was previously remembered."
- **Behavior**: deletes by `memory_id` directly if provided, otherwise resolves `description` to a memory via similarity search first.

### `list_memories(project: str)`
- **Purpose**: full, unfiltered context dump for a project.
- **Docstring**: "Return every stored memory for a given project, unfiltered. Use this for a full context load at the start of a session rather than recall's targeted search."
- **Behavior**: plain query filtered by `user_id` + `project`, no embedding or similarity search involved.

## Example responses
Concrete shapes, not just descriptions — these are what each tool should actually return to the calling AI as its string result.

**`remember` success:**
```
Stored: "User prefers PostgreSQL and Drizzle ORM over Prisma for backend microservices." (category: preference, project: wealth-advisor-ai)
```

**`remember` when the extraction step decided nothing was worth keeping:**
```
Nothing worth remembering in that — no new fact stored.
```

**`recall` with matches:**
```
Found 2 relevant memories:
1. User prefers PostgreSQL and Drizzle ORM over Prisma for backend microservices. (preference, 2 days ago)
2. Production deployment pipeline requires approval before pushing to main branch. (decision, 1 week ago)
```

**`recall` with no matches:**
```
No stored memories match that query.
```

**`forget` success:**
```
Deleted memory: "Local development environment runs on Windows PowerShell."
```

**`list_memories`:** same list format as `recall`, unfiltered, no relevance scoring implied.

## Error contract
Every tool must distinguish "genuinely nothing found" from "the lookup broke" — never collapse the two into the same empty-looking response. On total provider failure (both extraction providers down for `remember`, or the embedding call failing for `recall`), return a string that clearly states a failure occurred and, where useful, which step failed, e.g.:
```
Memory storage failed — both Groq and OpenRouter were unavailable. Try again shortly.
```
Never return an empty string, a bare `None`, or a generic "no results" message when the actual cause was an exception rather than an honest empty result. This is the same fail-loud rule from `prompts.md`, stated here as a response-contract requirement so it's testable.

## Identity requirement (applies to all four tools)
No per-call auth — the server process itself is configured once (per MCP client, per project) with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AETHOS_USER_ID`, and `AETHOS_PROJECT` as environment variables. See `data-model.md` for why the service-role key bypasses row level security here, and `tech-stack.md` for the full environment variable contract.
