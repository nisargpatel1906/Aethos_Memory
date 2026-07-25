"use client";

import React, { useState, useEffect } from "react";
import { getUserId } from "../../lib/supabaseClient";

type CategoryId = "cli" | "ides" | "extensions" | "builders";

type ToolId =
  // CLI & Terminal
  | "claude_code"
  | "codex_cli"
  | "gemini_cli"
  | "aider"
  | "opencode"
  | "goose"
  | "openhands"
  // IDEs
  | "claude_desktop"
  | "cursor"
  | "windsurf"
  | "zed"
  | "replit"
  | "antigravity"
  // VS Code Extensions
  | "cline"
  | "continue_dev"
  | "kilo_code"
  | "roo_code"
  // Web Builders & Workspaces
  | "lovable"
  | "bolt"
  | "v0"
  | "devin"
  | "librechat";

interface Tool {
  id: ToolId;
  name: string;
  category: CategoryId;
  categoryName: string;
  logo: string;
  isOpenSource?: boolean;
  winPath: string;
  macPath: string;
  fileLabel: string;
  isTerminal?: boolean;
  note?: string;
  format?: "json" | "opencode" | "zed" | "yaml" | "toml" | "cli" | "env";
}

const TOOLS: Tool[] = [
  // --- CLI & Terminal Tools ---
  {
    id: "claude_code",
    name: "Claude Code",
    category: "cli",
    categoryName: "CLI & Terminal",
    logo: "CC",
    winPath: "Terminal",
    macPath: "Terminal",
    fileLabel: "CLI Command",
    isTerminal: true,
    format: "cli",
  },
  {
    id: "codex_cli",
    name: "OpenAI Codex CLI",
    category: "cli",
    categoryName: "CLI & Terminal",
    logo: "CX",
    winPath: "%USERPROFILE%\\.codex\\config.json",
    macPath: "~/.codex/config.json",
    fileLabel: "config.json",
    format: "json",
  },
  {
    id: "gemini_cli",
    name: "Gemini CLI",
    category: "cli",
    categoryName: "CLI & Terminal",
    logo: "G",
    isOpenSource: true,
    winPath: "%USERPROFILE%\\.gemini\\config.json",
    macPath: "~/.gemini/config.json",
    fileLabel: "config.json",
    format: "json",
  },
  {
    id: "aider",
    name: "Aider",
    category: "cli",
    categoryName: "CLI & Terminal",
    logo: "A",
    isOpenSource: true,
    winPath: "%USERPROFILE%\\.aider.conf.yml",
    macPath: "~/.aider.conf.yml",
    fileLabel: ".aider.conf.yml",
    note: "MCP support is via community bridge/wrapper",
    format: "yaml",
  },
  {
    id: "opencode",
    name: "OpenCode",
    category: "cli",
    categoryName: "CLI & Terminal",
    logo: "O",
    isOpenSource: true,
    winPath: "%USERPROFILE%\\.config\\opencode\\opencode.jsonc",
    macPath: "~/.config/opencode/opencode.jsonc",
    fileLabel: "opencode.jsonc",
    format: "opencode",
  },
  {
    id: "goose",
    name: "Goose CLI",
    category: "cli",
    categoryName: "CLI & Terminal",
    logo: "GS",
    isOpenSource: true,
    winPath: "%USERPROFILE%\\.config\\goose\\config.yaml",
    macPath: "~/.config/goose/config.yaml",
    fileLabel: "config.yaml",
    format: "yaml",
  },
  {
    id: "openhands",
    name: "OpenHands",
    category: "cli",
    categoryName: "CLI & Terminal",
    logo: "OH",
    isOpenSource: true,
    winPath: "%USERPROFILE%\\.openhands\\config.toml",
    macPath: "~/.openhands/config.toml",
    fileLabel: "config.toml",
    format: "toml",
  },

  // --- IDEs & Desktop Editors ---
  {
    id: "claude_desktop",
    name: "Claude Desktop",
    category: "ides",
    categoryName: "IDEs & Desktop",
    logo: "C",
    winPath: "%APPDATA%\\Claude\\claude_desktop_config.json",
    macPath: "~/Library/Application Support/Claude/claude_desktop_config.json",
    fileLabel: "claude_desktop_config.json",
    format: "json",
  },
  {
    id: "cursor",
    name: "Cursor",
    category: "ides",
    categoryName: "IDEs & Desktop",
    logo: "⌘",
    winPath: "%USERPROFILE%\\.cursor\\mcp.json",
    macPath: "~/.cursor/mcp.json",
    fileLabel: "mcp.json",
    format: "json",
  },
  {
    id: "windsurf",
    name: "Windsurf IDE",
    category: "ides",
    categoryName: "IDEs & Desktop",
    logo: "W",
    winPath: "%USERPROFILE%\\.codeium\\windsurf\\mcp_config.json",
    macPath: "~/.codeium/windsurf/mcp_config.json",
    fileLabel: "mcp_config.json",
    format: "json",
  },
  {
    id: "zed",
    name: "Zed Editor",
    category: "ides",
    categoryName: "IDEs & Desktop",
    logo: "Z",
    isOpenSource: true,
    winPath: "%APPDATA%\\Zed\\settings.json",
    macPath: "~/.config/zed/settings.json",
    fileLabel: "settings.json",
    format: "zed",
  },
  {
    id: "replit",
    name: "Replit Agent",
    category: "ides",
    categoryName: "IDEs & Desktop",
    logo: "RP",
    winPath: ".replit",
    macPath: ".replit",
    fileLabel: ".replit",
    format: "toml",
  },
  {
    id: "antigravity",
    name: "Google Antigravity",
    category: "ides",
    categoryName: "IDEs & Desktop",
    logo: "AG",
    winPath: "%USERPROFILE%\\.gemini\\antigravity-ide\\mcp\\aethos-memory\\mcp.json",
    macPath: "~/.gemini/antigravity-ide/mcp/aethos-memory/mcp.json",
    fileLabel: "mcp.json",
    format: "json",
  },

  // --- VS Code Extensions ---
  {
    id: "cline",
    name: "Cline",
    category: "extensions",
    categoryName: "VS Code Extensions",
    logo: "CL",
    isOpenSource: true,
    winPath: "%APPDATA%\\Code\\User\\globalStorage\\saoudrizwan.claude-dev\\settings\\cline_mcp_settings.json",
    macPath: "~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
    fileLabel: "cline_mcp_settings.json",
    format: "json",
  },
  {
    id: "continue_dev",
    name: "Continue.dev",
    category: "extensions",
    categoryName: "VS Code Extensions",
    logo: "▶",
    isOpenSource: true,
    winPath: "%USERPROFILE%\\.continue\\config.json",
    macPath: "~/.continue/config.json",
    fileLabel: "config.json",
    format: "json",
  },
  {
    id: "kilo_code",
    name: "Kilo Code",
    category: "extensions",
    categoryName: "VS Code Extensions",
    logo: "K",
    isOpenSource: true,
    winPath: "%USERPROFILE%\\.kilo\\mcp.json",
    macPath: "~/.kilo/mcp.json",
    fileLabel: "mcp.json",
    format: "json",
  },
  {
    id: "roo_code",
    name: "Roo Code (Deprecated)",
    category: "extensions",
    categoryName: "VS Code Extensions",
    logo: "R",
    isOpenSource: true,
    winPath: "%APPDATA%\\Code\\User\\globalStorage\\rooveterinaryinc.roo-cline\\settings\\cline_mcp_settings.json",
    macPath: "~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json",
    fileLabel: "cline_mcp_settings.json",
    note: "Roo Code shut down on May 15, 2026. Use Cline or Roomote for new setups.",
    format: "json",
  },

  // --- App Builders & Web Platforms ---
  {
    id: "lovable",
    name: "Lovable",
    category: "builders",
    categoryName: "Web & App Builders",
    logo: "L",
    winPath: ".lovable\\mcp.json",
    macPath: ".lovable/mcp.json",
    fileLabel: "mcp.json",
    format: "json",
  },
  {
    id: "bolt",
    name: "Bolt.new / Bolt.diy",
    category: "builders",
    categoryName: "Web & App Builders",
    logo: "B",
    isOpenSource: true,
    winPath: ".bolt\\mcp.json",
    macPath: ".bolt/mcp.json",
    fileLabel: "mcp.json",
    format: "json",
  },
  {
    id: "v0",
    name: "v0 (Vercel)",
    category: "builders",
    categoryName: "Web & App Builders",
    logo: "V0",
    winPath: "v0.json",
    macPath: "v0.json",
    fileLabel: "v0.json",
    format: "json",
  },
  {
    id: "devin",
    name: "Devin",
    category: "builders",
    categoryName: "Web & App Builders",
    logo: "D",
    winPath: ".devin\\mcp.json",
    macPath: ".devin/mcp.json",
    fileLabel: "mcp.json",
    format: "json",
  },
  {
    id: "librechat",
    name: "LibreChat",
    category: "builders",
    categoryName: "Web & App Builders",
    logo: "LC",
    isOpenSource: true,
    winPath: "%USERPROFILE%\\LibreChat\\librechat.yaml",
    macPath: "~/LibreChat/librechat.yaml",
    fileLabel: "librechat.yaml",
    format: "yaml",
  },
];

