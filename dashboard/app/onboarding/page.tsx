"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getUserId } from "../../lib/supabaseClient";
import AethosLogo from "../components/AethosLogo";

type ToolId = "claude_desktop" | "claude_code" | "cursor" | "opencode";

const AI_TOOLS: {
  id: ToolId;
  name: string;
  configPath: { win: string; mac: string } | { cmd: string };
}[] = [
  {
    id: "claude_desktop",
    name: "Claude Desktop",
    configPath: {
      win: "%APPDATA%\\Claude\\claude_desktop_config.json",
      mac: "~/Library/Application Support/Claude/claude_desktop_config.json",
    },
  },
  {
    id: "cursor",
    name: "Cursor",
    configPath: { win: "%USERPROFILE%\\.cursor\\mcp.json", mac: "~/.cursor/mcp.json" },
  },
  {
    id: "opencode",
    name: "OpenCode",
    configPath: {
      win: "%USERPROFILE%\\.config\\opencode\\opencode.jsonc",
      mac: "~/.config/opencode/opencode.jsonc",
    },
  },
  {
    id: "claude_code",
    name: "Claude Code",
    configPath: { cmd: "Terminal Command" },
  },
];

type DbStatus = "idle" | "setting_up" | "ready" | "manual_sql" | "error";

export default function OnboardingPage() {
  const [userId, setUserId] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolId>("claude_desktop");
  const [copied, setCopied] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>("idle");
  const [dbMessage, setDbMessage] = useState("");
  const [manualSql, setManualSql] = useState("");

  const [form, setForm] = useState({
    supabaseUrl: "",
    supabaseServiceKey: "",
    groqApiKey: "",
    geminiApiKey: "",
  });

  useEffect(() => {
    setUserId(getUserId());
    // Auto fill from localStorage if available
    const savedUrl = localStorage.getItem("aethos_supabase_url") || "";
    const savedKey = localStorage.getItem("aethos_supabase_key") || "";
    if (savedUrl && savedKey) {
      setForm((p) => ({ ...p, supabaseUrl: savedUrl, supabaseServiceKey: savedKey }));
    }
  }, []);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSetupDb = async () => {
    if (!form.supabaseUrl || !form.supabaseServiceKey) return;
    setDbStatus("setting_up");
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
        setDbStatus("ready");
        setDbMessage("Database ready! Your AI Memory Bank is active.");
        localStorage.setItem("aethos_supabase_url", form.supabaseUrl);
        localStorage.setItem("aethos_supabase_key", form.supabaseServiceKey);
      } else if (data.manualRequired) {
        setDbStatus("manual_sql");
        setDbMessage(data.message);
        setManualSql(data.sql || "");
      } else {
        setDbStatus("error");
        setDbMessage(data.error || "Setup failed. Double check your URL and secret key.");
      }
    } catch {
      setDbStatus("error");
      setDbMessage("Could not connect to database. Check your network or URL.");
    }
  };

  const getSnippet = () => {
    const env: Record<string, string> = {
      SUPABASE_URL: "<YOUR_SUPABASE_URL>",
      SUPABASE_SERVICE_ROLE_KEY: "<YOUR_SUPABASE_SERVICE_ROLE_KEY>",
      GROQ_API_KEY: "<YOUR_GROQ_API_KEY>",
      GEMINI_API_KEY: "<YOUR_GEMINI_API_KEY>",
      AETHOS_USER_ID: "<YOUR_AETHOS_USER_ID>",
      AETHOS_PROJECT: "global",
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

  const currentTool = AI_TOOLS.find((t) => t.id === selectedTool)!;
  const filePath = "win" in currentTool.configPath ? currentTool.configPath : null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-color)", padding: "2.5rem 1rem" }}>
      <div style={{ maxWidth: "660px", margin: "0 auto" }}>

        {/* Page Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
            <AethosLogo size={28} />
            <span style={{ color: "#10b981", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>
              Aethos Memory
            </span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.5rem" }}>
            Connect Your AI Memory Bank
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem" }}>
            Follow these 3 simple steps so your AI tools never forget your context.
          </p>
        </div>

        {/* ── STEP 1: Database Link & Secret Key ── */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <span style={{
                width: "24px", height: "24px", borderRadius: "50%",
                backgroundColor: dbStatus === "ready" ? "#10b981" : "#1d4ed8",
                color: "#fff", fontWeight: 700, fontSize: "0.75rem",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                {dbStatus === "ready" ? "✓" : "1"}
              </span>
              <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Step 1: Connect Database</h2>
            </div>
            <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none" }}>
              Get Supabase Keys →
            </a>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                Database URL
              </label>
              <input
                type="text"
                placeholder="https://xxxx.supabase.co"
                value={form.supabaseUrl}
                onChange={(e) => set("supabaseUrl", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                Secret Database Key (service_role)
              </label>
              <input
                type="password"
                placeholder="Secret key from Project Settings → API"
                value={form.supabaseServiceKey}
                onChange={(e) => set("supabaseServiceKey", e.target.value)}
                className="input-field"
              />
            </div>
          </div>

          <button
            onClick={handleSetupDb}
            disabled={!form.supabaseUrl || !form.supabaseServiceKey || dbStatus === "setting_up" || dbStatus === "ready"}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "5px",
              border: "none",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: form.supabaseUrl && form.supabaseServiceKey && dbStatus !== "ready" ? "pointer" : "not-allowed",
              backgroundColor: dbStatus === "ready" ? "#10b981" : form.supabaseUrl && form.supabaseServiceKey ? "#10b981" : "var(--border-color)",
              color: "#0b1326",
              transition: "all 0.2s",
            }}
          >
            {dbStatus === "setting_up" ? "Setting up database…"
              : dbStatus === "ready" ? "✓ Database Connected & Ready"
              : "Auto-Setup Database"}
          </button>

          {dbMessage && (
            <div style={{
              marginTop: "0.75rem", padding: "0.625rem 0.875rem", borderRadius: "4px",
              backgroundColor: dbStatus === "ready" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${dbStatus === "ready" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: dbStatus === "ready" ? "#34d399" : "#f87171", fontSize: "0.8125rem"
            }}>
              {dbMessage}
            </div>
          )}
        </div>

        {/* ── STEP 2: Pick Your AI Tool ── */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
            <span style={{
              width: "24px", height: "24px", borderRadius: "50%",
              backgroundColor: "#10b981", color: "#0b1326",
              fontWeight: 700, fontSize: "0.75rem",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              2
            </span>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Step 2: Pick Your AI Tool</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {AI_TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "5px",
                  border: selectedTool === tool.id ? "1px solid #10b981" : "1px solid var(--border-color)",
                  backgroundColor: selectedTool === tool.id ? "rgba(16,185,129,0.1)" : "var(--bg-color)",
                  color: selectedTool === tool.id ? "#34d399" : "var(--text-secondary)",
                  fontWeight: selectedTool === tool.id ? 600 : 400,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                {tool.name} {selectedTool === tool.id && "✓"}
              </button>
            ))}
          </div>
        </div>

        {/* ── STEP 3: Copy Code & Done ── */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <span style={{
                width: "24px", height: "24px", borderRadius: "50%",
                backgroundColor: "#10b981", color: "#0b1326",
                fontWeight: 700, fontSize: "0.75rem",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                3
              </span>
              <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Step 3: Copy 1-Click Code</h2>
            </div>
          </div>

          {/* Config Path Info */}
          {filePath && (
            <div style={{
              backgroundColor: "rgba(59,130,246,0.07)",
              border: "1px solid rgba(59,130,246,0.2)",
              padding: "0.75rem 1rem",
              borderRadius: "5px",
              fontSize: "0.8125rem",
              fontFamily: "var(--font-mono)",
              color: "#93c5fd",
              marginBottom: "1rem",
            }}>
              <div>File location for {currentTool.name}:</div>
              <div style={{ color: "#60a5fa", marginTop: "0.25rem" }}>Windows: {filePath.win}</div>
              <div style={{ color: "#60a5fa" }}>Mac/Linux: {filePath.mac}</div>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <pre style={{
              backgroundColor: "var(--bg-color)",
              border: "1px solid var(--border-color)",
              padding: "1rem",
              borderRadius: "5px",
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              color: "#e2e8f0",
              maxHeight: "220px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
            }}>
              {getSnippet()}
            </pre>

            <button
              onClick={copySnippet}
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "0.5rem",
                backgroundColor: copied ? "#10b981" : "#1e2d4d",
                border: "1px solid var(--border-color)",
                color: copied ? "#0b1326" : "#fff",
                padding: "0.375rem 0.75rem",
                borderRadius: "3px",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {copied ? "✓ Copied Code!" : "Copy Code"}
            </button>
          </div>
        </div>

        {/* Done CTA Button */}
        <Link
          href="/feed"
          style={{
            display: "block",
            textAlign: "center",
            backgroundColor: "#10b981",
            color: "#0b1326",
            fontWeight: 700,
            fontSize: "1rem",
            padding: "1rem",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          Open Memory Dashboard →
        </Link>
      </div>
    </div>
  );
}
