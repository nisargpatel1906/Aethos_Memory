"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function SettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("user-uuid-placeholder");
  const [clientType, setClientType] = useState<"claude_desktop" | "cursor" | "claude_code">("claude_desktop");
  const [copied, setCopied] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const [formData, setFormData] = useState({
    supabaseUrl: "",
    supabaseServiceKey: "",
    groqApiKey: "",
    openrouterApiKey: "",
    geminiApiKey: "",
    aethosProject: "global",
  });

  const activeEmbeddingModel = "gemini-embedding-001 (768 dimensions)";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id || "00000000-0000-0000-0000-000000000000");
    });
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    // Credentials are kept in component state only — not persisted to localStorage.
    // Saving API keys/service role keys to localStorage is a security risk.
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const generateConfigSnippet = () => {
    const env = {
      SUPABASE_URL: formData.supabaseUrl || "https://your-project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: formData.supabaseServiceKey || "your-service-role-key",
      GROQ_API_KEY: formData.groqApiKey || "gsk_...",
      OPENROUTER_API_KEY: formData.openrouterApiKey || "sk-or-...",
      GEMINI_API_KEY: formData.geminiApiKey || "AIzaSy...",
      AETHOS_USER_ID: userId,
      AETHOS_PROJECT: formData.aethosProject || "global",
    };

    if (clientType === "claude_code") {
      return `claude mcp add aethos-memory -- uvx aethos-memory \\
  -e SUPABASE_URL="${env.SUPABASE_URL}" \\
  -e SUPABASE_SERVICE_ROLE_KEY="${env.SUPABASE_SERVICE_ROLE_KEY}" \\
  -e GROQ_API_KEY="${env.GROQ_API_KEY}" \\
  -e OPENROUTER_API_KEY="${env.OPENROUTER_API_KEY}" \\
  -e GEMINI_API_KEY="${env.GEMINI_API_KEY}" \\
  -e AETHOS_USER_ID="${env.AETHOS_USER_ID}" \\
  -e AETHOS_PROJECT="${env.AETHOS_PROJECT}"`;
    }

    return JSON.stringify(
      {
        mcpServers: {
          "aethos-memory": {
            command: "uvx",
            args: ["aethos-memory"],
            env: env,
          },
        },
      },
      null,
      2
    );
  };

  const snippetText = generateConfigSnippet();

  const handleCopy = () => {
    navigator.clipboard.writeText(snippetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Settings & Connections</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Manage BYOK API keys, database credentials, and MCP client configurations
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Active System Status Card */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>System Status</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
            <div>
              <span style={{ color: "var(--text-secondary)", display: "block" }}>ACTIVE EMBEDDING MODEL</span>
              <strong style={{ color: "#10b981" }}>{activeEmbeddingModel}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-secondary)", display: "block" }}>EXTRACTION PROVIDERS</span>
              <strong style={{ color: "var(--text-primary)" }}>Groq (Primary) → OpenRouter (Fallback)</strong>
            </div>
          </div>
        </div>

        {/* BYOK Credentials Form */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Credentials & Connection Keys</h2>

          <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                SUPABASE_URL
              </label>
              <input
                className="input-field"
                placeholder="https://your-project.supabase.co"
                value={formData.supabaseUrl}
                onChange={(e) => handleChange("supabaseUrl", e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                SUPABASE_SERVICE_ROLE_KEY
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="eyJh..."
                value={formData.supabaseServiceKey}
                onChange={(e) => handleChange("supabaseServiceKey", e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                GROQ_API_KEY
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="gsk_..."
                value={formData.groqApiKey}
                onChange={(e) => handleChange("groqApiKey", e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                OPENROUTER_API_KEY
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="sk-or-..."
                value={formData.openrouterApiKey}
                onChange={(e) => handleChange("openrouterApiKey", e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                GEMINI_API_KEY
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="AIzaSy..."
                value={formData.geminiApiKey}
                onChange={(e) => handleChange("geminiApiKey", e.target.value)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
              <button type="submit" className="btn-primary">
                Apply to Snippet Generator
              </button>
              {savedMessage && <span style={{ color: "#10b981", fontSize: "0.875rem" }}>Applied! Snippet updated below.</span>}
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                (values are session-only — not saved to browser storage)
              </span>
            </div>
          </form>
        </div>

        {/* Regenerable MCP Client Snippet Generator */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>MCP Client Config Generator</h2>

            {/* Target Client Selector */}
            <select
              className="input-field"
              style={{ width: "auto", fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
              value={clientType}
              onChange={(e: any) => setClientType(e.target.value)}
            >
              <option value="claude_desktop">Claude Desktop / JSON Config</option>
              <option value="cursor">Cursor MCP Config</option>
              <option value="claude_code">Claude Code CLI Command</option>
            </select>
          </div>

          <pre style={{ backgroundColor: "#0b1326", padding: "1rem", borderRadius: "4px", overflowX: "auto", fontSize: "0.8125rem", marginBottom: "1rem" }}>
            <code>{snippetText}</code>
          </pre>

          <button onClick={handleCopy} className="btn-primary" style={{ width: "100%" }}>
            {copied ? "Copied to Clipboard!" : "Copy Generated Config Snippet"}
          </button>
        </div>
      </div>
    </div>
  );
}
