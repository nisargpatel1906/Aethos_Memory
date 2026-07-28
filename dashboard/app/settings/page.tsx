"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase, getUserId, saveCredentials, clearCredentials } from "../../lib/supabaseClient";

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [clientType, setClientType] = useState<"claude_desktop" | "claude_code" | "cursor" | "gemini_cli">("claude_desktop");
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [pingTime, setPingTime] = useState<number | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const [formData, setFormData] = useState({
    supabaseUrl: "",
    supabaseServiceKey: "",
    groqApiKey: "",
    openrouterApiKey: "",
    geminiApiKey: "",
    aethosProject: "global",
  });



  useEffect(() => {
    // Read credentials: localStorage first, then cookies as fallback
    const getCookie = (name: string) => {
      const match = document.cookie.split("; ").find((r) => r.startsWith(`${name}=`));
      return match ? decodeURIComponent(match.split("=")[1]) : "";
    };
    setUserId(getUserId());
    setFormData((prev) => ({
      ...prev,
      supabaseUrl: localStorage.getItem("aethos_supabase_url") || getCookie("aethos_supabase_url") || "",
      supabaseServiceKey: localStorage.getItem("aethos_supabase_key") || getCookie("aethos_supabase_key") || "",
      groqApiKey: localStorage.getItem("aethos_groq_key") || "",
      geminiApiKey: localStorage.getItem("aethos_gemini_key") || "",
      aethosProject: localStorage.getItem("aethos_project") || "global",
    }));
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTestConnection = async () => {
    const start = Date.now();
    const { error } = await getSupabase().from("memories").select("id").limit(1);
    const duration = Date.now() - start;
    if (!error) {
      setPingTime(duration);
      alert(`Supabase Connection Successful! Ping: ${duration}ms`);
    } else {
      alert(`Connection Error: ${error.message}`);
    }
  };

  const handleSaveApiKeys = () => {
    // Persist each key to localStorage so they survive page refresh
    if (formData.groqApiKey)     localStorage.setItem("aethos_groq_key",     formData.groqApiKey);
    if (formData.geminiApiKey)   localStorage.setItem("aethos_gemini_key",   formData.geminiApiKey);
    if (formData.openrouterApiKey) localStorage.setItem("aethos_openrouter_key", formData.openrouterApiKey);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleSaveConnection = () => {
    saveCredentials(formData.supabaseUrl, formData.supabaseServiceKey, userId);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleDisconnect = () => {
    setDisconnecting(true);
    clearCredentials();
    setTimeout(() => router.replace("/connect"), 600);
  };

  const [revealSecrets, setRevealSecrets] = useState(false);

  const generateMcpConfig = () => {
    const envVars = {
      SUPABASE_URL: (revealSecrets && formData.supabaseUrl) ? formData.supabaseUrl : "<YOUR_SUPABASE_URL>",
      SUPABASE_SERVICE_ROLE_KEY: (revealSecrets && formData.supabaseServiceKey) ? formData.supabaseServiceKey : "<YOUR_SUPABASE_SERVICE_ROLE_KEY>",
      GROQ_API_KEY: (revealSecrets && formData.groqApiKey) ? formData.groqApiKey : "<YOUR_GROQ_API_KEY>",
      OPENROUTER_API_KEY: (revealSecrets && formData.openrouterApiKey) ? formData.openrouterApiKey : "<YOUR_OPENROUTER_API_KEY>",
      GEMINI_API_KEY: (revealSecrets && formData.geminiApiKey) ? formData.geminiApiKey : "<YOUR_GEMINI_API_KEY>",
      AETHOS_USER_ID: (revealSecrets && userId) ? userId : "<YOUR_AETHOS_USER_ID>",
      AETHOS_PROJECT: formData.aethosProject || "global",
    };

    if (clientType === "cursor") {
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

    if (clientType === "claude_code") {
      return `claude mcp add aethos-memory uvx aethos-memory -- \\
  -e SUPABASE_URL="${envVars.SUPABASE_URL}" \\
  -e SUPABASE_SERVICE_ROLE_KEY="${envVars.SUPABASE_SERVICE_ROLE_KEY}" \\
  -e GROQ_API_KEY="${envVars.GROQ_API_KEY}" \\
  -e GEMINI_API_KEY="${envVars.GEMINI_API_KEY}" \\
  -e AETHOS_USER_ID="${envVars.AETHOS_USER_ID}" \\
  -e AETHOS_PROJECT="${envVars.AETHOS_PROJECT}"`;
    }

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
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateMcpConfig());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: "1050px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Settings & Connections</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          Manage your self-hosted Supabase database, BYOK API keys, and MCP client config.
        </p>
      </div>

      {/* Grid Settings Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Card 1: Supabase Connection */}
          <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Supabase Connection</h3>
              </div>
              <span className="badge-category badge-preference">
                <div className="pulse-dot" style={{ width: "6px", height: "6px" }} />
                {pingTime !== null ? `Connected • Ping ${pingTime}ms` : "Connected • Not tested"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                  PROJECT URL
                </label>
                <input
                  type="text"
                  value={formData.supabaseUrl}
                  onChange={(e) => handleChange("supabaseUrl", e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                  SERVICE ROLE / ANON KEY
                </label>
                <input
                  type="password"
                  value={formData.supabaseServiceKey}
                  onChange={(e) => handleChange("supabaseServiceKey", e.target.value)}
                  className="input-field"
                />
              </div>

              <button onClick={handleTestConnection} className="btn-ghost" style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}>
                Test Connection
              </button>
              <button
                onClick={handleSaveConnection}
                className="btn-primary"
                style={{ alignSelf: "flex-start", marginTop: "0.25rem" }}
              >
                Save Connection
              </button>
              {savedMessage && (
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#34d399" }}>
                  ✓ Credentials saved to localStorage + cookie (365 days).
                </div>
              )}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                style={{
                  alignSelf: "flex-start",
                  marginTop: "0.5rem",
                  background: "none",
                  border: "1px solid rgba(239,68,68,0.4)",
                  color: "#f87171",
                  padding: "0.375rem 0.75rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  opacity: disconnecting ? 0.5 : 1,
                }}
              >
                {disconnecting ? "Clearing…" : "Disconnect & Reset"}
              </button>
            </div>
          </div>

          {/* Card 2: Vector Storage & Embeddings */}
          <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Vector Storage & Embeddings</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ backgroundColor: "var(--bg-color)", padding: "1rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  ACTIVE MODEL
                </div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "#4edea3", fontWeight: 600 }}>
                  gemini-embedding-001
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>(768 dims)</div>
              </div>

              <div style={{ backgroundColor: "var(--bg-color)", padding: "1rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}>
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  STORAGE STATS
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>3</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Total Memories Embedded</div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                <span>Storage Capacity</span>
                <span>12%</span>
              </div>
              <div style={{ height: "6px", backgroundColor: "var(--border-color)", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ width: "12%", height: "100%", backgroundColor: "#10b981" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Card 3: AI Provider API Keys */}
          <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-1.5 1.5l-3 3m-5 5a6 6 0 1 1 8.5-8.5l-8.5 8.5v3h3l1.5-1.5z"/>
              </svg>
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>AI Provider API Keys (BYOK)</h3>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Keys are stored locally in your client environment variables and never transmitted outside your network.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                  GROQ_API_KEY
                </label>
                <input
                  type="password"
                  value={formData.groqApiKey}
                  onChange={(e) => handleChange("groqApiKey", e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                  OPENROUTER_API_KEY
                </label>
                <input
                  type="password"
                  value={formData.openrouterApiKey}
                  onChange={(e) => handleChange("openrouterApiKey", e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                  GEMINI_API_KEY
                </label>
                <input
                  type="password"
                  value={formData.geminiApiKey}
                  onChange={(e) => handleChange("geminiApiKey", e.target.value)}
                  className="input-field"
                />
              </div>

              <button
                onClick={handleSaveApiKeys}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                Save API Keys
              </button>

              {savedMessage && (
                <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#34d399", textAlign: "center" }}>
                  ✓ Keys updated for session configuration.
                </div>
              )}
            </div>
          </div>

          {/* Card 4: MCP Config Snippet Generator */}
          <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>MCP Config Snippet Generator</h3>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Paste this snippet into your MCP client config file to enable silent memory syncing.
            </p>

            {/* Client Tabs */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem" }}>
              {[
                { label: "Claude Desktop", value: "claude_desktop" },
                { label: "Claude Code", value: "claude_code" },
                { label: "Cursor", value: "cursor" },
                { label: "Gemini CLI", value: "gemini_cli" },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setClientType(tab.value as any)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: clientType === tab.value ? "2px solid #10b981" : "2px solid transparent",
                    color: clientType === tab.value ? "#10b981" : "var(--text-secondary)",
                    fontWeight: clientType === tab.value ? 600 : 400,
                    padding: "0.375rem 0.5rem",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code Box */}
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <pre
                style={{
                  backgroundColor: "var(--bg-color)",
                  border: "1px solid var(--border-color)",
                  padding: "1rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  color: "#94a3b8",
                  maxHeight: "220px",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                }}
              >
                {generateMcpConfig()}
              </pre>
              <button
                onClick={() => setRevealSecrets(!revealSecrets)}
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "4.5rem",
                  backgroundColor: "rgba(15, 23, 42, 0.8)",
                  border: `1px solid ${revealSecrets ? "rgba(245,158,11,0.4)" : "var(--border-color)"}`,
                  color: revealSecrets ? "#f59e0b" : "var(--text-secondary)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
                title="Toggle displaying actual local keys vs safe placeholders in config snippet"
              >
                {revealSecrets ? (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Mask Secrets
                  </>
                ) : (
                  <>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Fill Keys
                  </>
                )}
              </button>
              <button
                onClick={copyToClipboard}
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "0.5rem",
                  backgroundColor: "#15203b",
                  border: "1px solid var(--border-color)",
                  color: copied ? "#34d399" : "var(--text-primary)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>

            <div
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                padding: "0.75rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                color: "#60a5fa",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>ℹ️</span> Restart your MCP client application after updating the configuration file to apply changes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
