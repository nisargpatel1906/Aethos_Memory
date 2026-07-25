import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, key);
}

// POST /api/memories/bulk-delete — delete multiple memories by ID array
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = body?.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array of memory UUIDs" }, { status: 400 });
    }

    // Safety cap — prevent accidentally nuking thousands of records
    if (ids.length > 200) {
      return NextResponse.json({ error: "Cannot delete more than 200 memories at once" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("memories").delete().in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: ids.length, ids });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
