"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined,
      },
    });

    setLoading(false);
    if (error) {
      setMessage({ text: error.message, type: "error" });
    } else {
      setMessage({
        text: "Magic link sent! Check your email inbox to complete sign in.",
        type: "success",
      });
    }
  };

  const handleDevSignIn = () => {
    router.push("/feed");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div className="bg-surface border-subtle" style={{ width: "100%", maxWidth: "440px", padding: "2rem", borderRadius: "8px" }}>
        
        {/* Brand Header */}
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 8px rgba(16, 185, 129, 0.5)" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Aethos Memory</h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Portable memory layer for AI tools. Sign in to access your personal context bank.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label htmlFor="email-input" style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
              EMAIL ADDRESS
            </label>
            <input
              id="email-input"
              type="email"
              placeholder="developer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? "Sending Magic Link..." : "Send Magic Link"}
          </button>
        </form>

        {/* Instant Dev Mode Access */}
        <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)", textAlign: "center" }}>
          <button
            onClick={handleDevSignIn}
            style={{
              backgroundColor: "#15203b",
              border: "1px solid #10b981",
              color: "#10b981",
              fontWeight: 600,
              width: "100%",
              padding: "0.625rem",
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
            }}
          >
            ⚡ Open Dashboard Feed (Instant Dev Access)
          </button>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              borderRadius: "4px",
              fontSize: "0.875rem",
              backgroundColor: message.type === "error" ? "rgba(239, 68, 68, 0.1)" : "rgba(16, 185, 129, 0.1)",
              border: `1px solid ${message.type === "error" ? "#ef4444" : "#10b981"}`,
              color: message.type === "error" ? "#f87171" : "#34d399",
            }}
          >
            {message.text}
          </div>
        )}

        {/* Technical Footer */}
        <div style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", textAlign: "center" }}>
          BYOE Model — Supabase Auth & Magic Link
        </div>
      </div>
    </div>
  );
}
