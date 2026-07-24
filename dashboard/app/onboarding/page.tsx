"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getUserId } from "../../lib/supabaseClient";

type ToolId = "claude_desktop" | "claude_code" | "cursor" | "opencode";

const TOOLS: {
  id: ToolId;
  label: string;
  configPath: { win: string; mac: string } | { cmd: string };
}[] = [
  {
    id: "claude_desktop",
    label: "Claude Desktop",
    configPath: {
      win: "%APPDATA%\\Claude\\claude_desktop_config.json",
      mac: "~/Library/Application Support/Claude/claude_desktop_config.json",
    },
  },
  {
    id: "claude_code",
    label: "Claude Code",
    configPath: { cmd: "claude mcp add — see snippet below" },
  },
  {
    id: "cursor",
    label: "Cursor",
    configPath: { win: "%USERPROFILE%\\.cursor\\mcp.json", mac: "~/.cursor/mcp.json" },
  },
  {
    id: "opencode",
    label: "OpenCode",
    configPath: {
      win: "%USERPROFILE%\\.config\\opencode\\opencode.jsonc",
      mac: "~/.config/opencode/opencode.jsonc",
    },
  },
];

type DbStatus = "idle" | "running" | "ok" | "manual" | "error";

export default function OnboardingPage() {
  const [userId, setUserId] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolId>("claude_desktop");
  const [copied, setCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>("idle");
  const [dbMessage, setDbMessage] = useState("");
  const [manualSql, setManualSql] = useState("");
  const [sqlCopied, setSqlCopied] = useState(false);

  const [form, setForm] = useState({
    supabaseUrl: "",
    supabaseServiceKey: "",
    groqApiKey: "",
    geminiApiKey: "",
    project: "global",
  });

  useEffect(() => {
    setUserId(getUserId());
  }, []);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSetupDb = async () => {
    if (!form.supabaseUrl || !form.supabaseServiceKey) return;
    setDbStatus("running");
    setDbMessage("");

    try {
      const res = await fetch("/api/setup-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supabaseUrl: form.supabaseUrl,
          supabaseServiceKey: form.supabaseServiceKey,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setDbStatus("ok");
        setDbMessage(data.message);
      } else if (data.manualRequired) {
        setDbStatus("manual");
        setDbMessage(data.message);
        setManualSql(data.sql || "");
      } else {
        setDbStatus("error");
        setDbMessage(data.error || "Setup failed.");
      }
    } catch {
      setDbStatus("error");
      setDbMessage("Network error — check that your Supabase URL is correct.");
    }
  };

  const getSnippet = () => {
    const env: Record<string, string> = {
      SUPABASE_URL: form.supabaseUrl || "https://xxxx.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: form.supabaseServiceKey || "eyJh...",
      GROQ_API_KEY: form.groqApiKey || "gsk_...",
      GEMINI_API_KEY: form.geminiApiKey || "AIza...",
      AETHOS_USER_ID: userId || "your-user-id",
      AETHOS_PROJECT: form.project || "global",
    };

    if (selectedTool === "claude_code") {
      const flags = Object.entries(env)
        .map(([k, v]) => `  -e ${k}="${v}"`)
        .join(" \\\n");
      return `claude mcp add aethos-memory uvx aethos-memory -- \\\n${flags}`;
    }

    return JSON.stringify(
      { mcpServers: { "aethos-memory": { command: "uvx", args: ["aethos-memory"], env } } },
      null,
      2
    );
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(getSnippet());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const copySql = () => {
    navigator.clipboard.writeText(manualSql);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2500);
  };

  const tool = TOOLS.find((t) => t.id === selectedTool)!;
  const configPath = "cmd" in tool.configPath
    ? null
    : tool.configPath;

  const canSetupDb = form.supabaseUrl && form.supabaseServiceKey;
  const canCopy = form.supabaseUrl && form.supabaseServiceKey && form.groqApiKey && form.geminiApiKey;

  // Progress: 1=Supabase, 2=API keys, 3=Tool picker, 4=Snippet
  const progress = [
    canSetupDb,
    !!(form.groqApiKey && form.geminiApiKey),
    true, // tool is always picked
    canCopy,
  ];
  const doneCount = progress.filter(Boolean).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-color)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "680px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <Link href="/" style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", textDecoration: "none" }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.02em", margin: "0.75rem 0 0.375rem" }}>
            Connect your AI tool
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
            3 fields + 1 click. Done in under 2 minutes.
          </p>

          {/* Progress bar */}
          <div style={{ display: "flex", gap: "4px", marginTop: "1.25rem", justifyContent: "center" }}>
            {progress.map((done, i) => (
              <div key={i} style={{
                width: "48px", height: "4px", borderRadius: "2px",
                backgroundColor: done ? "#10b981" : "var(--border-color)",
                transition: "background-color 0.3s",
              }} />
            ))}
          </div>
          <div style={{ marginTop: "0.375rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            {doneCount}/4 steps complete
          </div>
        </div>

        {/* ── Step 1: Supabase ── */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.875rem" }}>
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
              <span style={{ color: canSetupDb ? "#10b981" : "var(--text-secondary)", fontFamily: "var(--font-mono)", marginRight: "0.5rem" }}>
                {dbStatus === "ok" ? "✓" : "1"}
              </span>
              Supabase Database
            </h2>
            <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none" }}>
              Open Supabase →
            </a>
          </div>

          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Create a free project at <strong style={{ color: "var(--text-primary)" }}>supabase.com</strong>, then go to{" "}
            <strong style={{ color: "var(--text-primary)" }}>Project Settings → API</strong> to copy your URL and service_role key.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", marginBottom: "0.875rem" }}>
            <input type="text" placeholder="Project URL: https://xxxx.supabase.co"
              value={form.supabaseUrl} onChange={(e) => set("supabaseUrl", e.target.value)}
              className="input-field" />
            <input type="password" placeholder="service_role key: service_role_key..."
              value={form.supabaseServiceKey} onChange={(e) => set("supabaseServiceKey", e.target.value)}
              className="input-field" />
          </div>

          {/* Setup DB button */}
          <button
            onClick={handleSetupDb}
            disabled={!canSetupDb || dbStatus === "running" || dbStatus === "ok"}
            style={{
              width: "100%",
              padding: "0.625rem",
              borderRadius: "4px",
              border: "none",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: canSetupDb && dbStatus !== "ok" ? "pointer" : "not-allowed",
              backgroundColor: dbStatus === "ok" ? "#10b981" : canSetupDb ? "#1d4ed8" : "var(--border-color)",
              color: dbStatus === "ok" ? "#0b1326" : "#fff",
              opacity: (!canSetupDb || dbStatus === "running") ? 0.6 : 1,
              transition: "all 0.2s",
            }}
          >
            {dbStatus === "running" ? "⚙️ Setting up database…"
              : dbStatus === "ok" ? "✓ Database ready"
              : "⚡ Setup Database (one click)"}
          </button>

          {/* Status messages */}
          {dbStatus === "ok" && (
            <div style={{ marginTop: "0.625rem", padding: "0.625rem 0.875rem", borderRadius: "4px", backgroundColor: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", fontSize: "0.8125rem" }}>
              ✓ {dbMessage}
            </div>
          )}
          {dbStatus === "error" && (
            <div style={{ marginTop: "0.625rem", padding: "0.625rem 0.875rem", borderRadius: "4px", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: "0.8125rem" }}>
              ✗ {dbMessage}
            </div>
          )}
          {dbStatus === "manual" && (
            <div style={{ marginTop: "0.625rem", padding: "0.875rem", borderRadius: "4px", backgroundColor: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <div style={{ fontSize: "0.8125rem", color: "#fbbf24", marginBottom: "0.5rem" }}>⚠ {dbMessage}</div>
              <a href={`${form.supabaseUrl}/project/default/sql/new`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none" }}>
                Open SQL Editor →
              </a>
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                <button onClick={copySql} style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", backgroundColor: "#15203b", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "0.25rem 0.625rem", borderRadius: "3px", cursor: "pointer" }}>
                  {sqlCopied ? "Copied!" : "Copy SQL"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Step 2: API Keys ── */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "0.875rem" }}>
            <span style={{ color: form.groqApiKey && form.geminiApiKey ? "#10b981" : "var(--text-secondary)", fontFamily: "var(--font-mono)", marginRight: "0.5rem" }}>
              {form.groqApiKey && form.geminiApiKey ? "✓" : "2"}
            </span>
            API Keys — both free
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  GROQ_API_KEY — extracts facts from conversations
                </label>
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none" }}>
                  Get free →
                </a>
              </div>
              <input type="password" placeholder="gsk_..."
                value={form.groqApiKey} onChange={(e) => set("groqApiKey", e.target.value)}
                className="input-field" />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  GEMINI_API_KEY — generates embeddings for search
                </label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none" }}>
                  Get free →
                </a>
              </div>
              <input type="password" placeholder="AIza..."
                value={form.geminiApiKey} onChange={(e) => set("geminiApiKey", e.target.value)}
                className="input-field" />
            </div>
          </div>
        </div>

        {/* ── Step 3: Tool picker ── */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "0.875rem" }}>
            <span style={{ color: "#10b981", fontFamily: "var(--font-mono)", marginRight: "0.5rem" }}>✓</span>
            Which AI tool do you use?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
            {TOOLS.map((t) => (
              <button key={t.id} onClick={() => setSelectedTool(t.id)} style={{
                padding: "0.75rem 1rem",
                borderRadius: "5px",
                border: selectedTool === t.id ? "1px solid #10b981" : "1px solid var(--border-color)",
                backgroundColor: selectedTool === t.id ? "rgba(16,185,129,0.1)" : "var(--bg-color)",
                color: selectedTool === t.id ? "#34d399" : "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
                fontWeight: selectedTool === t.id ? 600 : 400,
                fontSize: "0.875rem",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}>
                {t.label} {selectedTool === t.id && "✓"}
              </button>
            ))}
          </div>

          {/* Config path hint */}
          {configPath && (
            <div style={{ backgroundColor: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)", padding: "0.75rem", borderRadius: "5px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#93c5fd" }}>
              <div style={{ marginBottom: "0.25rem", fontWeight: 600 }}>📁 Paste snippet into:</div>
              <div style={{ color: "#60a5fa" }}>Windows: {configPath.win}</div>
              <div style={{ color: "#60a5fa" }}>Mac/Linux: {configPath.mac}</div>
            </div>
          )}
        </div>

        {/* ── Step 4: Generated Snippet ── */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.875rem" }}>
            <h2 style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
              <span style={{ color: canCopy ? "#10b981" : "var(--text-secondary)", fontFamily: "var(--font-mono)", marginRight: "0.5rem" }}>
                {canCopy ? "✓" : "4"}
              </span>
              Your MCP config — auto-generated
            </h2>
            {canCopy && <span style={{ fontSize: "0.75rem", color: "#34d399", fontFamily: "var(--font-mono)" }}>All fields filled ✓</span>}
          </div>

          <div style={{ position: "relative" }}>
            <pre style={{
              backgroundColor: "var(--bg-color)",
              border: "1px solid var(--border-color)",
              padding: "1rem 1rem 1rem 1rem",
              borderRadius: "5px",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              color: canCopy ? "#e2e8f0" : "#64748b",
              maxHeight: "220px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
            }}>
              {getSnippet()}
            </pre>
            <button onClick={copySnippet} style={{
              position: "absolute", top: "0.5rem", right: "0.5rem",
              backgroundColor: copied ? "#10b981" : "#1e2d4d",
              border: "1px solid var(--border-color)",
              color: copied ? "#0b1326" : "var(--text-primary)",
              padding: "0.3rem 0.625rem",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "0.72rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
            }}>
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>

          <div style={{ marginTop: "0.875rem", fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {selectedTool === "claude_code"
              ? "Run the command above in your terminal, then restart Claude Code."
              : `Paste this into the config file shown above, then restart ${tool.label}.`}
          </div>
        </div>

        {/* Done CTA */}
        <Link href="/feed" style={{
          display: "block", textAlign: "center",
          backgroundColor: "#10b981", color: "#0b1326",
          fontWeight: 700, fontSize: "1rem",
          padding: "1rem", borderRadius: "6px",
          textDecoration: "none", marginBottom: "1rem",
        }}>
          Done — Open my Memory Dashboard →
        </Link>

        <p style={{ textAlign: "center", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
          Need help?{" "}
          <a href="https://github.com/nisargpatel1906/Aethos_Memory" target="_blank" rel="noopener noreferrer"
            style={{ color: "#10b981", textDecoration: "none" }}>
            View setup guide on GitHub →
          </a>
        </p>
      </div>
    </div>
  );
}
