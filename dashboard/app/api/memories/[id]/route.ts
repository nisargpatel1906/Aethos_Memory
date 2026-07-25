import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// PATCH /api/memories/[id] — update content (triggers re-embed via Gemini)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY || "";
    if (!geminiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    // Re-embed the new content
    const embedRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: content.trim() }] },
          outputDimensionality: 768,
        }),
      }
    );

    if (!embedRes.ok) {
      return NextResponse.json({ error: "Re-embedding failed" }, { status: 500 });
    }

    const embedData = await embedRes.json();
    const embedding = embedData?.embedding?.values;

    if (!embedding) {
      return NextResponse.json({ error: "Invalid embedding response from Gemini" }, { status: 500 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("memories")
      .update({
        content: content.trim(),
        embedding,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select("id, project, content, category, source_tool, created_at, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memory: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/memories/[id] — delete a single memory
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from("memories").delete().eq("id", params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: params.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
