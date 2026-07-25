import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// GET /api/memories/search?q=python&project=global&limit=50
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    const project = req.nextUrl.searchParams.get("project") || "";
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 200);

    const supabase = getSupabase();

    let query = supabase
      .from("memories")
      .select("id, project, content, category, source_tool, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (q) {
      query = query.ilike("content", `%${q}%`);
    }

    if (project) {
      query = query.eq("project", project);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memories: data || [], query: q, project });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
