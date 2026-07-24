"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [deletingTag, setDeletingTag] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const fetchProjectSummaries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("memories")
      .select("project, category, updated_at, created_at")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      const summaryMap: Record<string, ProjectSummary> = {};

      data.forEach((row) => {
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
    setLoading(false);
  };

  useEffect(() => {
    fetchProjectSummaries();
  }, []);

  const handleRename = async (oldTag: string) => {
    if (!newName.trim() || newName.trim() === oldTag) {
      setRenamingTag(null);
      return;
    }

    const { error } = await supabase
      .from("memories")
      .update({ project: newName.trim() })
      .eq("project", oldTag);

    if (!error) {
      setRenamingTag(null);
      setNewName("");
      fetchProjectSummaries();
    } else {
      alert(`Failed to rename project tag: ${error.message}`);
    }
  };

  const handleDeleteAllUnderProject = async (tag: string) => {
    const { error } = await supabase.from("memories").delete().eq("project", tag);
    if (!error) {
      setDeletingTag(null);
      fetchProjectSummaries();
    } else {
      alert(`Failed to delete project memories: ${error.message}`);
    }
  };

  const handleCreateNewProjectTag = () => {
    if (!newProjectName.trim()) return;
    router.push(`/add?project=${encodeURIComponent(newProjectName.trim())}`);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Project Scopes</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Organize context banks by project tags
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{ fontSize: "0.75rem", padding: "0.5rem 0.875rem" }}>
          + New Project Tag
        </button>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "8px", width: "100%", maxWidth: "400px" }}>
            <h2 style={{ fontSize: "1.125rem", marginBottom: "1rem" }}>Create New Project Tag</h2>
            <input
              className="input-field"
              placeholder="e.g. wealth-advisor-ai"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              style={{ marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.375rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
              >
                Cancel
              </button>
              <button onClick={handleCreateNewProjectTag} className="btn-primary" style={{ fontSize: "0.75rem", padding: "0.375rem 0.75rem" }}>
                Add Memory Under Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Loading project tags...
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-surface border-subtle" style={{ textAlign: "center", padding: "3rem", borderRadius: "8px", color: "var(--text-secondary)" }}>
          No project tags found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {projects.map((proj) => (
            <div
              key={proj.tag}
              className="bg-surface border-subtle glow-hover"
              style={{ padding: "1.25rem", borderRadius: "8px", display: "flex", flexDirection: "column", justifyContent: "space-between", transition: "all 0.2s ease" }}
            >
              <div>
                {/* Title & Rename Input */}
                {renamingTag === proj.tag ? (
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    <input
                      className="input-field"
                      style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <button onClick={() => handleRename(proj.tag)} className="btn-primary" style={{ fontSize: "0.6875rem", padding: "0.25rem 0.5rem" }}>
                      Save
                    </button>
                    <button
                      onClick={() => setRenamingTag(null)}
                      style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.6875rem" }}
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <h2
                      onClick={() => router.push(`/feed?project=${encodeURIComponent(proj.tag)}`)}
                      style={{ fontSize: "1.125rem", fontWeight: 700, cursor: "pointer", color: "#10b981" }}
                    >
                      {proj.tag}
                    </h2>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {proj.totalCount} memories
                    </span>
                  </div>
                )}

                {/* Per Category Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", margin: "1rem 0", fontSize: "0.75rem", fontFamily: "var(--font-mono)", backgroundColor: "#0b1326", padding: "0.75rem", borderRadius: "4px" }}>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Pref: </span>
                    <strong style={{ color: "var(--text-primary)" }}>{proj.categories.preference}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Decisions: </span>
                    <strong style={{ color: "var(--text-primary)" }}>{proj.categories.decision}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Details: </span>
                    <strong style={{ color: "var(--text-primary)" }}>{proj.categories.project_detail}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Other: </span>
                    <strong style={{ color: "var(--text-primary)" }}>{proj.categories.other}</strong>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  Updated: {new Date(proj.lastUpdated).toLocaleDateString()}
                </span>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setRenamingTag(proj.tag);
                      setNewName(proj.tag);
                    }}
                    style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                  >
                    Rename
                  </button>

                  {deletingTag === proj.tag ? (
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        onClick={() => handleDeleteAllUnderProject(proj.tag)}
                        style={{ background: "#ef4444", color: "#fff", border: "none", padding: "0.125rem 0.375rem", borderRadius: "2px", fontSize: "0.6875rem", cursor: "pointer" }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeletingTag(null)}
                        style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.125rem 0.375rem", borderRadius: "2px", fontSize: "0.6875rem", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingTag(proj.tag)}
                      style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer", fontFamily: "var(--font-mono)" }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
