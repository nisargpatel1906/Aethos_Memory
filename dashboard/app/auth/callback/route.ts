import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase magic-link auth callback route.
 *
 * Supabase OTP/magic-link flow:
 *   1. User requests magic link → Supabase sends email with a link pointing here.
 *   2. This route receives the `code` (PKCE) or `token_hash` + `type` (email OTP).
 *   3. We exchange it for a session, set the session cookie, then redirect to /feed.
 *
 * The login page must set emailRedirectTo to /auth/callback (not /feed directly).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "recovery" | null;
  // `next` allows the original page to pass a redirect target
  const next = searchParams.get("next") ?? "/feed";

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  if (code) {
    // PKCE flow (used by newer Supabase clients)
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (token_hash && type) {
    // Email OTP / magic link flow
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If exchange failed, redirect to login with an error hint
  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_failed`
  );
}
