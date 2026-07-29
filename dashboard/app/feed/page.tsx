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
  tags: string[];
  entities: string[];
  created_at: string;
  updated_at: string;
}

function CategoryBadge({ cat }: { cat: string }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    preference:     { label: "Preference",     bg: "rgba(16,185,129,0.1)",  color: "#34d399", border: "rgba(16,185,129,0.3)" },
    decision:       { label: "Decision",       bg: "rgba(245,158,11,0.1)",  color: "#fbbf24", border: "rgba(245,158,11,0.3)" },
    project_detail: { label: "Project Detail", bg: "rgba(99,102,241,0.1)",  color: "#818cf8", border: "rgba(99,102,241,0.3)" },
    other:          { label: "Other",          bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.3)" },
  };
  const item = map[cat] ?? map.other;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: item.bg,
        border: `1px solid ${item.border}`,
        color: item.color,
        fontFamily: "var(--font-mono)",
        fontSize: "0.6875rem",
        fontWeight: 600,
        padding: "0.2rem 0.55rem",
        borderRadius: "12px",
        letterSpacing: "0.01em",
      }}
    >
      {item.label}
    </span>
  );
}

function ProvenanceBadge({ content, cat }: { content: string; cat: string }) {
  const isAi =
    cat.includes("ai") ||
    content.toLowerCase().startsWith("ai ") ||
    content.toLowerCase().includes("ai generated") ||
    content.toLowerCase().includes("ai recommendation");

  if (isAi) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          backgroundColor: "rgba(6, 182, 212, 0.12)",
          border: "1px solid rgba(6, 182, 212, 0.35)",
          color: "#22d3ee",
          fontFamily: "var(--font-mono)",
          fontSize: "0.6875rem",
          fontWeight: 700,
          padding: "0.2rem 0.55rem",
          borderRadius: "12px",
          letterSpacing: "0.01em",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
        AI Generated Answer
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        border: "1px solid rgba(16, 185, 129, 0.35)",
        color: "#34d399",
        fontFamily: "var(--font-mono)",
        fontSize: "0.6875rem",
        fontWeight: 700,
        padding: "0.2rem 0.55rem",
        borderRadius: "12px",
        letterSpacing: "0.01em",
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      User Statement
    </span>
  );
}

function ToolBadge({ tool }: { tool: string | null }) {
  const raw = tool || "MCP Client";
  const ipMatch = raw.match(/\(([\d\.]+)\)/);
  const ip = ipMatch ? ipMatch[1] : null;
  const toolBase = raw.replace(/\s*\([\d\.]+\)/, "").trim();

  const name = toolBase.toLowerCase().replace(/[\s_-]/g, "");

  const toolMap: Record<string, { label: string; bg: string; border: string; color: string }> = {
    claude:           { label: "Claude",        bg: "rgba(205,127,50,0.12)",  border: "rgba(205,127,50,0.3)",  color: "#f59e0b" },
    claudedesktop:    { label: "Claude Desktop", bg: "rgba(205,127,50,0.12)",  border: "rgba(205,127,50,0.3)",  color: "#f59e0b" },
    claudecode:       { label: "Claude Code",   bg: "rgba(205,127,50,0.12)",  border: "rgba(205,127,50,0.3)",  color: "#f59e0b" },
    opencode:         { label: "OpenCode",      bg: "rgba(139,92,246,0.12)",  border: "rgba(139,92,246,0.3)",  color: "#a78bfa" },
    codex:            { label: "Codex",         bg: "rgba(20,184,166,0.12)",  border: "rgba(20,184,166,0.3)",  color: "#2dd4bf" },
    antigravity:      { label: "Antigravity IDE", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.3)",  color: "#34d399" },
    cursor:           { label: "Cursor",        bg: "rgba(59,130,246,0.12)",  border: "rgba(59,130,246,0.3)",  color: "#60a5fa" },
    geminicli:        { label: "Gemini CLI",    bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  color: "#fbbf24" },
    gemini:           { label: "Gemini",        bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.3)",  color: "#fbbf24" },
    webdashboard:     { label: "Web Dashboard", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)", color: "#f472b6" },
    webdashboardintegrationtest: { label: "Web Dashboard", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.3)", color: "#f472b6" },
    mcpclient:        { label: "MCP Client",    bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)", color: "#94a3b8" },
  };

  const match = toolMap[name] ?? { label: toolBase || "Unknown", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", color: "#94a3b8" };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          backgroundColor: match.bg,
          border: `1px solid ${match.border}`,
          color: match.color,
          fontFamily: "var(--font-mono)",
          fontSize: "0.6875rem",
          fontWeight: 600,
          padding: "0.2rem 0.55rem",
          borderRadius: "12px",
          letterSpacing: "0.01em",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </span>{" "}
        {match.label}
      </span>
      {ip && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.2rem",
            backgroundColor: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            color: "#60a5fa",
            fontFamily: "var(--font-mono)",
            fontSize: "0.6875rem",
            fontWeight: 600,
            padding: "0.2rem 0.55rem",
            borderRadius: "12px",
          }}
        >
          🌐 {ip}
        </span>
      )}
    </span>
  );
}

