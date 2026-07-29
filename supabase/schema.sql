-- ====================================================================
-- Aethos Memory — Supabase Database Schema (Complete Feature Suite)
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Or click "Setup Database" in the Aethos dashboard onboarding page.
-- ====================================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create memories table
create table if not exists memories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null,
  project     text        not null default 'global',
  content     text        not null,
  embedding   vector(768),          -- nullable so inserts don't fail if Gemini is slow
  category    text        not null default 'other'
              check (category in ('preference','decision','project_detail','identity','goal','other')),
  source_tool text,
  importance  int         not null default 3 check (importance between 1 and 5),
  expires_at  timestamptz default null,
  access_count int        not null default 0,
  tags        text[]      not null default '{}',
  team_id     text        default null,
  author_id   text        default null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Ensure non-destructive schema additions on existing tables
alter table memories add column if not exists importance int not null default 3 check (importance between 1 and 5);
alter table memories add column if not exists expires_at timestamptz default null;
alter table memories add column if not exists access_count int not null default 0;
alter table memories add column if not exists tags text[] not null default '{}';
alter table memories add column if not exists team_id text default null;
alter table memories add column if not exists author_id text default null;
alter table memories add column if not exists entities text[] not null default '{}';

-- 3. Row-level security — service role key bypasses this automatically
alter table memories enable row level security;

drop policy if exists "Service role has full access" on memories;
create policy "Service role has full access"
  on memories for all
  using (true)
  with check (true);

-- 4. Index for fast per-user + per-project lookups & tags
create index if not exists memories_user_project_idx on memories (user_id, project);
create index if not exists memories_tags_idx on memories using gin (tags);
create index if not exists memories_entities_idx on memories using gin (entities);

-- 5. Memory Versioning Audit Table & Trigger
create table if not exists memory_versions (
  id          uuid        primary key default gen_random_uuid(),
  memory_id   uuid        not null references memories(id) on delete cascade,
  old_content text        not null,
  old_category text       not null,
  updated_by  text,
  changed_at  timestamptz not null default now()
);

create or replace function archive_memory_version()
returns trigger as $$
begin
  if old.content <> new.content or old.category <> new.category then
    insert into memory_versions (memory_id, old_content, old_category, updated_by, changed_at)
    values (old.id, old.content, old.category, new.source_tool, now());
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists archive_memory_version_trigger on memories;
create trigger archive_memory_version_trigger
  before update on memories
  for each row
  execute function archive_memory_version();

-- 6. API Keys Table for Public REST API
create table if not exists api_keys (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null,
  key_hash    text        not null unique,
  name        text        not null default 'Default API Key',
  created_at  timestamptz not null default now()
);

-- 7. Increment Access Count RPC (called by server on every recall)
create or replace function increment_access_count_by_id(m_id uuid)
returns void
language sql
as $$
  update memories set access_count = access_count + 1 where id = m_id;
$$;

-- 8. Standard Vector-Only Search Function (fallback when hybrid is unavailable)
create or replace function match_memories(
  p_user_id       text,
  p_project       text,
  query_embedding vector(768),
  match_threshold float default 0.65,
  match_count     int   default 10
)
returns table (
  id           uuid,
  content      text,
  category     text,
  project      text,
  importance   int,
  tags         text[],
  source_tool  text,
  access_count int,
  expires_at   timestamptz,
  created_at   timestamptz,
  similarity   float
)
language sql stable
as $$
  select 
    m.id, m.content, m.category, m.project,
    coalesce(m.importance, 3) as importance,
    coalesce(m.tags, '{}'::text[]) as tags,
    m.source_tool,
    coalesce(m.access_count, 0) as access_count,
    m.expires_at, m.created_at,
    round((1 - (m.embedding <=> query_embedding))::numeric, 4)::float as similarity
  from memories m
  where m.user_id::text = p_user_id::text
    and (p_project = 'ALL' or m.project = p_project or m.project = 'global')
    and m.embedding is not null
    and (m.expires_at is null or m.expires_at > now())
    and (1 - (m.embedding <=> query_embedding)) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- 9. Advanced Hybrid Search Function (Keyword + Vector + Recency Weighting)
create or replace function match_memories_hybrid(
  p_user_id       text,
  p_project       text,
  query_text      text,
  query_embedding vector(768),
  match_threshold float default 0.65,
  match_count     int   default 10
)
returns table (
  id           uuid,
  content      text,
  category     text,
  project      text,
  importance   int,
  tags         text[],
  source_tool  text,
  access_count int,
  expires_at   timestamptz,
  created_at   timestamptz,
  similarity   float
)
language sql stable
as $$
  select 
    m.id, 
    m.content, 
    m.category, 
    m.project, 
    coalesce(m.importance, 3) as importance,
    coalesce(m.tags, '{}'::text[]) as tags,
    m.source_tool,
    coalesce(m.access_count, 0) as access_count,
    m.expires_at,
    m.created_at,
    round((1 - (m.embedding <=> query_embedding))::numeric, 4)::float as similarity
  from memories m
  where m.user_id::text = p_user_id::text
    and (
      p_project = 'ALL'
      or m.project = p_project
      or m.project = 'global'
    )
    and m.embedding is not null
    and (m.expires_at is null or m.expires_at > now())
    and (
      (1 - (m.embedding <=> query_embedding)) > match_threshold
      or (query_text <> '' and to_tsvector('english', m.content) @@ plainto_tsquery('english', query_text))
    )
  order by 
    (1 - (m.embedding <=> query_embedding)) * (1 + (coalesce(m.importance, 3) * 0.05)) desc
  limit match_count;
$$;
