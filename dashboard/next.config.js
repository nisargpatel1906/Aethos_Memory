/** @type {import('next').NextConfig} */
const nextConfig = {
  // Expose public env vars to the browser bundle (prefix NEXT_PUBLIC_)
  // NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are used by
  // lib/supabaseClient.ts and the auth callback route.
  //
  // GEMINI_API_KEY is server-side only (used in app/api/reembed/route.ts).
  // It must NOT be prefixed with NEXT_PUBLIC_ — it is never sent to the browser.
  env: {},
};

module.exports = nextConfig;
