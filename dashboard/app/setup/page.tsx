"use client";

import React, { useState, useEffect } from "react";
import { getUserId } from "../../lib/supabaseClient";

type ToolId = "claude_desktop" | "cursor" | "opencode" | "claude_code";

interface Tool {
  id: ToolId;
  name: string;
  logo: string;
  winPath: string;
  macPath: string;
  fileLabel: string;
  isTerminal?: boolean;
}

const TOOLS: Tool[] = [
  {
    id: "claude_desktop",
    name: "Claude Desktop",
    logo: "C",
    winPath: "%APPDATA%\\Claude\\claude_desktop_config.json",
    macPath: "~/Library/Application Support/Claude/claude_desktop_config.json",
    fileLabel: "claude_desktop_config.json",
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: "⌘",
    winPath: "%USERPROFILE%\\.cursor\\mcp.json",
    macPath: "~/.cursor/mcp.json",
    fileLabel: "mcp.json",
  },
  {
    id: "opencode",
    name: "OpenCode",
    logo: "O",
    winPath: "%USERPROFILE%\\.config\\opencode\\opencode.jsonc",
    macPath: "~/.config/opencode/opencode.jsonc",
    fileLabel: "opencode.jsonc",
  },
  {
    id: "claude_code",
    name: "Claude Code",
    logo: "CC",
    winPath: "Terminal",
    macPath: "Terminal",
    fileLabel: "CLI Command",
    isTerminal: true,
  },
];

function buildEnvVars(creds: {
  url: string;
  key: string;
  groq: string;
  openrouter: string;
  gemini: string;
  userId: string;
}) {
  return {
    SUPABASE_URL: creds.url || "<YOUR_SUPABASE_URL>",
    SUPABASE_SERVICE_ROLE_KEY: creds.key || "<YOUR_SUPABASE_SERVICE_ROLE_KEY>",
    GROQ_API_KEY: creds.groq || "<YOUR_GROQ_API_KEY>",
    OPENROUTER_API_KEY: creds.openrouter || "<YOUR_OPENROUTER_API_KEY>",
    GEMINI_API_KEY: creds.gemini || "<YOUR_GEMINI_API_KEY>",
    AETHOS_USER_ID: creds.userId || "<YOUR_USER_ID>",
    AETHOS_PROJECT: "global",
  };
}

function generateJsonSnippet(envVars: Record<string, string>) {
  return JSON.stringify(
    {
      mcpServers: {
        "aethos-memory": {
          command: "uvx",
          args: ["aethos-memory"],
          env: envVars,
        },
      },
    },
    null,
    2
  );
}

function generateOpenCodeSnippet(envVars: Record<string, string>) {
  return JSON.stringify(
    {
      $schema: "https://opencode.ai/config.json",
      mcp: {
        "aethos-memory": {
          type: "local",
          command: ["uvx", "aethos-memory"],
          environment: envVars,
        },
      },
    },
    null,
    2
  );
}

