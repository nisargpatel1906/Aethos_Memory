-- ====================================================================
-- Aethos Memory — Supabase Database Migration
-- ====================================================================
-- NOTE: This is a one-time migration file meant to be executed directly
-- in the Supabase SQL Editor by the user. The MCP server process does
-- NOT auto-apply database migrations.
-- ====================================================================

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
