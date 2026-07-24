"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AethosLogo from "../components/AethosLogo";
import { saveCredentials } from "../../lib/supabaseClient";

const SCHEMA_SQL = `
create extension if not exists vector;
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  project text not null default 'global',
  content text not null,
  embedding vector(768),
  category text not null default 'other'
    check (category in ('preference','decision','project_detail','other')),
  source_tool text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table memories enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='memories' and policyname='Service role has full access') then
    create policy "Service role has full access" on memories for all using (true) with check (true);
  end if;
end $$;
create index if not exists memories_user_project_idx on memories (user_id, project);
create or replace function match_memories(
  p_user_id text, p_project text, query_embedding vector(768),
  match_threshold float default 0.75, match_count int default 5
) returns table (id uuid, content text, category text, created_at timestamptz)
language sql stable as $$
  select m.id, m.content, m.category, m.created_at from memories m
  where m.user_id=p_user_id and m.project=p_project and m.embedding is not null
    and 1-(m.embedding<=>query_embedding)>match_threshold
  order by m.embedding<=>query_embedding limit match_count;
$$;
`;

type Status = "idle" | "connecting" | "done" | "needs_sql" | "error";

export default function ConnectPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [sqlCopied, setSqlCopied] = useState(false);

  useEffect(() => {
    // Read from localStorage first, fall back to cookies
    const getCookie = (name: string) => {
      const match = document.cookie.split("; ").find((r) => r.startsWith(`${name}=`));
      return match ? decodeURIComponent(match.split("=")[1]) : "";
    };
    const savedUrl = localStorage.getItem("aethos_supabase_url") || getCookie("aethos_supabase_url");
    const savedKey = localStorage.getItem("aethos_supabase_key") || getCookie("aethos_supabase_key");
    const savedUser = localStorage.getItem("aethos_user_id") || getCookie("aethos_user_id");
    setUrl(savedUrl);
    setKey(savedKey);
    setUserId(savedUser);
  }, []);

  const handleConnect = async () => {
    if (!url || !key) return;
    setStatus("connecting");
    setMessage("Connecting to Supabase…");

    try {
      // 1. Test connection + run migration via our API route
      const res = await fetch("/api/setup-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supabaseUrl: url, supabaseServiceKey: key }),
      });
      const data = await res.json();

      if (!res.ok && !data.manualRequired) {
        setStatus("error");
        setMessage(data.error || "Could not connect to Supabase. Check your URL and service role key.");
        return;
      }

      // 2. Save credentials to localStorage + persistent cookie (365 days)
      const finalUserId = userId.trim() || crypto.randomUUID();
      saveCredentials(url, key, finalUserId);

      if (data.manualRequired) {
        setStatus("needs_sql");
        setMessage("Connected! But your database schema needs a one-time setup — copy the SQL below and run it in Supabase SQL Editor, then come back.");
        return;
      }

      setStatus("done");
      setMessage("All done! Taking you to your dashboard…");
      setTimeout(() => router.push("/feed"), 1200);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Unexpected error. Try again.");
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SCHEMA_SQL.trim());
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const isReady = url && key;

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "var(--bg-color)" }}>
      {/* Left — branding */}
      <div style={{
        width: "380px", flexShrink: 0,
        backgroundColor: "var(--sidebar-bg, #090f1e)",
        borderRight: "1px solid var(--border-color)",
        display: "flex", flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem 2.5rem",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "3rem" }}>
            <AethosLogo size={32} />
            <span style={{ color: "#10b981", fontWeight: 700, fontSize: "1.125rem", fontFamily: "var(--font-mono)" }}>
              Aethos Memory
            </span>
          </div>

          <h1 style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "1rem" }}>
            Your AI tools forget.{" "}
            <span style={{ color: "#10b981" }}>Aethos&nbsp;doesn't.</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.65, marginBottom: "2.5rem" }}>
            A portable memory layer that silently captures your preferences, decisions, and project details — across every AI tool you use.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {[
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"/>
                    <polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                ),
                title: "Cross-tool sync",
                desc: "Claude, Cursor, OpenCode — one bank.",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a9 9 0 0 1 9 9c0 3.6-2.1 6.7-5.2 8.1-.4.2-.8.6-.8 1v.9c0 .6-.4 1-1 1h-4c-.6 0-1-.4-1-1v-.9c0-.4-.4-.8-.8-1C5.1 17.7 3 14.6 3 11a9 9 0 0 1 9-9z"/>
                    <path d="M9 22h6"/>
                  </svg>
                ),
                title: "Persistent context",
                desc: "Your AI never asks the same thing twice.",
              },
              {
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                ),
                title: "Zero effort capture",
                desc: "Extracted automatically, silently.",
              },
            ].map((f) => (
              <div key={f.title} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, marginTop: "0.1rem" }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{f.title}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.8125rem" }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
          Your data stays in your Supabase. We never see it.
        </div>
      </div>

      {/* Right — connect form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.375rem" }}>
            Connect your Supabase
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
            Paste 2 values from your Supabase project. We'll set up everything else automatically.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.25rem" }}>
            {/* Supabase URL */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  SUPABASE PROJECT URL
                </label>
                <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none" }}>
                  Get it here →
                </a>
              </div>
              <input
                type="text"
                placeholder="https://xxxx.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Service Role Key */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  SERVICE ROLE KEY (Settings → API)
                </label>
                <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none" }}>
                  Find it →
                </a>
              </div>
              <input
                type="password"
                placeholder="service_role_key…"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="input-field"
              />
            </div>

            {/* Optional User ID */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                YOUR USER ID <span style={{ color: "#64748b" }}>(optional — auto-generated if blank)</span>
              </label>
              <input
                type="text"
                placeholder="Leave blank to auto-generate"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          {/* THE button */}
          <button
            onClick={handleConnect}
            disabled={!isReady || status === "connecting" || status === "done"}
            style={{
              width: "100%",
              padding: "0.875rem",
              backgroundColor: status === "done" ? "#10b981" : isReady ? "#10b981" : "var(--border-color)",
              color: "#0b1326",
              fontWeight: 700,
              fontSize: "1rem",
              borderRadius: "5px",
              border: "none",
              cursor: isReady && status === "idle" ? "pointer" : "not-allowed",
              opacity: status === "connecting" ? 0.7 : 1,
              transition: "all 0.2s",
              marginBottom: "1rem",
            }}
          >
            {status === "connecting" ? "Setting up everything…"
              : status === "done" ? "✓ Connected! Opening dashboard…"
              : "Connect & Setup Everything"}
          </button>

          {/* Status messages */}
          {status === "error" && (
            <div style={{ padding: "0.875rem", borderRadius: "5px", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "0.8125rem", marginBottom: "1rem" }}>
              ✗ {message}
            </div>
          )}

          {status === "done" && (
            <div style={{ padding: "0.875rem", borderRadius: "5px", backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", fontSize: "0.8125rem", marginBottom: "1rem" }}>
              ✓ {message}
            </div>
          )}

          {status === "needs_sql" && (
            <div style={{ padding: "0.875rem", borderRadius: "5px", backgroundColor: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.3)", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.8125rem", color: "#fbbf24", marginBottom: "0.625rem" }}>{message}</div>
              <div style={{ display: "flex", gap: "0.625rem", marginBottom: "0.625rem" }}>
                <button onClick={copySql} style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", backgroundColor: "#15203b", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "0.3rem 0.625rem", borderRadius: "3px", cursor: "pointer" }}>
                  {sqlCopied ? "✓ Copied!" : "Copy SQL"}
                </button>
                <a href={`${url}/project/default/sql/new`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none", display: "flex", alignItems: "center" }}>
                  Open SQL Editor →
                </a>
              </div>
              <button
                onClick={() => router.push("/feed")}
                style={{ width: "100%", padding: "0.5rem", backgroundColor: "#10b981", color: "#0b1326", fontWeight: 700, fontSize: "0.875rem", borderRadius: "4px", border: "none", cursor: "pointer" }}
              >
                I've run the SQL — take me to the dashboard →
              </button>
            </div>
          )}

          {/* What happens next hint */}
          {status === "idle" && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.7, fontFamily: "var(--font-mono)" }}>
              One click will: test your connection · create the memories table · set up vector search · open your dashboard.
            </div>
          )}

          {/* Skip for dev */}
          <button
            onClick={() => router.push("/onboarding")}
            style={{ display: "block", width: "100%", marginTop: "1rem", background: "none", border: "1px dashed var(--border-color)", color: "var(--text-secondary)", padding: "0.5rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}
          >
            Need MCP setup instructions? →
          </button>
        </div>
      </div>
    </div>
  );
}
