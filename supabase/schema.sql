-- ====================================================================
-- Aethos Memory — Supabase Database Schema
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Or click "Setup Database" in the Aethos dashboard onboarding page.
-- ====================================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create memories table
--    user_id is text (not a FK to auth.users) so the MCP service role
--    can insert memories for any user_id without needing a matching auth row.
create table if not exists memories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null,
  project     text        not null default 'global',
  content     text        not null,
  embedding   vector(768),          -- nullable so inserts don't fail if Gemini is slow
  category    text        not null default 'other'
              check (category in ('preference','decision','project_detail','identity','goal','other')),
  source_tool text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. Row-level security — service role key bypasses this automatically
alter table memories enable row level security;

create policy "Service role has full access"
  on memories for all
  using (true)
  with check (true);

-- 4. Index for fast per-user + per-project lookups
create index if not exists memories_user_project_idx on memories (user_id, project);

-- 5. Semantic search function
create or replace function match_memories(
  p_user_id       text,
  p_project       text,
  query_embedding vector(768),
  match_threshold float default 0.75,
  match_count     int   default 5
)
returns table (id uuid, content text, category text, project text, created_at timestamptz)
language sql stable
as $$
  select m.id, m.content, m.category, m.project, m.created_at
  from memories m
  where m.user_id = p_user_id
    and (
      p_project = 'ALL'
      or m.project = p_project
      or m.project = 'global'
    )
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
