"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase, getUserId } from "../../lib/supabaseClient";
import SetupBanner from "../components/SetupBanner";

interface Memory {
  id: string;
  project: string;
  content: string;
  category: "preference" | "decision" | "project_detail" | "other";
  source_tool: string | null;
  created_at: string;
  updated_at: string;
}

function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get("project") || "ALL");
  const [selectedSourceTool, setSelectedSourceTool] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [quickAddContent, setQuickAddContent] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);

  // Sync searchParams reactively when URL changes
  useEffect(() => {
    const q = searchParams.get("q");
    const proj = searchParams.get("project");
    if (q !== null) setSearchQuery(q);
    if (proj !== null) setSelectedProject(proj);
  }, [searchParams]);

  // Fetch Memories directly via Supabase client (uses localStorage credentials)
  const fetchMemories = async () => {
    setLoading(true);
    try {
      const db = getSupabase();
      const { data, error } = await db
        .from("memories")
        .select("id, project, content, category, source_tool, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setMemories(data as Memory[]);
      }
    } catch (e) {
      console.error("Failed to fetch memories:", e);
    }
    setLoading(false);
  };

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !quickAddContent.trim()) return;
    setQuickAdding(true);
    const text = quickAddContent.trim();
    setQuickAddContent("");

    try {
      const res = await fetch("/api/reembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const { embedding } = await res.json();

      await getSupabase().from("memories").insert({
        user_id: getUserId(),
        project: selectedProject !== "ALL" ? selectedProject : "global",
        content: text,
        embedding: embedding || null,
        category: "other",
        source_tool: "Web Dashboard",
      });

      fetchMemories();
    } catch {
      // silently fail
    }
    setQuickAdding(false);
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  // Compute filtered memories instantly using useMemo (zero extra re-renders)
  const filteredMemories = useMemo(() => {
    let result = memories;

    if (selectedProject !== "ALL") {
      result = result.filter((m) => m.project === selectedProject);
    }

    if (selectedSourceTool !== "ALL") {
      result = result.filter((m) => (m.source_tool || "unknown") === selectedSourceTool);
    }

    if (selectedCategory !== "ALL") {
      result = result.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          m.project.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedProject, selectedSourceTool, selectedCategory, searchQuery, memories]);

  const handleEditSave = async (id: string) => {
    if (!editContent.trim()) return;
    const { error } = await getSupabase()
      .from("memories")
      .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) { setEditingId(null); fetchMemories(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await getSupabase().from("memories").delete().eq("id", id);
    if (!error) {
      setDeleteConfirmId(null);
      fetchMemories();
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "preference":
        return <span className="badge-category badge-preference">Preference</span>;
      case "decision":
        return <span className="badge-category badge-decision">Decision</span>;
      case "project_detail":
        return <span className="badge-category badge-detail">Project Detail</span>;
      default:
        return <span className="badge-category badge-other">Other</span>;
    }
  };

  const getToolBadge = (tool: string | null) => {
    const name = (tool || "").toLowerCase().replace(/[\s_-]/g, "");

    const toolMap: Record<string, { label: string; bg: string; border: string; color: string }> = {
      claude:           { label: "Claude",        bg: "rgba(205,127,50,0.12)",  border: "rgba(205,127,50,0.4)",  color: "#e8a44a" },
      claudedesktop:    { label: "Claude Desktop", bg: "rgba(205,127,50,0.12)",  border: "rgba(205,127,50,0.4)",  color: "#e8a44a" },
      claudecode:       { label: "Claude Code",   bg: "rgba(205,127,50,0.12)",  border: "rgba(205,127,50,0.4)",  color: "#e8a44a" },
      opencode:         { label: "OpenCode",      bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.4)",  color: "#a78bfa" },
      codex:            { label: "Codex",         bg: "rgba(20,184,166,0.12)",  border: "rgba(20,184,166,0.4)",  color: "#2dd4bf" },
      antigravity:      { label: "Antigravity",   bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.4)",  color: "#34d399" },
      cursor:           { label: "Cursor",        bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.4)",  color: "#60a5fa" },
      geminicli:        { label: "Gemini CLI",    bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.4)",  color: "#fbbf24" },
      gemini:           { label: "Gemini",        bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.4)",  color: "#fbbf24" },
      webdashboard:     { label: "Web Dashboard", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.4)", color: "#f472b6" },
      webdashboardintegrationtest: { label: "Web Dashboard", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.4)", color: "#f472b6" },
      mcpclient:        { label: "MCP Client",    bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.4)", color: "#94a3b8" },
    };

    const match = toolMap[name] ?? { label: tool || "Unknown", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", color: "#94a3b8" };

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          backgroundColor: match.bg,
          border: `1px solid ${match.border}`,
          color: match.color,
          fontFamily: "var(--font-mono)",
          fontSize: "0.7rem",
          fontWeight: 600,
          padding: "0.15rem 0.5rem",
          borderRadius: "3px",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {match.label}
      </span>
    );
  };

  const formatRelativeTime = (isoString: string) => {
    const now = new Date();
    const date = new Date(isoString);
    const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const uniqueProjects = Array.from(new Set(memories.map((m) => m.project)));
  const uniqueTools = Array.from(new Set(memories.map((m) => m.source_tool || "unknown")));

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Setup banner for new users */}
      <SetupBanner memoryCount={memories.length} />

      {/* Filter Control Header Bar */}
      <div
        className="bg-surface border-subtle"
        style={{
          padding: "0.875rem 1.25rem",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        {/* Project Dropdown */}
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="input-field"
          style={{ width: "auto", minWidth: "160px" }}
        >
          <option value="ALL">All Projects</option>
          {uniqueProjects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Tools Dropdown */}
        <select
          value={selectedSourceTool}
          onChange={(e) => setSelectedSourceTool(e.target.value)}
          className="input-field"
          style={{ width: "auto", minWidth: "160px" }}
        >
          <option value="ALL">All Tools</option>
          {uniqueTools.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <div style={{ width: "1px", height: "24px", backgroundColor: "var(--border-color)" }} />

        {/* Category Pills */}
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {[
            { label: "All", value: "ALL" },
            { label: "Preference", value: "preference" },
            { label: "Decision", value: "decision" },
            { label: "Project Detail", value: "project_detail" },
            { label: "Other", value: "other" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedCategory(tab.value)}
              style={{
                backgroundColor: selectedCategory === tab.value ? "rgba(16, 185, 129, 0.15)" : "transparent",
                border: selectedCategory === tab.value ? "1px solid #10b981" : "1px solid var(--border-color)",
                color: selectedCategory === tab.value ? "#4edea3" : "var(--text-secondary)",
                padding: "0.375rem 0.75rem",
                borderRadius: "3px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live Activity Status Banner */}
      <div
        className="border-subtle"
        style={{
          backgroundColor: "rgba(16, 185, 129, 0.04)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          padding: "0.75rem 1rem",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          fontSize: "0.8125rem",
          fontFamily: "var(--font-mono)",
          color: "#34d399",
        }}
      >
        <div className="pulse-dot" />
        <span>Live Sync Active — {memories.length} memories stored in Supabase pgvector context bank</span>
      </div>

      {/* Memory Feed Cards Stack */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Loading context bank...
        </div>
      ) : filteredMemories.length === 0 && memories.length === 0 ? (
        /* Rich empty state for brand-new users */
        <div className="bg-surface border-subtle" style={{ padding: "2rem", borderRadius: "8px" }}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "center", color: "#10b981", marginBottom: "0.75rem" }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a9 9 0 0 1 9 9c0 3.6-2.1 6.7-5.2 8.1-.4.2-.8.6-.8 1v.9c0 .6-.4 1-1 1h-4c-.6 0-1-.4-1-1v-.9c0-.4-.4-.8-.8-1C5.1 17.7 3 14.6 3 11a9 9 0 0 1 9-9z"/>
                <path d="M9 22h6"/>
              </svg>
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.375rem" }}>Your memory bank is empty</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Memories appear here automatically once your AI tool is connected.</p>
          </div>

          {/* Setup checklist */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", maxWidth: "480px", margin: "0 auto 1.75rem" }}>
            {[
              { done: true,  step: "1", label: "Dashboard connected" },
              { done: false, step: "2", label: "Copy your MCP config snippet", link: "/setup" },
              { done: false, step: "3", label: "Paste into your AI tool and restart it" },
              { done: false, step: "4", label: "Use your AI normally — memories appear here" },
            ].map((item) => (
              <div key={item.step} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", backgroundColor: "var(--bg-color)", borderRadius: "5px", border: `1px solid ${item.done ? "rgba(16,185,129,0.3)" : "var(--border-color)"}` }}>
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: item.done ? "#10b981" : "var(--surface-hover, #1e2d4d)", color: item.done ? "#0b1326" : "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0 }}>
                  {item.done ? "✓" : item.step}
                </div>
                <span style={{ fontSize: "0.875rem", color: item.done ? "var(--text-secondary)" : "var(--text-primary)", flex: 1 }}>{item.label}</span>
                {item.link && (
                  <Link href={item.link} style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none", fontWeight: 600 }}>Open →</Link>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <Link href="/setup" style={{ display: "inline-block" }}>
              <button className="btn-primary">Copy MCP Config →</button>
            </Link>
            <Link href="/add" style={{ display: "inline-block" }}>
              <button className="btn-ghost">+ Add memory manually</button>
            </Link>
          </div>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="bg-surface border-subtle" style={{ padding: "2.5rem", textAlign: "center", borderRadius: "6px", color: "var(--text-secondary)" }}>
          <div style={{ display: "flex", justifyContent: "center", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>No memories match the current filters.</p>
          <button onClick={() => { setSelectedProject("ALL"); setSelectedCategory("ALL"); setSelectedSourceTool("ALL"); }} style={{ marginTop: "0.75rem", background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.375rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>Clear filters</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {/* Inline Quick-Add Bar */}
          <div
            className="bg-surface border-subtle"
            style={{ padding: "0.625rem 1rem", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <span style={{ color: "#10b981", fontSize: "1rem", flexShrink: 0 }}>+</span>
            <input
              type="text"
              placeholder="Quick add a memory… (press Enter to save)"
              value={quickAddContent}
              onChange={(e) => setQuickAddContent(e.target.value)}
              onKeyDown={handleQuickAdd}
              disabled={quickAdding}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "var(--font-inter)", fontSize: "0.875rem", opacity: quickAdding ? 0.5 : 1 }}
            />
            {quickAdding && (
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>Saving…</span>
            )}
          </div>

          {filteredMemories.map((item) => (
            <div
              key={item.id}
              className="bg-surface border-subtle glow-hover"
              style={{
                padding: "1.125rem 1.25rem",
                borderRadius: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
              }}
            >
              {/* Card Header & Content */}
              {editingId === item.id ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="input-field"
                    rows={3}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button onClick={() => setEditingId(null)} className="btn-ghost" style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}>
                      Cancel
                    </button>
                    <button onClick={() => handleEditSave(item.id)} className="btn-primary" style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}>
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <p
                    onClick={() => router.push(`/feed/${item.id}`)}
                    style={{ fontSize: "0.9375rem", lineHeight: "1.5", color: "var(--text-primary)", cursor: "pointer", flex: 1 }}
                    title="Click to view full memory details"
                  >
                    {item.content}
                  </p>
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <button
                      onClick={() => router.push(`/feed/${item.id}`)}
                      title="View Details"
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditContent(item.content);
                      }}
                      title="Edit Memory"
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(item.id)}
                      title="Delete Memory"
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Box */}
              {deleteConfirmId === item.id && (
                <div
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid #ef4444",
                    padding: "0.75rem",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: "0.8125rem", color: "#f87171" }}>Are you sure you want to delete this memory?</span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => setDeleteConfirmId(null)} className="btn-ghost" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                      Cancel
                    </button>
                    <button onClick={() => handleDelete(item.id)} style={{ backgroundColor: "#ef4444", color: "#fff", border: "none", padding: "0.25rem 0.5rem", borderRadius: "3px", fontSize: "0.75rem", cursor: "pointer" }}>
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Card Footer Badges */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ backgroundColor: "var(--bg-color)", border: "1px solid var(--border-color)", padding: "0.25rem 0.5rem", borderRadius: "2px", color: "var(--text-secondary)" }}>
                    Project: <strong style={{ color: "var(--text-primary)" }}>{item.project}</strong>
                  </span>

                  {getToolBadge(item.source_tool)}

                  {getCategoryBadge(item.category)}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {formatRelativeTime(item.created_at)}
                  </span>
                  <Link
                    href={`/feed/${item.id}`}
                    style={{ color: "#10b981", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    View Details
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", padding: "2rem" }}>Loading feed...</div>}>
      <FeedContent />
    </Suspense>
  );
}
