import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side embedding route.
 *
 * Takes a { text } body, calls Gemini embedding API server-side so the
 * GEMINI_API_KEY is never exposed to the browser. No auth gate — the key
 * is purely a server env var, so there is no security exposure.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const text = body?.text || body?.content; // accept both field names for safety

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'text' field in request body." },
        { status: 400 }
      );
    }

    // 2. Verify GEMINI_API_KEY is configured server-side
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server. Add it to .env.local." },
        { status: 500 }
      );
    }

    // 3. Call Gemini embedding API — key never reaches the browser
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
        { error: "Invalid response from Gemini embedding API — missing embedding.values" },
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
