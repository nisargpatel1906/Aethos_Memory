import { NextResponse } from "next/server";
import { getSupabase } from "../../../../lib/supabaseClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const project = searchParams.get("project") || "global";
  const query = searchParams.get("q") || "";

  try {
    const db = getSupabase();
    let queryBuilder = db
      .from("memories")
      .select("id, user_id, project, content, category, source_tool, importance, expires_at, access_count, tags, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (project !== "ALL") {
      queryBuilder = queryBuilder.eq("project", project);
    }

    if (query) {
      queryBuilder = queryBuilder.ilike("content", `%${query}%`);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;

    return NextResponse.json({ success: true, count: data?.length || 0, memories: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content, project = "global", category = "other", importance = 3, tags = [] } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const db = getSupabase();
    const { data, error } = await db.from("memories").insert({
      user_id: "284a879c-161c-4d76-8a8d-590bae04d88b",
      project,
      content: content.trim(),
      category,
      importance,
      tags,
      source_tool: "Public REST API v1",
    }).select();

    if (error) throw error;
    return NextResponse.json({ success: true, memory: data?.[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
