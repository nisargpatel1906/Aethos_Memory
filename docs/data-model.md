# Aethos Memory — Data Model

## Quick reference
One core entity: `memories`. Relies on Supabase's built-in `auth.users` table for identity.

## Entities

### memories
- `id` (uuid, primary key) — generated automatically.
- `user_id` (uuid) — references `auth.users(id)`, cascades on delete. Identifies the owner of the memory.
- `project` (text, default `'global'`) — the project/tag this memory belongs to (e.g. a specific app the user is building). Lets memory for unrelated projects stay separated.
- `content` (text) — the atomic, self-contained fact itself, already rewritten by the extraction step so it stands alone without needing the original conversation.
- `embedding` (vector(768)) — embedding of `content`, produced by Gemini's `gemini-embedding-001` truncated to 768 dimensions.
- `category` (text, checked) — one of `preference`, `decision`, `project_detail`, `other`.
- `source_tool` (text) — which AI tool wrote this memory (e.g. "Claude Code", "Cursor"), shown in the dashboard feed.
- `created_at` / `updated_at` (timestamptz) — standard timestamps.

Relationships: `memories.user_id` belongs to `auth.users` (Supabase's built-in table — no separate `users` table is defined by this project).

## Full schema (as agreed)

```sql
create extension if not exists vector;

create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project text not null default 'global',
  content text not null,
  embedding vector(768) not null,
  category text not null check (category in ('preference','decision','project_detail','other')),
  source_tool text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table memories enable row level security;

create policy "Users manage their own memories"
  on memories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index on memories (user_id, project);

create or replace function match_memories(
  p_user_id uuid,
  p_project text,
  query_embedding vector(768),
  match_threshold float default 0.75,
  match_count int default 5
)
returns table (id uuid, content text, category text, created_at timestamptz)
language sql stable
as $$
  select m.id, m.content, m.category, m.created_at
  from memories m
  where m.user_id = p_user_id
    and m.project = p_project
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
```

**[TODO: correction made unprompted — the original version of this doc specified the similarity query as plain SQL without this function, which would not actually run through supabase-py as written]** Supabase's client libraries (including `supabase-py`) talk to Postgres through PostgREST, and PostgREST does not support pgvector's similarity operators (`<=>`) directly through normal `.select()`/`.filter()` calls. The standard, correct pattern — confirmed against Supabase's own current docs — is to wrap the query in a Postgres function, as above, and invoke it as a remote procedure call. Both `user_id` and `project` are function parameters rather than filters chained on afterward, since chaining `.eq()` after `.rpc()` applies as an outer filter on the function's already-limited result set, which can silently return fewer rows than expected.

## Similarity search (used by both `recall` and `remember`'s dedup step)

Called from `db.py` via `rpc()`, not a raw query:

```python
result = supabase.rpc("match_memories", {
    "p_user_id": user_id,
    "p_project": project,
    "query_embedding": embedding,
    "match_threshold": 0.75,
    "match_count": 5,
}).execute()
```

The `0.75` similarity threshold is a starting point, expected to be tuned once real usage data exists — not a settled constant.

## Notes
- **Row level security**: enabled, policy restricts access to rows where `auth.uid() = user_id`. This governs the dashboard's access (anon key + the signed-in user's JWT). It does **not** govern the MCP server's own access — the server authenticates with the Supabase service-role key, which bypasses RLS entirely by design. The server is trusted to tag writes with the correct `user_id` itself, via the `AETHOS_USER_ID` environment variable it's given (see `api-spec.md`).
- **No vector index yet** (no HNSW/ivfflat) — deferred. Plain pgvector performs fine without one at personal scale (up to roughly tens of thousands of rows); add one once the table grows past that.
- **Schema delivery**: shipped as a one-time SQL file the user pastes into Supabase's own SQL editor during onboarding, rather than having the script auto-create the table on first connect — keeps the bring-your-own-database model transparent rather than "magic."
- **Secrets**: if raw content passed to `remember` contains an API key, password, or token, the extraction step is instructed to store only a reference to its existence/purpose, never the value itself. Enforced in the extraction prompt, not at the schema level.