function buildEnvVars(
  creds: {
    url: string;
    key: string;
    groq: string;
    openrouter: string;
    gemini: string;
    userId: string;
  },
  toolName?: string
) {
  return {
    SUPABASE_URL: creds.url || "<YOUR_SUPABASE_URL>",
    SUPABASE_SERVICE_ROLE_KEY: creds.key || "<YOUR_SUPABASE_SERVICE_ROLE_KEY>",
    GROQ_API_KEY: creds.groq || "<YOUR_GROQ_API_KEY>",
    OPENROUTER_API_KEY: creds.openrouter || "<YOUR_OPENROUTER_API_KEY>",
    GEMINI_API_KEY: creds.gemini || "<YOUR_GEMINI_API_KEY>",
    AETHOS_USER_ID: creds.userId || "<YOUR_USER_ID>",
    AETHOS_PROJECT: "global",
    AETHOS_SOURCE_TOOL: toolName || "MCP Client",
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

function generateZedSnippet(envVars: Record<string, string>) {
  return JSON.stringify(
    {
      context_servers: {
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

function generateYamlSnippet(envVars: Record<string, string>) {
  const envYaml = Object.entries(envVars)
    .map(([k, v]) => `        ${k}: "${v}"`)
    .join("\n");
  return `mcpServers:
  aethos-memory:
    type: stdio
    command: uvx
    args:
      - aethos-memory
    env:
${envYaml}`;
}

function generateTomlSnippet(envVars: Record<string, string>) {
  const envToml = Object.entries(envVars)
    .map(([k, v]) => `${k} = "${v}"`)
    .join("\n");
  return `[mcpServers.aethos-memory]
command = "uvx"
args = ["aethos-memory"]

[mcpServers.aethos-memory.env]
${envToml}`;
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
  const [activeCategory, setActiveCategory] = useState<CategoryId>("ides");
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

    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) setOs("win");
    else setOs("mac");
  }, []);

  const tool = TOOLS.find((t) => t.id === activeTool)!;
  const envVars = buildEnvVars(creds, tool?.name);

  function getSnippet() {
    if (tool.format === "cli") return generateClaudeCodeCommand(envVars);
    if (tool.format === "opencode") return generateOpenCodeSnippet(envVars);
    if (tool.format === "zed") return generateZedSnippet(envVars);
    if (tool.format === "yaml") return generateYamlSnippet(envVars);
    if (tool.format === "toml") return generateTomlSnippet(envVars);
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

  const categories: { id: CategoryId; name: string; count: number }[] = [
    { id: "ides", name: "IDEs & Desktop", count: TOOLS.filter((t) => t.category === "ides").length },
    { id: "cli", name: "CLI & Terminal", count: TOOLS.filter((t) => t.category === "cli").length },
    { id: "extensions", name: "VS Code Extensions", count: TOOLS.filter((t) => t.category === "extensions").length },
    { id: "builders", name: "Web & App Builders", count: TOOLS.filter((t) => t.category === "builders").length },
  ];

  const categoryTools = TOOLS.filter((t) => t.category === activeCategory);

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "0.25rem" }}>
          MCP Setup & Integrations
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Connect Aethos Memory to your favorite AI coding agents, IDEs, CLI tools, and web app builders.
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
          marginBottom: "1.5rem",
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
              ? "Credentials loaded — your config snippets are ready to copy"
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

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.75rem", flexWrap: "wrap" }}>
        {categories.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                const firstInCat = TOOLS.find((t) => t.category === cat.id);
                if (firstInCat) setActiveTool(firstInCat.id);
              }}
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: "6px",
                border: active ? "1px solid rgba(16,185,129,0.3)" : "1px solid transparent",
                backgroundColor: active ? "rgba(16,185,129,0.1)" : "transparent",
                color: active ? "#10b981" : "var(--text-secondary)",
                fontWeight: active ? 600 : 400,
                fontSize: "0.8125rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.15s ease",
              }}
            >
              {cat.name}
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontFamily: "var(--font-mono)",
                  padding: "0.1rem 0.375rem",
                  borderRadius: "10px",
                  backgroundColor: active ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.1)",
                  color: active ? "#34d399" : "var(--text-secondary)",
                }}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Tool List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {categoryTools.map((t) => {
            const active = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 0.875rem",
                  borderRadius: "6px",
                  border: active ? "1px solid rgba(16,185,129,0.35)" : "1px solid var(--border-color)",
                  backgroundColor: active ? "rgba(16,185,129,0.07)" : "var(--sidebar-bg)",
                  color: active ? "#10b981" : "var(--text-secondary)",
                  fontWeight: active ? 600 : 400,
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <span
                    style={{
                      width: "26px", height: "26px",
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
                </div>
                {t.isOpenSource && (
                  <span
                    style={{
                      fontSize: "0.625rem",
                      fontFamily: "var(--font-mono)",
                      color: "#60a5fa",
                      backgroundColor: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "3px",
                    }}
                  >
                    OSS
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Setup Configuration Panel */}
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.125rem" }}>
                  {tool.name} Setup
                </h2>
                {tool.isOpenSource && (
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono)",
                      color: "#60a5fa",
                      backgroundColor: "rgba(59,130,246,0.12)",
                      border: "1px solid rgba(59,130,246,0.3)",
                      padding: "0.15rem 0.4rem",
                      borderRadius: "3px",
                    }}
                  >
                    Open Source
                  </span>
                )}
              </div>
              {!tool.isTerminal && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                  <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    Config Path:
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
            </div>

            {/* Actions */}
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
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                }}
              >
                {copied ? "✓ Copied!" : "Copy Config"}
              </button>
            </div>
          </div>

          {/* Deprecation / Community Note Banner if present */}
          {tool.note && (
            <div
              style={{
                backgroundColor: tool.id === "roo_code" ? "rgba(239,68,68,0.08)" : "rgba(59,130,246,0.08)",
                borderBottom: `1px solid ${tool.id === "roo_code" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)"}`,
                padding: "0.75rem 1.5rem",
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                color: tool.id === "roo_code" ? "#f87171" : "#60a5fa",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>{tool.id === "roo_code" ? "⚠️ Notice:" : "ℹ️ Note:"}</span> {tool.note}
            </div>
          )}

          {/* Steps */}
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
              {tool.isTerminal ? (
                <>
                  <Step n={1} text="Copy the CLI command below" />
                  <Step n={2} text="Open your terminal" />
                  <Step n={3} text="Paste and execute" />
                  <Step n={4} text={`Restart ${tool.name}`} />
                </>
              ) : (
                <>
                  <Step n={1} text={`Open ${filename}`} />
                  <Step n={2} text="Copy the snippet below" />
                  <Step n={3} text="Merge into configuration" />
                  <Step n={4} text={`Restart ${tool.name}`} />
                </>
              )}
            </div>
          </div>

          {/* Code Snippet Display */}
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
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {tool.isTerminal
              ? `Execute in terminal where ${tool.name} is active.`
              : `If ${filename} already exists, merge the MCP server entry into your existing config file.`}
          </div>
        </div>
      </div>

      {/* Prerequisites Note */}
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" style={{ marginTop: "1px", flexShrink: 0 }}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
        <span>
          <strong style={{ color: "var(--text-primary)" }}>Prerequisites:</strong>{" "}
          Install <code style={{ color: "#34d399", backgroundColor: "rgba(16,185,129,0.15)", padding: "2px 6px", borderRadius: "4px" }}>uv</code> first:{" "}
          <code style={{ color: "#38bdf8", backgroundColor: "rgba(56,189,248,0.15)", padding: "2px 6px", borderRadius: "4px" }}>pip install uv</code> or{" "}
          <code style={{ color: "#38bdf8", backgroundColor: "rgba(56,189,248,0.15)", padding: "2px 6px", borderRadius: "4px" }}>brew install uv</code>.{" "}
          The <code style={{ color: "#34d399", backgroundColor: "rgba(16,185,129,0.15)", padding: "2px 6px", borderRadius: "4px" }}>uvx</code> runner auto-downloads{" "}
          <code style={{ color: "#c084fc", backgroundColor: "rgba(192,132,252,0.15)", padding: "2px 6px", borderRadius: "4px" }}>aethos-memory</code> from PyPI automatically on first run.
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