function formatRelativeTime(isoString: string) {
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
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [quickAddContent, setQuickAddContent] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [liveToast, setLiveToast] = useState<string | null>(null);

  // Sync searchParams reactively when URL changes
  useEffect(() => {
    const q = searchParams.get("q");
    const proj = searchParams.get("project");
    if (q !== null) setSearchQuery(q);
    if (proj !== null) setSelectedProject(proj);
  }, [searchParams]);

  // Fetch Memories directly via Supabase client with instant local cache
  const fetchMemories = async () => {
    const cached = localStorage.getItem("aethos_cached_memories");
    if (cached && memories.length === 0) {
      try {
        setMemories(JSON.parse(cached));
        setLoading(false);
      } catch {}
    }

    try {
      const db = getSupabase();
      const { data, error } = await db
        .from("memories")
        .select("id, project, content, category, source_tool, tags, entities, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (!error && data) {
        setMemories(data as Memory[]);
        localStorage.setItem("aethos_cached_memories", JSON.stringify(data));
      }
    } catch (e) {
      console.error("Failed to fetch memories:", e);
    }
    setLoading(false);
  };

  // Real-Time Supabase WebSocket Subscription & 3-Second Live Polling Loop
  useEffect(() => {
    fetchMemories();

    const db = getSupabase();
    // 1. Realtime Supabase WebSockets channel
    const channel = db
      .channel("realtime-memories-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memories" },
        (payload: any) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const newData = payload.new as any;
            setMemories((prev) => {
              const has = prev.some((p) => p.id === newData.id);
              if (has) {
                return prev.map((p) => (p.id === newData.id ? { ...p, ...newData } : p));
              }
              return [newData as Memory, ...prev];
            });
            setLiveToast(`⚡ Live Memory Auto-Saved: "${newData.content.slice(0, 60)}..."`);
            setTimeout(() => setLiveToast(null), 5000);
          } else if (payload.eventType === "DELETE" && payload.old) {
            setMemories((prev) => prev.filter((m) => m.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setMemories((prev) => prev.map((m) => (m.id === payload.new.id ? (payload.new as Memory) : m)));
          }
        }
      )
      .subscribe();

    // 2. 2-second live sync polling loop — unconditionally syncs feed state
    const interval = setInterval(async () => {
      try {
        const { data, error } = await db
          .from("memories")
          .select("id, project, content, category, source_tool, created_at, updated_at")
          .order("created_at", { ascending: false });
        if (!error && data) {
          setMemories(data as Memory[]);
          localStorage.setItem("aethos_cached_memories", JSON.stringify(data));
        }
      } catch {}
    }, 2000);

    return () => {
      db.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

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

  // Compute filtered memories instantly using useMemo
  const filteredMemories = useMemo(() => {
    let result = memories;

    if (selectedProject !== "ALL") {
      result = result.filter((rec) => rec.project === selectedProject);
    }

    if (selectedSourceTool !== "ALL") {
      result = result.filter((rec) => (rec.source_tool || "unknown") === selectedSourceTool);
    }

    if (selectedCategory !== "ALL") {
      result = result.filter((rec) => rec.category === selectedCategory);
    }
    
    if (selectedTag !== "ALL") {
      result = result.filter((rec) => {
        const hasTag = rec.tags && rec.tags.includes(selectedTag);
        const hasEntity = rec.entities && rec.entities.includes(selectedTag);
        return hasTag || hasEntity;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (rec) =>
          rec.content.toLowerCase().includes(q) ||
          rec.project.toLowerCase().includes(q) ||
          rec.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedProject, selectedSourceTool, selectedCategory, selectedTag, searchQuery, memories]);

  const handleEditSave = async (id: string) => {
    if (!editContent.trim() || editSaving) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchMemories();
      }
    } catch {
      // silently fail
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await getSupabase().from("memories").delete().eq("id", id);
    if (!error) {
      setDeleteConfirmId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchMemories();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    try {
      await fetch("/api/memories/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      fetchMemories();
    } catch {
      // silently fail
    }
    setBulkDeleting(false);
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredMemories.map((rec) => rec.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const uniqueProjects: string[] = [];
  memories.forEach((item) => {
    if (item.project && !uniqueProjects.includes(item.project)) {
      uniqueProjects.push(item.project);
    }
  });

  const uniqueTools: string[] = [];
  memories.forEach((item) => {
    const toolName = item.source_tool || "unknown";
    if (!uniqueTools.includes(toolName)) {
      uniqueTools.push(toolName);
    }
  });

  const uniqueTags: string[] = [];
  memories.forEach((item) => {
    if (item.tags && Array.isArray(item.tags)) {
      item.tags.forEach((tag) => {
        if (!uniqueTags.includes(tag)) uniqueTags.push(tag);
      });
    }
    if (item.entities && Array.isArray(item.entities)) {
      item.entities.forEach((entity) => {
        if (!uniqueTags.includes(entity)) uniqueTags.push(entity);
      });
    }
  });

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Setup banner for new users */}
      <SetupBanner memoryCount={memories.length} />

      {/* Real-Time Live Ingestion Toast Notification */}
      {liveToast && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            marginBottom: "1.25rem",
            borderRadius: "10px",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid #10b981",
            color: "#34d399",
            fontFamily: "var(--font-mono)",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 20px rgba(16, 185, 129, 0.25)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1rem" }}>⚡</span>
            <span>{liveToast}</span>
          </div>
          <span style={{ fontSize: "0.7rem", backgroundColor: "rgba(16, 185, 129, 0.25)", padding: "0.2rem 0.5rem", borderRadius: "12px", border: "1px solid #34d399" }}>
            REALTIME LIVE
          </span>
        </div>
      )}

      {/* NeuroBank Style Hero KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
        {/* 1. Practical Memory Engine Status Card */}
        <div className="bg-surface glow-hover" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "180px", borderRadius: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{
              fontSize: "0.7rem", fontFamily: "var(--font-mono)",
              backgroundColor: "rgba(16, 185, 129, 0.25)", border: "1px solid #34d399",
              color: "#ffffff", padding: "0.25rem 0.65rem", borderRadius: "20px", fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
            }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: "#34d399", boxShadow: "0 0 8px #34d399" }} />
              Live Sync
            </span>
          </div>

          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff", lineHeight: "1.35", letterSpacing: "-0.01em", maxWidth: "95%" }}>
              {memories.length} Memories Syncing Across {uniqueProjects.length} Active Projects
            </h2>
            <p style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.8)", marginTop: "0.35rem", fontFamily: "var(--font-mono)" }}>
              Gemini 768d Embeddings • Supabase pgvector
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Link href="/analytics" style={{
              width: "34px", height: "34px", borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.15)", border: "1px solid rgba(255, 255, 255, 0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", cursor: "pointer",
              fontSize: "0.9rem", fontWeight: 700, textDecoration: "none",
            }}>
              ↗
            </Link>
          </div>
        </div>

        {/* 2. Total Memories KPI Card */}
        <div className="bg-surface glow-hover" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: "20px" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontWeight: 600 }}>
              TOTAL MEMORIES
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {memories.length}
              <span style={{ fontSize: "0.75rem", backgroundColor: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", padding: "0.15rem 0.5rem", borderRadius: "12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                ↑ 12%
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", padding: "0.2rem 0.5rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
              {uniqueProjects.length} Projects
            </span>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border-color)", padding: "0.2rem 0.5rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
              {uniqueTools.length} AI Tools
            </span>
          </div>
        </div>

        {/* 3. Category Distribution KPI Card */}
        <div className="bg-surface glow-hover" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: "20px" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontWeight: 600 }}>
              SYNCHRONIZATION
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981", marginTop: "0.25rem" }}>
              100%
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
              <span>pgvector Sync</span>
              <span style={{ color: "#34d399" }}>Active</span>
            </div>
            <div style={{ width: "100%", height: "6px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", backgroundColor: "#10b981", borderRadius: "3px" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Floating Filter Control Bar */}
      <div
        style={{
          backgroundColor: "rgba(17, 24, 39, 0.6)",
          border: "1px solid var(--border-color)",
          backdropFilter: "blur(12px)",
          padding: "0.875rem 1.25rem",
          borderRadius: "12px",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Project Dropdown */}
        <select
          value={selectedProject}
          onChange={(evt) => setSelectedProject(evt.target.value)}
          className="input-field"
          style={{
            width: "auto",
            minWidth: "150px",
            backgroundColor: "rgba(11, 19, 38, 0.8)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            padding: "0.45rem 0.75rem",
          }}
        >
          <option value="ALL">All Projects ({uniqueProjects.length})</option>
          {uniqueProjects.map((projItem) => (
            <option key={projItem} value={projItem}>
              {projItem}
            </option>
          ))}
        </select>

        {/* Tools Dropdown */}
        <select
          value={selectedSourceTool}
          onChange={(evt) => setSelectedSourceTool(evt.target.value)}
          className="input-field"
          style={{
            width: "auto",
            minWidth: "150px",
            backgroundColor: "rgba(11, 19, 38, 0.8)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            padding: "0.45rem 0.75rem",
          }}
        >
          <option value="ALL">All Tools ({uniqueTools.length})</option>
          {uniqueTools.map((toolItem) => (
            <option key={toolItem} value={toolItem}>
              {toolItem}
            </option>
          ))}
        </select>

        {/* Categories Dropdown */}
        <select
          value={selectedCategory}
          onChange={(evt) => setSelectedCategory(evt.target.value)}
          className="input-field"
          style={{
            width: "auto",
            minWidth: "150px",
            backgroundColor: "rgba(11, 19, 38, 0.8)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            padding: "0.45rem 0.75rem",
          }}
        >
          <option value="ALL">All Categories</option>
          <option value="preference">User Preferences</option>
          <option value="decision">Architecture Decisions</option>
          <option value="project_detail">Project Details</option>
          <option value="other">Other Observations</option>
        </select>

        {/* Tags Dropdown */}
        <select
          value={selectedTag}
          onChange={(evt) => setSelectedTag(evt.target.value)}
          className="input-field"
          style={{
            width: "auto",
            minWidth: "150px",
            backgroundColor: "rgba(11, 19, 38, 0.8)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            fontSize: "0.8125rem",
            padding: "0.45rem 0.75rem",
          }}
        >
          <option value="ALL">All Tags ({uniqueTags.length})</option>
          {uniqueTags.map((tagItem) => (
            <option key={tagItem} value={tagItem}>
              #{tagItem}
            </option>
          ))}
        </select>

        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--border-subtle)" }} />

        {/* Category Pills */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {[
            { label: "All", value: "ALL" },
            { label: "Preference", value: "preference" },
            { label: "Decision", value: "decision" },
            { label: "Project Detail", value: "project_detail" },
            { label: "Other", value: "other" },
          ].map((catItem) => (
            <button
              key={catItem.value}
              onClick={() => setSelectedCategory(catItem.value)}
              style={{
                backgroundColor: selectedCategory === catItem.value ? "rgba(16, 185, 129, 0.15)" : "transparent",
                border: selectedCategory === catItem.value ? "1px solid #10b981" : "1px solid transparent",
                color: selectedCategory === catItem.value ? "#34d399" : "var(--text-secondary)",
                padding: "0.3rem 0.65rem",
                borderRadius: "20px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: selectedCategory === catItem.value ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {catItem.label}
            </button>
          ))}
        </div>

        {/* Inline Live Sync Pill */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.85rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
          <Link href="/analytics" style={{ color: "#10b981", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Analytics & Export →
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "#34d399" }}>
            <div className="pulse-dot" style={{ width: "7px", height: "7px" }} />
            <span>{memories.length} Memories</span>
          </div>
        </div>
      </div>

      {/* Memory Feed Cards Stack */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Loading context bank...
        </div>
      ) : filteredMemories.length === 0 && memories.length === 0 ? (
        /* Rich empty state for brand-new users */
        <div className="bg-surface border-subtle" style={{ padding: "2.5rem", borderRadius: "12px", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", color: "#10b981", marginBottom: "0.75rem" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a9 9 0 0 1 9 9c0 3.6-2.1 6.7-5.2 8.1-.4.2-.8.6-.8 1v.9c0 .6-.4 1-1 1h-4c-.6 0-1-.4-1-1v-.9c0-.4-.4-.8-.8-1C5.1 17.7 3 14.6 3 11a9 9 0 0 1 9-9z"/>
              <path d="M9 22h6"/>
            </svg>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.375rem" }}>Your memory bank is empty</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Memories appear here automatically once your AI tool is connected.</p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <Link href="/setup" style={{ display: "inline-block" }}>
              <button className="btn-primary">Copy MCP Config →</button>
            </Link>
            <Link href="/add" style={{ display: "inline-block" }}>
              <button className="btn-ghost">+ Add memory manually</button>
            </Link>
          </div>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="bg-surface border-subtle" style={{ padding: "2.5rem", textAlign: "center", borderRadius: "10px", color: "var(--text-secondary)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>No memories match the current filters.</p>
          <button onClick={() => { setSelectedProject("ALL"); setSelectedCategory("ALL"); setSelectedSourceTool("ALL"); }} style={{ marginTop: "0.75rem", background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.375rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>Clear filters</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {/* Bulk Select Action Bar */}
          {filteredMemories.length > 0 && (
            <div
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                backgroundColor: "rgba(17, 24, 39, 0.4)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.size === filteredMemories.length && filteredMemories.length > 0}
                onChange={(evt) => evt.target.checked ? selectAll() : clearSelection()}
                style={{ cursor: "pointer", accentColor: "#10b981" }}
                id="select-all-memories"
              />
              <label htmlFor="select-all-memories" style={{ color: "var(--text-secondary)", cursor: "pointer" }}>
                {selectedIds.size === 0 ? "Select all" : `${selectedIds.size} selected`}
              </label>
              {selectedIds.size > 0 && (
                <>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    style={{
                      marginLeft: "auto",
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.4)",
                      color: "#f87171",
                      padding: "0.3rem 0.75rem",
                      borderRadius: "4px",
                      cursor: bulkDeleting ? "not-allowed" : "pointer",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      opacity: bulkDeleting ? 0.6 : 1,
                    }}
                  >
                    {bulkDeleting ? "Deleting…" : `Delete ${selectedIds.size} selected`}
                  </button>
                  <button
                    onClick={clearSelection}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-secondary)",
                      padding: "0.3rem 0.75rem",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}

          {/* Inline Quick-Add Bar */}
          <div
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              backgroundColor: "rgba(17, 24, 39, 0.5)",
              border: "1px solid var(--border-color)",
            }}
          >
            <span style={{ color: "#10b981", fontSize: "1rem", flexShrink: 0 }}>+</span>
            <input
              type="text"
              placeholder="Quick add a memory… (press Enter to save)"
              value={quickAddContent}
              onChange={(evt) => setQuickAddContent(evt.target.value)}
              onKeyDown={handleQuickAdd}
              disabled={quickAdding}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text-primary)", fontFamily: "var(--font-inter)", fontSize: "0.875rem", opacity: quickAdding ? 0.5 : 1 }}
            />
            {quickAdding && (
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>Saving…</span>
            )}
          </div>

          {/* Sleek Minimalist Memory Cards */}
          {filteredMemories.map((item) => (
            <div
              key={item.id}
              className="bg-surface border-subtle glow-hover"
              style={{
                borderRadius: "10px",
                padding: "1.15rem 1.35rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
                outline: selectedIds.has(item.id) ? "1px solid rgba(16,185,129,0.4)" : "none",
              }}
            >
              {/* Card Main Section */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
                {/* Select checkbox */}
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelectId(item.id)}
                  style={{ marginTop: "4px", cursor: "pointer", accentColor: "#10b981", flexShrink: 0 }}
                  onClick={(evt) => evt.stopPropagation()}
                />
                <div style={{ flex: 1 }}>
                  {editingId === item.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <textarea
                        value={editContent}
                        onChange={(evt) => setEditContent(evt.target.value)}
                        className="input-field"
                        rows={3}
                      />
                      <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                        <button onClick={() => setEditingId(null)} className="btn-ghost" style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}>
                          Cancel
                        </button>
                        <button onClick={() => handleEditSave(item.id)} disabled={editSaving} className="btn-primary" style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem", opacity: editSaving ? 0.6 : 1 }}>
                          {editSaving ? "Saving…" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                      <p
                        onClick={() => router.push(`/feed/${item.id}`)}
                        style={{ fontSize: "0.9375rem", lineHeight: "1.6", color: "#f8fafc", cursor: "pointer", flex: 1, fontWeight: 500 }}
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
                </div>
              </div>

              {/* Tags & Entities */}
              {!editingId || editingId !== item.id ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
                  {item.tags && item.tags.map((tag: string, idx: number) => (
                    <span
                      key={`tag-${idx}`}
                      style={{
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "12px",
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {item.entities && item.entities.map((entity: string, idx: number) => (
                    <span
                      key={`ent-${idx}`}
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        color: "#34d399",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "12px",
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {entity.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Delete Confirmation Box */}
              {deleteConfirmId === item.id && (
                <div
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid #ef4444",
                    padding: "0.75rem",
                    borderRadius: "6px",
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

              {/* Sleek Footer Badges */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.625rem", marginTop: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ backgroundColor: "rgba(255, 255, 255, 0.04)", border: "1px solid var(--border-subtle)", padding: "0.2rem 0.55rem", borderRadius: "12px", color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                    <strong style={{ color: "var(--text-primary)" }}>{item.project}</strong>
                  </span>

                  <ToolBadge tool={item.source_tool} />

                  <CategoryBadge cat={item.category} />

                  <ProvenanceBadge content={item.content} cat={item.category} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {formatRelativeTime(item.created_at)}
                  </span>
                  <Link
                    href={`/feed/${item.id}`}
                    style={{ color: "#10b981", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    Details →
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
