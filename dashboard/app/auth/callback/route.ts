import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase magic-link auth callback route.
 *
 * Flow:
 *   1. User requests magic link → Supabase emails a link pointing here.
 *   2. This route receives `code` (PKCE) or `token_hash` + `type`.
 *   3. We exchange it for a session, then:
 *      - New user (0 memories) → redirect to /onboarding
 *      - Returning user       → redirect to /feed
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "recovery" | null;
  const next = searchParams.get("next") ?? null;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let userId: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      userId = data.user.id;
    }
  } else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error && data?.user) {
      userId = data.user.id;
    }
  }

  if (userId) {
    // If a specific next was requested, honour it
    if (next) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // Check if this is a new user (0 memories) → send to onboarding
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { count } = await adminClient
      .from("memories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const destination = (count ?? 0) === 0 ? "/onboarding" : "/feed";
    return NextResponse.redirect(`${origin}${destination}`);
  }

  // Auth exchange failed — redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
