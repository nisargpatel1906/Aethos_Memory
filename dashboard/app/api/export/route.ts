import { NextResponse } from "next/server";
import { getSupabase, getUserId } from "../../../lib/supabaseClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "json").toLowerCase();

  try {
    const db = getSupabase();
    let memories: any[] = [];

    // Try selecting with extended columns first, with fallback to core columns
    try {
      const { data, error } = await db
        .from("memories")
        .select("id, project, content, category, source_tool, importance, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      memories = data || [];
    } catch (e) {
      const { data } = await db
        .from("memories")
        .select("id, project, content, category, source_tool, created_at")
        .order("created_at", { ascending: false });
      memories = data || [];
    }

    const items = memories;

    if (format === "markdown") {
      let md = `# Aethos Memory Export\n*Exported on ${new Date().toISOString()}*\n\n`;
      items.forEach((m: any) => {
        md += `### [${m.project}] ${m.content}\n`;
        md += `- **Category**: ${m.category}\n`;
        md += `- **Tool**: ${m.source_tool || "Unknown"}\n`;
        md += `- **Importance**: ${m.importance || 3}/5\n`;
        md += `- **Date**: ${m.created_at}\n\n---\n\n`;
      });
      return new Response(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": 'attachment; filename="aethos_memories_backup.md"',
        },
      });
    }

    if (format === "csv") {
      let csv = "ID,Project,Category,Content,SourceTool,Importance,CreatedAt\n";
      items.forEach((m: any) => {
        const cleanContent = `"${(m.content || "").replace(/"/g, '""')}"`;
        csv += `"${m.id}","${m.project}","${m.category}",${cleanContent},"${m.source_tool || ""}","${m.importance || 3}","${m.created_at}"\n`;
      });
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="aethos_memories_backup.csv"',
        },
      });
    }

    // JSON Format with forced file download headers
    const jsonStr = JSON.stringify({ exported_at: new Date().toISOString(), total: items.length, memories: items }, null, 2);
    return new Response(jsonStr, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="aethos_memories_backup.json"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { items, source = "chatgpt" } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid import format — items array required" }, { status: 400 });
    }

    const db = getSupabase();
    const rows = items
      .map((item) => ({
        user_id: getUserId(),
        project: item.project || "imported",
        content: typeof item === "string" ? item : item.content || item.text || item.memory,
        category: item.category || "preference",
        source_tool: `Imported from ${source}`,
        importance: item.importance || 3,
      }))
      .filter((r) => r.content && r.content.trim());

    const { data, error } = await db.from("memories").insert(rows).select();
    if (error) throw error;

    return NextResponse.json({ success: true, imported_count: data?.length || 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