function generateClaudeCodeCommand(envVars: Record<string, string>) {
  const envFlags = Object.entries(envVars)
    .map(([k, v]) => `-e ${k}="${v}"`)
    .join(" \\\n  ");
  return `claude mcp add aethos-memory uvx aethos-memory -- \\\n  ${envFlags}`;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SetupPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("claude_desktop");
  const [os, setOs] = useState<"win" | "mac">("win");
  const [copied, setCopied] = useState(false);
  const [creds, setCreds] = useState({
    url: "",
    key: "",
    groq: "",
    openrouter: "",
    gemini: "",
    userId: "",
  });

  useEffect(() => {
    const getCookie = (name: string) => {
      const match = document.cookie.split("; ").find((r) => r.startsWith(`${name}=`));
      return match ? decodeURIComponent(match.split("=")[1]) : "";
    };
    setCreds({
      url: localStorage.getItem("aethos_supabase_url") || getCookie("aethos_supabase_url"),
      key: localStorage.getItem("aethos_supabase_key") || getCookie("aethos_supabase_key"),
      groq: localStorage.getItem("aethos_groq_key") || "",
      openrouter: localStorage.getItem("aethos_openrouter_key") || "",
      gemini: localStorage.getItem("aethos_gemini_key") || "",
      userId: getUserId(),
    });

    // Detect OS
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) setOs("win");
    else setOs("mac");
  }, []);

  const envVars = buildEnvVars(creds);
  const tool = TOOLS.find((t) => t.id === activeTool)!;

  function getSnippet() {
    if (activeTool === "opencode") return generateOpenCodeSnippet(envVars);
    if (activeTool === "claude_code") return generateClaudeCodeCommand(envVars);
    return generateJsonSnippet(envVars);
  }

  const snippet = getSnippet();
  const filePath = os === "win" ? tool.winPath : tool.macPath;
  const filename = tool.fileLabel;

  const allFilled =
    creds.url.startsWith("https://") &&
    creds.key.length > 20;

  function handleCopy() {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleDownload() {
    downloadFile(snippet, filename);
  }

  const completedCount = [creds.url, creds.key, creds.groq, creds.gemini].filter(Boolean).length;

  return (
    <div style={{ maxWidth: "860px" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
          MCP Setup
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Connect Aethos Memory to your AI tools. All credentials are auto-filled from your saved connection.
        </p>
      </div>

      {/* Credential Health Banner */}
      <div
        className="border-subtle"
        style={{
          backgroundColor: allFilled ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
          border: `1px solid ${allFilled ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.25)"}`,
          borderRadius: "6px",
          padding: "0.875rem 1.25rem",
          marginBottom: "1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div
            style={{
              width: "8px", height: "8px", borderRadius: "50%",
              backgroundColor: allFilled ? "#10b981" : "#f59e0b",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: allFilled ? "#10b981" : "#f59e0b" }}>
            {allFilled
              ? "Credentials loaded — your config is ready to copy"
              : `${completedCount}/4 credentials loaded — visit Settings to add missing keys`}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {[
            { label: "SUPABASE_URL", ok: !!creds.url },
            { label: "SERVICE_KEY", ok: !!creds.key },
            { label: "GROQ_API_KEY", ok: !!creds.groq },
            { label: "GEMINI_API_KEY", ok: !!creds.gemini },
          ].map((item) => (
            <span
              key={item.label}
              style={{
                fontSize: "0.6875rem",
                fontFamily: "var(--font-mono)",
                padding: "0.2rem 0.5rem",
                borderRadius: "3px",
                backgroundColor: item.ok ? "rgba(16,185,129,0.12)" : "rgba(100,116,139,0.15)",
                color: item.ok ? "#34d399" : "var(--text-secondary)",
                border: `1px solid ${item.ok ? "rgba(16,185,129,0.25)" : "rgba(100,116,139,0.2)"}`,
              }}
            >
              {item.ok ? "✓" : "✗"} {item.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Tool Selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          <div style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Select Tool
          </div>
          {TOOLS.map((t) => {
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "6px",
                  border: active ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border-color)",
                  backgroundColor: active ? "rgba(16,185,129,0.07)" : "var(--sidebar-bg)",
                  color: active ? "#10b981" : "var(--text-secondary)",
                  fontWeight: active ? 600 : 400,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <span
                  style={{
                    width: "28px", height: "28px",
                    borderRadius: "6px",
                    backgroundColor: active ? "rgba(16,185,129,0.15)" : "rgba(100,116,139,0.12)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: active ? "#10b981" : "var(--text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  {t.logo}
                </span>
                {t.name}
              </button>
            );
          })}
        </div>

        {/* Setup Panel */}
        <div className="bg-surface border-subtle" style={{ borderRadius: "8px", overflow: "hidden" }}>
          {/* Panel Header */}
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}>
            <div>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.125rem" }}>
                {tool.name} Setup
              </h2>
              {!tool.isTerminal && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    File:
                  </span>
                  <code
                    style={{
                      fontSize: "0.6875rem", fontFamily: "var(--font-mono)",
                      color: "#94a3b8", backgroundColor: "rgba(15,23,42,0.5)",
                      padding: "0.2rem 0.5rem", borderRadius: "3px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    {filePath}
                  </code>
                  {/* OS Toggle */}
                  <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--border-color)" }}>
                    {(["win", "mac"] as const).map((o) => (
                      <button
                        key={o}
                        onClick={() => setOs(o)}
                        style={{
                          padding: "0.2rem 0.625rem",
                          fontSize: "0.6875rem",
                          fontFamily: "var(--font-mono)",
                          border: "none",
                          cursor: "pointer",
                          backgroundColor: os === o ? "rgba(16,185,129,0.15)" : "transparent",
                          color: os === o ? "#10b981" : "var(--text-secondary)",
                        }}
                      >
                        {o === "win" ? "Windows" : "macOS"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tool.isTerminal && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.125rem" }}>
                  Run this command in your terminal to register the MCP server.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {!tool.isTerminal && (
                <button
                  onClick={handleDownload}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.5rem 0.875rem",
                    border: "1px solid var(--border-color)",
                    borderRadius: "4px",
                    backgroundColor: "transparent",
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download {filename}
                </button>
              )}
              <button
                onClick={handleCopy}
                style={{
                  display: "flex", alignItems: "center", gap: "0.375rem",
                  padding: "0.5rem 0.875rem",
                  border: "none",
                  borderRadius: "4px",
                  backgroundColor: copied ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.12)",
                  color: "#10b981",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {copied ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy Config
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
              {tool.isTerminal ? (
                <>
                  <Step n={1} text="Copy the command below" />
                  <Step n={2} text="Open your terminal" />
                  <Step n={3} text="Paste and run it" />
                  <Step n={4} text="Restart Claude Code" />
                </>
              ) : (
                <>
                  <Step n={1} text={`Open ${filename}`} />
                  <Step n={2} text="Copy the snippet below" />
                  <Step n={3} text="Paste into the file (merge if file exists)" />
                  <Step n={4} text={`Restart ${tool.name}`} />
                </>
              )}
            </div>
          </div>

          {/* Code Snippet */}
          <div style={{ position: "relative" }}>
            <pre
              style={{
                margin: 0,
                padding: "1.25rem 1.5rem",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                color: "#94a3b8",
                backgroundColor: "var(--bg-color)",
                maxHeight: "360px",
                overflowY: "auto",
                overflowX: "auto",
                whiteSpace: "pre",
                lineHeight: 1.6,
              }}
            >
              {snippet}
            </pre>
          </div>

          {/* Footer Note */}
          <div
            style={{
              padding: "0.875rem 1.5rem",
              borderTop: "1px solid var(--border-color)",
              fontSize: "0.6875rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {tool.isTerminal
              ? "After running, type /mcp in Claude Code to verify the server is connected."
              : `If ${filename} already exists, merge the "mcpServers" key into your existing JSON — don't replace the whole file.`}
          </div>
        </div>
      </div>

      {/* Quick Install Note */}
      <div
        className="border-subtle"
        style={{
          marginTop: "1.5rem",
          padding: "1rem 1.25rem",
          borderRadius: "6px",
          backgroundColor: "rgba(15,23,42,0.4)",
          fontSize: "0.8125rem",
          color: "var(--text-secondary)",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: "1px", flexShrink: 0 }}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>
          <strong style={{ color: "var(--text-primary)" }}>Prerequisites:</strong>{" "}
          Install <code style={{ color: "#34d399", backgroundColor: "rgba(16,185,129,0.15)", padding: "2px 6px", borderRadius: "4px" }}>uv</code> first:{" "}
          <code style={{ color: "#38bdf8", backgroundColor: "rgba(56,189,248,0.15)", padding: "2px 6px", borderRadius: "4px" }}>pip install uv</code> or{" "}
          <code style={{ color: "#38bdf8", backgroundColor: "rgba(56,189,248,0.15)", padding: "2px 6px", borderRadius: "4px" }}>brew install uv</code>.{" "}
          The <code style={{ color: "#34d399", backgroundColor: "rgba(16,185,129,0.15)", padding: "2px 6px", borderRadius: "4px" }}>uvx</code> command auto-downloads{" "}
          <code style={{ color: "#c084fc", backgroundColor: "rgba(192,132,252,0.15)", padding: "2px 6px", borderRadius: "4px" }}>aethos-memory</code> from PyPI on first run — no manual install needed.
        </span>
      </div>
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span
        style={{
          width: "20px", height: "20px",
          borderRadius: "50%",
          backgroundColor: "rgba(16,185,129,0.12)",
          border: "1px solid rgba(16,185,129,0.3)",
          color: "#10b981",
          fontSize: "0.6875rem",
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      <span style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>{text}</span>
    </div>
  );
}
