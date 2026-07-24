"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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
  const initialProjectParam = searchParams.get("project");

  const [memories, setMemories] = useState<Memory[]>([]);
  const [filteredMemories, setFilteredMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>(initialProjectParam || "ALL");
  const [selectedSourceTool, setSelectedSourceTool] = useState<string>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Fetch Memories
  const fetchMemories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memories")
      .select("id, project, content, category, source_tool, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMemories(data as Memory[]);
      setFilteredMemories(data as Memory[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMemories();

    // Supabase Realtime Subscription
    const channel = supabase
      .channel("memories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "memories" },
        () => {
          fetchMemories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = [...memories];
    if (selectedProject !== "ALL") {
      result = result.filter((m) => m.project === selectedProject);
    }
    if (selectedSourceTool !== "ALL") {
      result = result.filter((m) => m.source_tool === selectedSourceTool);
    }
    setFilteredMemories(result);
  }, [selectedProject, selectedSourceTool, memories]);

  // Semantic Search
  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setFilteredMemories(memories);
      return;
    }

    setLoading(true);
    try {
      // 1. Get embedding via reembed route
      const res = await fetch("/api/reembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: searchQuery }),
      });

      if (!res.ok) {
        throw new Error("Search embedding failed");
      }

      const { embedding } = await res.json();

      // 2. Query Supabase RPC match_memories
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id || "00000000-0000-0000-0000-000000000000";

      if (selectedProject !== "ALL") {
        // Search within a specific project
        const { data, error } = await supabase.rpc("match_memories", {
          p_user_id: userId,
          p_project: selectedProject,
          query_embedding: embedding,
          match_threshold: 0.6,
          match_count: 20,
        });
        if (!error && data) {
          setFilteredMemories(data as Memory[]);
        }
      } else {
        // "All Projects" — run match_memories for each distinct project and merge
        const allProjects = Array.from(new Set(memories.map((m) => m.project)));
        const resultMap = new Map<string, Memory>();

        await Promise.all(
          allProjects.map(async (proj) => {
            const { data } = await supabase.rpc("match_memories", {
              p_user_id: userId,
              p_project: proj,
              query_embedding: embedding,
              match_threshold: 0.6,
              match_count: 10,
            });
            if (data) {
              (data as Memory[]).forEach((m) => resultMap.set(m.id, m));
            }
          })
        );

        // Sort merged results newest-first
        const merged = Array.from(resultMap.values()).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setFilteredMemories(merged);
      }
    } catch (err) {
      // Fallback to client-side text filtering if search route endpoint unavailable
      const q = searchQuery.toLowerCase();
      setFilteredMemories(memories.filter((m) => m.content.toLowerCase().includes(q)));
    } finally {
      setLoading(false);
    }
  };

  // Inline Delete
  const handleDelete = async (id: string) => {
    await supabase.from("memories").delete().eq("id", id);
    setDeleteConfirmId(null);
    fetchMemories();
  };

  // Inline Edit Save
  const handleSaveEdit = async (id: string) => {
    if (!editContent.trim()) return;

    try {
      const res = await fetch("/api/reembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editContent }),
      });

      const { embedding } = await res.json();

      await supabase
        .from("memories")
        .update({
          content: editContent,
          embedding: embedding,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      setEditingId(null);
      fetchMemories();
    } catch (err) {
      alert("Failed to save memory edit");
    }
  };

  const projects = Array.from(new Set(memories.map((m) => m.project)));
  const tools = Array.from(new Set(memories.map((m) => m.source_tool).filter(Boolean)));

  const formatRelativeTime = (iso: string) => {
    const diff = (new Date().getTime() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)" }} />
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Memory Feed</h1>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Live updating cross-tool memory context bank
          </p>
        </div>

        <a href="/onboarding" className="btn-primary" style={{ fontSize: "0.75rem", padding: "0.5rem 0.875rem" }}>
          + MCP Setup / Settings
        </a>
      </div>

      {/* Controls: Search & Filter Toolbar */}
      <div className="bg-surface border-subtle" style={{ padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {/* Semantic Search Box */}
        <form onSubmit={handleSemanticSearch} style={{ flex: 1, minWidth: "280px" }}>
          <input
            className="input-field"
            placeholder="Semantic search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>

        {/* Project Filter */}
        <select
          className="input-field"
          style={{ width: "auto", minWidth: "160px" }}
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
        >
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        {/* Tool Filter */}
        <select
          className="input-field"
          style={{ width: "auto", minWidth: "160px" }}
          value={selectedSourceTool}
          onChange={(e) => setSelectedSourceTool(e.target.value)}
        >
          <option value="ALL">All Tools</option>
          {tools.map((t) => (
            <option key={t!} value={t!}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Memory List Feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Loading context feed...
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="bg-surface border-subtle" style={{ textAlign: "center", padding: "3rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
          No memories stored matching filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {filteredMemories.map((mem) => (
            <div key={mem.id} className="bg-surface border-subtle glow-hover" style={{ padding: "1.25rem", borderRadius: "6px", transition: "all 0.2s ease" }}>
              {/* Category & Project Badges */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.6875rem",
                      padding: "0.125rem 0.375rem",
                      borderRadius: "2px",
                      backgroundColor: "rgba(16, 185, 129, 0.1)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      color: "#10b981",
                      textTransform: "uppercase",
                    }}
                  >
                    {mem.category}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    project: <strong style={{ color: "var(--text-primary)" }}>{mem.project}</strong>
                  </span>
                </div>

                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  {mem.source_tool && <span style={{ marginRight: "0.75rem" }}>via {mem.source_tool}</span>}
                  <span>{formatRelativeTime(mem.created_at)}</span>
                </div>
              </div>

              {/* Memory Content Row (or Inline Edit Form) */}
              {editingId === mem.id ? (
                <div style={{ marginTop: "0.5rem" }}>
                  <textarea
                    className="input-field"
                    style={{ minHeight: "80px", marginBottom: "0.5rem" }}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => handleSaveEdit(mem.id)} className="btn-primary" style={{ fontSize: "0.75rem", padding: "0.25rem 0.75rem" }}>
                      Save & Re-embed
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.25rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: "0.9375rem", lineHeight: "1.5", color: "var(--text-primary)", marginBottom: "0.75rem" }}>{mem.content}</p>
              )}

              {/* Row Action Footer */}
              {editingId !== mem.id && (
                <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <button
                    onClick={() => {
                      setEditingId(mem.id);
                      setEditContent(mem.content);
                    }}
                    style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                  >
                    Edit
                  </button>

                  {deleteConfirmId === mem.id ? (
                    <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "#ef4444" }}>Confirm delete?</span>
                      <button onClick={() => handleDelete(mem.id)} style={{ background: "#ef4444", border: "none", color: "#fff", padding: "0.125rem 0.375rem", borderRadius: "2px", fontSize: "0.75rem", cursor: "pointer" }}>
                        Yes
                      </button>
                      <button onClick={() => setDeleteConfirmId(null)} style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.125rem 0.375rem", borderRadius: "2px", fontSize: "0.75rem", cursor: "pointer" }}>
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(mem.id)}
                      style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Loading feed...</div>}>
      <FeedContent />
    </Suspense>
  );
}
