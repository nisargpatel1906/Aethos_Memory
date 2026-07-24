"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string>("user-uuid-placeholder");
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    supabaseUrl: "",
    supabaseServiceKey: "",
    groqApiKey: "",
    openrouterApiKey: "",
    geminiApiKey: "",
    aethosProject: "global",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setUserId(data.user.id);
      }
    });
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const generateMcpConfig = () => {
    return {
      mcpServers: {
        "aethos-memory": {
          command: "uvx",
          args: ["aethos-memory"],
          env: {
            SUPABASE_URL: formData.supabaseUrl || "https://your-project.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: formData.supabaseServiceKey || "your-service-role-key",
            GROQ_API_KEY: formData.groqApiKey || "gsk_...",
            OPENROUTER_API_KEY: formData.openrouterApiKey || "sk-or-...",
            GEMINI_API_KEY: formData.geminiApiKey || "AIzaSy...",
            AETHOS_USER_ID: userId,
            AETHOS_PROJECT: formData.aethosProject || "global",
          },
        },
      },
    };
  };

  const jsonSnippet = JSON.stringify(generateMcpConfig(), null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "2rem", maxWidth: "760px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Aethos Memory Setup</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Configure your environment variables to generate your client MCP snippet.
          </p>
        </div>
        <button
          onClick={() => setRawJsonMode(!rawJsonMode)}
          style={{
            background: "none",
            border: "1px solid var(--border-color)",
            color: "var(--text-secondary)",
            padding: "0.5rem 0.875rem",
            borderRadius: "4px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            cursor: "pointer",
          }}
        >
          {rawJsonMode ? "← Guided Wizard" : "Skip to JSON Config"}
        </button>
      </div>

      {rawJsonMode ? (
        /* Raw JSON Config View */
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              claude_desktop_config.json / mcp_settings.json
            </span>
            <button onClick={handleCopy} className="btn-primary" style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}>
              {copied ? "Copied!" : "Copy Snippet"}
            </button>
          </div>
          <pre style={{ backgroundColor: "#0b1326", padding: "1rem", borderRadius: "4px", overflowX: "auto", fontSize: "0.8125rem" }}>
            <code>{jsonSnippet}</code>
          </pre>
        </div>
      ) : (
        /* Step-by-Step Guided Wizard */
        <div className="bg-surface border-subtle" style={{ padding: "2rem", borderRadius: "8px" }}>
          {/* Progress Indicator */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: "4px",
                  borderRadius: "2px",
                  backgroundColor: step >= i ? "#10b981" : "#1e293b",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>

          {step === 1 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Step 1: Supabase Database Setup</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Step 2: Fact Extraction LLM Keys</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    GROQ_API_KEY (Primary Extractor)
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
                    OPENROUTER_API_KEY (Fallback Extractor)
                  </label>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="sk-or-..."
                    value={formData.openrouterApiKey}
                    onChange={(e) => handleChange("openrouterApiKey", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Step 3: Vector Embeddings Provider</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    GEMINI_API_KEY (gemini-embedding-001 - 768 dims)
                  </label>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="AIzaSy..."
                    value={formData.geminiApiKey}
                    onChange={(e) => handleChange("geminiApiKey", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Step 4: Default Project Scope</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    AETHOS_PROJECT
                  </label>
                  <input
                    className="input-field"
                    placeholder="global"
                    value={formData.aethosProject}
                    onChange={(e) => handleChange("aethosProject", e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                    AETHOS_USER_ID (Auto-filled from active Supabase Session)
                  </label>
                  <input className="input-field" value={userId} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} />
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Step 5: Copy MCP Client Snippet</h2>
              <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Paste this configuration into your MCP client (Claude Desktop, Cursor, Claude Code settings):
              </p>
              <pre style={{ backgroundColor: "#0b1326", padding: "1rem", borderRadius: "4px", overflowX: "auto", fontSize: "0.8125rem", marginBottom: "1rem" }}>
                <code>{jsonSnippet}</code>
              </pre>
              <button onClick={handleCopy} className="btn-primary" style={{ width: "100%" }}>
                {copied ? "Copied to Clipboard!" : "Copy MCP Configuration"}
              </button>
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
            {step > 1 ? (
              <button
                onClick={() => setStep(step - 1)}
                style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 5 && (
              <button onClick={() => setStep(step + 1)} className="btn-primary">
                Next Step →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
