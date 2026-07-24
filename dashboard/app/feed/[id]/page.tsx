"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

interface MemoryDetail {
  id: string;
  project: string;
  content: string;
  category: "preference" | "decision" | "project_detail" | "other";
  source_tool: string | null;
  created_at: string;
  updated_at: string;
}

export default function MemoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [memory, setMemory] = useState<MemoryDetail | null>(null);
  const [content, setContent] = useState("");
  const [project, setProject] = useState("global");
  const [category, setCategory] = useState<"preference" | "decision" | "project_detail" | "other">("preference");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    supabase
      .from("memories")
      .select("id, project, content, category, source_tool, created_at, updated_at")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setMemory(data as MemoryDetail);
          setContent(data.content);
          setProject(data.project);
          setCategory(data.category);
        }
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    if (!content.trim() || !id) return;

    setSaving(true);
    const { error } = await supabase
      .from("memories")
      .update({
        content: content.trim(),
        project: project,
        category: category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setSaving(false);
    if (!error) {
      router.push("/feed");
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("memories").delete().eq("id", id);
    if (!error) {
      router.push("/feed");
    }
  };

  if (loading) {
    return (
      <div style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", padding: "3rem", textAlign: "center" }}>
        Loading memory detail...
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="bg-surface border-subtle" style={{ padding: "3rem", borderRadius: "6px", textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", marginBottom: "1rem" }}>
          Memory record not found.
        </p>
        <button onClick={() => router.push("/feed")} className="btn-ghost">
          ← Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "680px", margin: "1rem auto" }}>
      <div className="bg-surface border-subtle" style={{ padding: "2rem", borderRadius: "8px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Edit Memory Details</h1>
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>ID: #{memory.id.slice(0, 8)}</span>
              <span>•</span>
              <span style={{ color: "#34d399", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}>
                <div className="pulse-dot" style={{ width: "6px", height: "6px" }} /> Synced to Supabase pgvector
              </span>
            </div>
          </div>
          <button onClick={() => router.push("/feed")} className="btn-ghost" style={{ padding: "0.25rem 0.5rem" }}>
            ✕
          </button>
        </div>

        {/* Section 1: Fact Content */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
            📝 FACT CONTENT
          </label>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            What your AI tools remember about you
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field"
            rows={4}
          />
        </div>

        {/* Section 2: Metadata Attributes */}
        <div style={{ marginBottom: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            ⚙️ METADATA ATTRIBUTES
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                PROJECT TAG
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                SOURCE TOOL
              </label>
              {/* Branded tool badge */}
              {(() => {
                const tool = memory.source_tool;
                const name = (tool || "").toLowerCase().replace(/[\s_-]/g, "");
                const toolMap: Record<string, { label: string; icon: string; bg: string; border: string; color: string }> = {
                  claude:        { label: "Claude",        icon: "✦", bg: "rgba(205,127,50,0.12)", border: "rgba(205,127,50,0.4)",  color: "#e8a44a" },
                  claudedesktop: { label: "Claude Desktop",icon: "✦", bg: "rgba(205,127,50,0.12)", border: "rgba(205,127,50,0.4)",  color: "#e8a44a" },
                  claudecode:    { label: "Claude Code",   icon: "✦", bg: "rgba(205,127,50,0.12)", border: "rgba(205,127,50,0.4)",  color: "#e8a44a" },
                  opencode:      { label: "OpenCode",      icon: "⬡", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.4)",  color: "#a78bfa" },
                  codex:         { label: "Codex",         icon: "◈", bg: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.4)",  color: "#2dd4bf" },
                  antigravity:   { label: "Antigravity",   icon: "⬆", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)",  color: "#34d399" },
                  cursor:        { label: "Cursor",        icon: "⊹", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)",  color: "#60a5fa" },
                  geminicli:     { label: "Gemini CLI",    icon: "◆", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.4)",  color: "#fbbf24" },
                  gemini:        { label: "Gemini",        icon: "◆", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.4)",  color: "#fbbf24" },
                  webdashboard:  { label: "Web Dashboard", icon: "⊞", bg: "rgba(244,114,182,0.12)",border: "rgba(244,114,182,0.4)", color: "#f472b6" },
                  webdashboardintegrationtest: { label: "Web Dashboard", icon: "⊞", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.4)", color: "#f472b6" },
                  mcpclient:     { label: "MCP Client",    icon: "⟡", bg: "rgba(148,163,184,0.12)",border: "rgba(148,163,184,0.4)", color: "#94a3b8" },
                };
                const m = toolMap[name] ?? { label: tool || "Unknown", icon: "○", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", color: "#94a3b8" };
                return (
                  <div style={{ display: "flex", alignItems: "center", backgroundColor: m.bg, border: `1px solid ${m.border}`, color: m.color, padding: "0.5rem 0.75rem", borderRadius: "4px", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600 }}>
                    {m.label}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Category Classification */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
              CATEGORY CLASSIFICATION
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {[
                { label: "Preference", value: "preference" },
                { label: "Decision", value: "decision" },
                { label: "Project Detail", value: "project_detail" },
                { label: "Other", value: "other" },
              ].map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value as any)}
                  style={{
                    backgroundColor: category === cat.value ? "rgba(16, 185, 129, 0.15)" : "var(--bg-color)",
                    border: category === cat.value ? "1px solid #10b981" : "1px solid var(--border-color)",
                    color: category === cat.value ? "#4edea3" : "var(--text-secondary)",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "3px",
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                  }}
                >
                  {category === cat.value ? "✓ " : ""}{cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timestamps */}
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginTop: "0.75rem" }}>
            🕒 Created: {new Date(memory.created_at).toLocaleString()} | Updated: {new Date(memory.updated_at).toLocaleString()}
          </div>
        </div>

        {/* Section 3: Red Alert Delete Box */}
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.06)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <span style={{ color: "#ef4444", fontSize: "1.125rem" }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f87171", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>
                Delete Memory?
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
                This action will purge this fact from vector search and all AI tool context. This cannot be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    backgroundColor: "transparent",
                    border: "1px solid #ef4444",
                    color: "#ef4444",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Delete Memory
                </button>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={handleDelete}
                    style={{
                      backgroundColor: "#ef4444",
                      color: "#fff",
                      border: "none",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-ghost"
                    style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
          <button onClick={() => router.push("/feed")} className="btn-ghost">
            Close Panel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
