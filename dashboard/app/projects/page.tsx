"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "../../lib/supabaseClient";

interface ProjectSummary {
  tag: string;
  totalCount: number;
  lastUpdated: string;
  categories: {
    preference: number;
    decision: number;
    project_detail: number;
    other: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const fetchProjectSummaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const db = getSupabase();
      const { data, error: dbError } = await db
        .from("memories")
        .select("project, category, updated_at, created_at")
        .order("created_at", { ascending: false });

      if (dbError) throw new Error(dbError.message);

      if (data) {
        const summaryMap: Record<string, ProjectSummary> = {};

        data.forEach((row: any) => {
          const tag = row.project || "global";
          if (!summaryMap[tag]) {
            summaryMap[tag] = {
              tag,
              totalCount: 0,
              lastUpdated: row.updated_at || row.created_at,
              categories: { preference: 0, decision: 0, project_detail: 0, other: 0 },
            };
          }

          summaryMap[tag].totalCount += 1;
          const cat = row.category as keyof typeof summaryMap[typeof tag]["categories"];
          if (summaryMap[tag].categories[cat] !== undefined) {
            summaryMap[tag].categories[cat] += 1;
          }
        });

        setProjects(Object.values(summaryMap));
      }
    } catch (err: any) {
      console.error("Failed to fetch project summaries:", err);
      setError(err.message || "Failed to load projects. Check your Supabase connection in Settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectSummaries();
  }, []);

  const handleRename = async (oldTag: string) => {
    if (!newName.trim() || newName.trim() === oldTag) {
      setRenamingTag(null);
      return;
    }

    const { error: dbError } = await getSupabase()
      .from("memories")
      .update({ project: newName.trim() })
      .eq("project", oldTag);

    if (!dbError) {
      setRenamingTag(null);
      setNewName("");
      fetchProjectSummaries();
    }
  };

  const handleDeleteTag = async (tag: string) => {
    if (!confirm(`Are you sure you want to delete all memories tagged '${tag}'?`)) return;

    const { error: dbError } = await getSupabase().from("memories").delete().eq("project", tag);
    if (!dbError) {
      fetchProjectSummaries();
    }
  };

  const handleCreateProjectTag = () => {
    if (!newProjectName.trim()) return;
    router.push(`/add?project=${encodeURIComponent(newProjectName.trim())}`);
  };

  const formatRelativeTime = (isoString: string) => {
    const now = new Date();
    const date = new Date(isoString);
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Projects & Tags</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Manage project tags and memory clusters across your connected AI sessions.
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + New Project Tag
        </button>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div className="bg-surface border-subtle" style={{ width: "100%", maxWidth: "420px", padding: "1.5rem", borderRadius: "6px" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>Create New Project Tag</h3>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Define a new tag to scope memories for your projects.
            </p>
            <input
              type="text"
              placeholder="e.g. Wealth Advisor AI"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="input-field"
              style={{ marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={handleCreateProjectTag} className="btn-primary">
                Create & Add Memory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Loading project clusters...
        </div>
      ) : error ? (
        <div
          className="bg-surface border-subtle"
          style={{ padding: "2rem", borderRadius: "6px", textAlign: "center" }}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>⚠️</div>
          <p style={{ color: "#f87171", fontFamily: "var(--font-mono)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            {error}
          </p>
          <button onClick={fetchProjectSummaries} className="btn-ghost" style={{ fontSize: "0.75rem" }}>
            Retry
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-surface border-subtle" style={{ padding: "3rem", textAlign: "center", borderRadius: "6px" }}>
          <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>No project tags found.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: "1.25rem" }}>
          {projects.map((proj) => (
            <div
              key={proj.tag}
              className="bg-surface border-subtle glow-hover"
              style={{ padding: "1.25rem", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {/* Card Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.25rem" }}>📁</span>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)" }}>{proj.tag}</h3>
                  </div>
                  <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                    {proj.totalCount} memories • updated {formatRelativeTime(proj.lastUpdated)}
                  </div>
                </div>
                <div className="pulse-dot" style={{ width: "6px", height: "6px" }} />
              </div>

              {/* Category Stats Breakdown */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                <span className="badge-category badge-preference">{proj.categories.preference} Preferences</span>
                <span className="badge-category badge-decision">{proj.categories.decision} Decisions</span>
                <span className="badge-category badge-detail">{proj.categories.project_detail} Details</span>
              </div>

              {/* Rename Action Input */}
              {renamingTag === proj.tag ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="input-field"
                    style={{ height: "32px", fontSize: "0.75rem" }}
                  />
                  <button onClick={() => handleRename(proj.tag)} className="btn-primary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                    Save
                  </button>
                  <button onClick={() => setRenamingTag(null)} className="btn-ghost" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                /* Footer Action Buttons */
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                  <button
                    onClick={() => router.push(`/feed?project=${encodeURIComponent(proj.tag)}`)}
                    className="btn-ghost"
                    style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem", fontFamily: "var(--font-mono)" }}
                  >
                    Filter Feed ➔
                  </button>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        setRenamingTag(proj.tag);
                        setNewName(proj.tag);
                      }}
                      className="btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}
                    >
                      Rename Tag
                    </button>
                    <button
                      onClick={() => handleDeleteTag(proj.tag)}
                      style={{
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#ef4444",
                        padding: "0.375rem 0.625rem",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
