import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client using credentials stored in localStorage.
 * Falls back to env vars (for server-side rendering and .env.local setups).
 *
 * No Supabase Auth is used — we connect directly with the service role key.
 * The user's "identity" is their AETHOS_USER_ID stored in localStorage.
 */
export function getSupabase(): SupabaseClient {
  let url = "";
  let key = "";

  if (typeof window !== "undefined") {
    // Client-side: prefer localStorage credentials set during /connect flow
    url = localStorage.getItem("aethos_supabase_url") || "";
    key = localStorage.getItem("aethos_supabase_key") || "";
  }

  // Fall back to env vars (used when running locally with .env.local)
  if (!url) url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!key) key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  return createClient(url || "https://placeholder.supabase.co", key || "placeholder-key");
}

/**
 * Returns the user ID — either from localStorage or a generated default.
 * Set during /connect flow; used as a namespace for memories.
 */
export function getUserId(): string {
  if (typeof window === "undefined") return "server-side";
  return (
    localStorage.getItem("aethos_user_id") ||
    "00000000-0000-0000-0000-000000000000" // fallback for existing data
  );
}

/**
 * Returns true if the user has configured their Supabase credentials.
 */
export function hasCredentials(): boolean {
  if (typeof window === "undefined") return true;
  return !!(
    localStorage.getItem("aethos_supabase_url") &&
    localStorage.getItem("aethos_supabase_key")
  );
}

// Legacy compat — components that import { supabase } still work.
// Note: this is a module-level singleton; it reads env vars only (not localStorage).
// Client components should call getSupabase() directly for localStorage-based creds.
export const supabase = getSupabase();
