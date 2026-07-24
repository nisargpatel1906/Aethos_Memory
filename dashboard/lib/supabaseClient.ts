import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ─── Cookie helpers (client-side only) ────────────────────────────────────────

const COOKIE_DAYS = 365;

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + COOKIE_DAYS * 86_400_000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ─── Persist & clear credentials ──────────────────────────────────────────────

export function saveCredentials(url: string, key: string, userId: string) {
  if (typeof window === "undefined") return;
  // localStorage for instant access on the same browser
  localStorage.setItem("aethos_supabase_url", url);
  localStorage.setItem("aethos_supabase_key", key);
  localStorage.setItem("aethos_user_id", userId);
  // Cookies for persistence across sessions & server-side reads
  setCookie("aethos_supabase_url", url);
  setCookie("aethos_supabase_key", key);
  setCookie("aethos_user_id", userId);
}

export function clearCredentials() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("aethos_supabase_url");
  localStorage.removeItem("aethos_supabase_key");
  localStorage.removeItem("aethos_user_id");
  deleteCookie("aethos_supabase_url");
  deleteCookie("aethos_supabase_key");
  deleteCookie("aethos_user_id");
}

// ─── Read credentials (localStorage → cookie → env fallback) ──────────────────

function readCredential(lsKey: string, cookieKey: string, envVar?: string): string {
  if (typeof window !== "undefined") {
    return (
      localStorage.getItem(lsKey) ||
      getCookie(cookieKey) ||
      (envVar ? process.env[envVar] || "" : "")
    );
  }
  return envVar ? process.env[envVar] || "" : "";
}

// ─── Supabase singleton client ────────────────────────────────────────────────

// Module-level cache: only one SupabaseClient is ever created per URL+key pair.
let _cachedClient: SupabaseClient | null = null;
let _cachedUrl = "";
let _cachedKey = "";

/**
 * Returns a Supabase client using credentials stored in localStorage / cookies.
 * Falls back to env vars (for server-side rendering and .env.local setups).
 *
 * Implements a singleton pattern so only ONE client instance exists per
 * URL+key pair, preventing the "Multiple GoTrueClient instances" warning.
 *
 * No Supabase Auth is used — we connect directly with the service role key.
 * The user's "identity" is their AETHOS_USER_ID stored in localStorage/cookies.
 */
export function getSupabase(): SupabaseClient {
  const url = readCredential("aethos_supabase_url", "aethos_supabase_url", "NEXT_PUBLIC_SUPABASE_URL");
  const key = readCredential(
    "aethos_supabase_key",
    "aethos_supabase_key",
    "SUPABASE_SERVICE_ROLE_KEY"
  );

  const resolvedUrl = url || "https://placeholder.supabase.co";
  const resolvedKey = key || "placeholder-key";

  // Return cached client if credentials haven't changed
  if (_cachedClient && _cachedUrl === resolvedUrl && _cachedKey === resolvedKey) {
    return _cachedClient;
  }

  // Create a fresh client and cache it
  _cachedClient = createClient(resolvedUrl, resolvedKey, {
    auth: { persistSession: false },
  });
  _cachedUrl = resolvedUrl;
  _cachedKey = resolvedKey;

  return _cachedClient;
}

/**
 * Returns the user ID — either from localStorage/cookie or a generated default.
 * Set during /connect flow; used as a namespace for memories.
 */
export function getUserId(): string {
  if (typeof window === "undefined") return "server-side";
  return (
    localStorage.getItem("aethos_user_id") ||
    getCookie("aethos_user_id") ||
    "00000000-0000-0000-0000-000000000000"
  );
}

/**
 * Returns true if the user has configured their Supabase credentials.
 * Checks both localStorage and cookies.
 */
export function hasCredentials(): boolean {
  if (typeof window === "undefined") return true;
  const url =
    localStorage.getItem("aethos_supabase_url") || getCookie("aethos_supabase_url");
  const key =
    localStorage.getItem("aethos_supabase_key") || getCookie("aethos_supabase_key");
  return !!(url && key);
}

// Legacy compat — components that import { supabase } still work.
export const supabase = getSupabase();
