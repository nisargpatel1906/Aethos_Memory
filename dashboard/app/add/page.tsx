"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabase, getUserId } from "../../lib/supabaseClient";

function AddMemoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectParam = searchParams.get("project") || "global";

  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"preference" | "decision" | "project_detail" | "other">("preference");
  const [targetProject, setTargetProject] = useState(initialProjectParam);
  const [newProjectInput, setNewProjectInput] = useState("");
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [existingProjects, setExistingProjects] = useState<string[]>(["global"]);
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    getSupabase()
      .from("memories")
      .select("project")
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map((d) => d.project)));
          if (initialProjectParam && !unique.includes(initialProjectParam)) {
            unique.push(initialProjectParam);
          }
          if (unique.length > 0) setExistingProjects(unique);
        }
      });
  }, [initialProjectParam]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setDuplicateWarning(null);

    const projectToSave = showNewProjectInput && newProjectInput.trim() ? newProjectInput.trim() : targetProject;

    try {
      // 1. Call server API reembed to generate embedding
      const res = await fetch("/api/reembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate vector embedding via Gemini.");
      }

      const { embedding } = await res.json();
      const userId = getUserId();

      // 2. Dedup check against existing memories if not already confirmed by user
      if (!duplicateConfirmed) {
        const { data: matches } = await getSupabase().rpc("match_memories", {
          p_user_id: userId,
          p_project: projectToSave,
          query_embedding: embedding,
          match_threshold: 0.82,
          match_count: 1,
        });

        if (matches && matches.length > 0) {
          setDuplicateWarning(
            `Near-duplicate memory detected: "${matches[0].content}" (similarity match).`
          );
          setLoading(false);
          return;
        }
      }

      // 3. Insert record into Supabase memories
      const { error: insertError } = await getSupabase().from("memories").insert({
        user_id: userId,
        project: projectToSave,
        content: content.trim(),
        embedding: embedding,
        category: category,
        source_tool: "Web Dashboard",
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // 4. Redirect to /feed on success
      router.push("/feed");
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "640px", margin: "1rem auto" }}>
      <div className="bg-surface border-subtle" style={{ padding: "2rem", borderRadius: "8px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#10b981" }}>+</span> Add New Memory
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
              Manually insert a fact, rule, or preference into your AI memory vault. Available across all sessions instantly.
            </p>
          </div>
          <button onClick={() => router.back()} className="btn-ghost" style={{ padding: "0.25rem 0.5rem" }}>
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleAddMemory} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Fact Content Textarea */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                MEMORY / FACT
              </label>
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                Markdown supported
              </span>
            </div>
            <textarea
              placeholder="e.g. Always use Tailwind v4 for frontend projects and prefer pnpm over npm for faster installs."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input-field"
              rows={4}
              required
            />
          </div>

          {/* Project Tag & Category Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Project Tag */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                PROJECT TAG
              </label>
              {!showNewProjectInput ? (
                <select
                  value={targetProject}
                  onChange={(e) => {
                    if (e.target.value === "NEW") {
                      setShowNewProjectInput(true);
                    } else {
                      setTargetProject(e.target.value);
                    }
                  }}
                  className="input-field"
                >
                  {existingProjects.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="NEW">+ Create New Project Tag</option>
                </select>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="New Tag Name"
                    value={newProjectInput}
                    onChange={(e) => setNewProjectInput(e.target.value)}
                    className="input-field"
                  />
                  <button type="button" onClick={() => setShowNewProjectInput(false)} className="btn-ghost" style={{ padding: "0.375rem 0.5rem", fontSize: "0.75rem" }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Category Buttons */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
                CATEGORY
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.375rem" }}>
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
                      padding: "0.5rem",
                      borderRadius: "3px",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      cursor: "pointer",
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Instant Sync Notice Box */}
          <div
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.05)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              padding: "0.875rem",
              borderRadius: "4px",
              fontSize: "0.8125rem",
              color: "#34d399",
              display: "flex",
              gap: "0.625rem",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "1rem" }}>⚡</span>
            <div>
              <strong>Instant Vector Sync:</strong> Once saved, an embedding is generated in the background and made immediately available to your connected AI MCP clients.
            </div>
          </div>

          {/* Duplicate Warning Prompt */}
          {duplicateWarning && (
            <div style={{ backgroundColor: "rgba(234, 179, 8, 0.1)", border: "1px solid #eab308", padding: "0.875rem", borderRadius: "4px", color: "#fde047", fontSize: "0.8125rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.375rem" }}>⚠️ Duplicate Memory Warning</div>
              <div>{duplicateWarning}</div>
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => {
                    setDuplicateConfirmed(true);
                    setDuplicateWarning(null);
                  }}
                  className="btn-primary"
                  style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                >
                  Save Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="btn-ghost"
                  style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", padding: "0.75rem", borderRadius: "4px", color: "#f87171", fontSize: "0.8125rem" }}>
              {errorMsg}
            </div>
          )}

          {/* Footer Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
            <button type="button" onClick={() => router.back()} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? "Generating Embedding..." : "Save Memory ➔"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddMemoryPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", padding: "2rem" }}>Loading form...</div>}>
      <AddMemoryForm />
    </Suspense>
  );
}
