"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const MEMORY_PREVIEWS = [
  { content: "Always use PostgreSQL + Drizzle ORM for backend microservices.", tag: "Preference", tool: "Claude Code" },
  { content: "Production deployments require approval before pushing to main.", tag: "Decision", tool: "Cursor" },
  { content: "Local dev environment runs on Windows PowerShell.", tag: "Project Detail", tool: "OpenCode" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined,
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined,
      },
    });
    if (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
    // On success, browser redirects — no need to setLoading(false)
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        backgroundColor: "var(--bg-color)",
      }}
    >
      {/* ── Left: Hero / Value Prop ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "3rem 4rem",
          borderRight: "1px solid var(--border-color)",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2.5rem" }}>
          <div className="pulse-dot" style={{ width: "10px", height: "10px" }} />
          <span style={{ fontSize: "1.125rem", fontWeight: 700, color: "#10b981", fontFamily: "var(--font-mono)" }}>
            Aethos Memory
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: "2.75rem",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            marginBottom: "1rem",
          }}
        >
          Your AI tools forget.{" "}
          <span style={{ color: "#10b981" }}>Aethos doesn't.</span>
        </h1>

        <p style={{ fontSize: "1.0625rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "2rem", maxWidth: "420px" }}>
          A portable memory layer that silently captures your preferences, decisions, and project details — and makes them available to every AI tool you use.
        </p>

        {/* 3 Value Props */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "2.5rem" }}>
          {[
            { icon: "🔄", title: "Cross-tool sync", desc: "Claude, Cursor, OpenCode — one memory bank." },
            { icon: "🧠", title: "Persistent context", desc: "Your AI never asks the same question twice." },
            { icon: "⚡", title: "Zero effort capture", desc: "Memories are extracted automatically, silently." },
          ].map((item) => (
            <div key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>{item.title}</div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Animated Memory Card Previews */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
            LIVE MEMORY FEED PREVIEW
          </div>
          {MEMORY_PREVIEWS.map((m, i) => (
            <div
              key={i}
              className="bg-surface border-subtle"
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "5px",
                opacity: 1 - i * 0.2,
                transform: `translateY(${i * 2}px)`,
              }}
            >
              <div style={{ fontSize: "0.8125rem", color: "var(--text-primary)", marginBottom: "0.375rem" }}>
                {m.content}
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#34d399", backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", padding: "0.15rem 0.4rem", borderRadius: "2px" }}>
                  {m.tag}
                </span>
                <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>
                  via {m.tool}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Auth Form ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 4rem" }}>
        <div style={{ width: "100%", maxWidth: "380px" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>
            {sent ? "Check your inbox" : "Get started"}
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1.75rem" }}>
            {sent
              ? `We sent a magic link to ${email}. Click it to sign in.`
              : "Create your personal AI memory bank in 2 minutes."}
          </p>

          {!sent ? (
            <>
              {/* Google OAuth */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.625rem",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #d1d5db",
                  padding: "0.75rem",
                  borderRadius: "4px",
                  fontWeight: 600,
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                  marginBottom: "1.25rem",
                  opacity: googleLoading ? 0.7 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
                  <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#34A853"/>
                  <path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z" fill="#FBBC05"/>
                  <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" fill="#EA4335"/>
                </svg>
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>or email</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-color)" }} />
              </div>

              {/* Email magic link */}
              <form onSubmit={handleMagicLink} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                />
                <button type="submit" className="btn-primary" disabled={loading}
                  style={{ opacity: loading ? 0.7 : 1, justifyContent: "center" }}>
                  {loading ? "Sending…" : "Send Magic Link"}
                </button>
              </form>

              {error && (
                <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: "4px", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", color: "#f87171", fontSize: "0.8125rem" }}>
                  {error}
                </div>
              )}

              {/* Dev bypass */}
              <button
                onClick={() => router.push("/feed")}
                style={{
                  marginTop: "1.25rem",
                  width: "100%",
                  background: "none",
                  border: "1px dashed var(--border-color)",
                  color: "var(--text-secondary)",
                  padding: "0.625rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                }}
              >
                ⚡ Skip login — Dev preview
              </button>
            </>
          ) : (
            /* Sent state */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📬</div>
              <div style={{ padding: "1rem", backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "6px", color: "#34d399", fontSize: "0.875rem", marginBottom: "1rem" }}>
                Magic link sent! Check your inbox and click the link to access your dashboard.
              </div>
              <button onClick={() => setSent(false)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8125rem" }}>
                ← Try a different email
              </button>
            </div>
          )}

          <div style={{ marginTop: "2rem", fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", textAlign: "center", lineHeight: 1.6 }}>
            Your memories are stored in your own Supabase instance.{"\n"}We never see your data.
          </div>
        </div>
      </div>
    </div>
  );
}
