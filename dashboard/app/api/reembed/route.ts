import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side re-embedding route.
 *
 * Takes a text string, calls Gemini's embedding API server-side (so GEMINI_API_KEY
 * is never exposed to the browser), and returns the 768-dimensional embedding vector.
 *
 * Auth: reads the Supabase session from the request cookie, not from an Authorization
 * header. The client pages (feed, add, feed/[id]) call this via plain fetch() without
 * manually setting any auth headers — the browser sends cookies automatically.
 *
 * In production, unauthenticated requests are rejected to prevent anyone from hitting
 * this endpoint and burning through the Gemini API quota.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify session from cookies (works in both dev and production)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key",
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            // Route handlers can't set cookies directly, but we need the interface
            try {
              cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore — this is a GET-adjacent read-only context
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized — please sign in to use the embedding service." },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const text = body?.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'text' field" },
        { status: 400 }
      );
    }

    // 3. Verify GEMINI_API_KEY is configured server-side
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server. Set it in Vercel environment variables." },
        { status: 500 }
      );
    }

    // 4. Call Gemini embedding API server-side (key never reaches the browser)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiApiKey}`;
    const payload = {
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini API error (${response.status}): ${errText}` },
        { status: response.status }
      );
    }

    const resData = await response.json();
    const embedding = resData?.embedding?.values;

    if (!embedding || !Array.isArray(embedding)) {
      return NextResponse.json(
        { error: "Invalid response shape from Gemini embedding API — missing embedding.values" },
        { status: 500 }
      );
    }

    return NextResponse.json({ embedding });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
