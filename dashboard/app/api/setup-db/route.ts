import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// The full schema SQL — mirrors supabase/schema.sql exactly
const SCHEMA_SQL = `
create extension if not exists vector;

create table if not exists memories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null,
  project     text        not null default 'global',
  content     text        not null,
  embedding   vector(768),
  category    text        not null default 'other'
              check (category in ('preference','decision','project_detail','other')),
  source_tool text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table memories enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'memories' and policyname = 'Service role has full access'
  ) then
    create policy "Service role has full access"
      on memories for all
      using (true)
      with check (true);
  end if;
end $$;

create index if not exists memories_user_project_idx on memories (user_id, project);

create or replace function match_memories(
  p_user_id       text,
  p_project       text,
  query_embedding vector(768),
  match_threshold float default 0.75,
  match_count     int   default 5
)
returns table (id uuid, content text, category text, created_at timestamptz)
language sql stable
as $$
  select m.id, m.content, m.category, m.created_at
  from memories m
  where m.user_id = p_user_id
    and m.project = p_project
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
`;

export async function POST(request: NextRequest) {
  try {
    const { supabaseUrl, supabaseServiceKey } = await request.json();

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "supabaseUrl and supabaseServiceKey are required" },
        { status: 400 }
      );
    }

    // Use service role key — bypasses RLS and can run DDL via rpc
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Run the schema via Supabase's SQL execution endpoint
    const { error } = await supabase.rpc("exec_sql", { sql: SCHEMA_SQL }).maybeSingle();

    // exec_sql may not exist yet — fall back to calling the REST SQL endpoint directly
    if (error && error.message?.includes("exec_sql")) {
      // Supabase management API — runs raw SQL with service role
      const sqlEndpoint = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
      const res = await fetch(sqlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql: SCHEMA_SQL }),
      });

      if (!res.ok) {
        // Try the pg_dump endpoint as a last resort
        const pgRes = await fetch(`${supabaseUrl}/rest/v1/`, {
          headers: {
            apikey: supabaseServiceKey,
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
        });

        // If we can reach Supabase but can't run DDL via REST, tell user to paste SQL manually
        if (pgRes.ok) {
          return NextResponse.json({
            success: false,
            manualRequired: true,
            message:
              "Connected to Supabase successfully, but automatic schema setup requires the SQL Editor. Copy the schema and paste it in Supabase → SQL Editor → New query → Run.",
            sql: SCHEMA_SQL,
          });
        }

        return NextResponse.json(
          { error: "Could not connect to Supabase. Check your URL and service role key." },
          { status: 400 }
        );
      }
    }

    // Verify the table exists after setup
    const { error: verifyError } = await supabase
      .from("memories")
      .select("id")
      .limit(1);

    if (verifyError && verifyError.code === "42P01") {
      // Table doesn't exist — return SQL for manual paste
      return NextResponse.json({
        success: false,
        manualRequired: true,
        message:
          "Please copy the SQL below and run it in Supabase → SQL Editor → New query → Run.",
        sql: SCHEMA_SQL,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Database schema set up successfully. Your memories table is ready.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
