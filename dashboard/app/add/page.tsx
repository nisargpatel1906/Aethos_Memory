"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function AddMemoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialProjectParam = searchParams.get("project");

  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"preference" | "decision" | "project_detail" | "other">("preference");
  const [projectMode, setProjectMode] = useState<"existing" | "new">(initialProjectParam ? "existing" : "existing");
  const [selectedProject, setSelectedProject] = useState(initialProjectParam || "global");
  const [customProject, setCustomProject] = useState("");
  const [existingProjects, setExistingProjects] = useState<string[]>([initialProjectParam || "global"]);

  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      // Fetch unique existing projects for selector
      supabase
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
    });
  }, [initialProjectParam, router]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const targetProject = projectMode === "new" ? customProject.trim() || "global" : selectedProject;

    setLoading(true);
    setErrorMsg(null);
    setDuplicateWarning(null);

    try {
      // 1. Generate vector embedding via /api/reembed serverless route
      const reembedRes = await fetch("/api/reembed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!reembedRes.ok) {
        throw new Error("Failed to generate vector embedding for memory");
      }

      const { embedding } = await reembedRes.json();

      // 2. Dedup check against existing memories if not already confirmed by user
      if (!duplicateConfirmed) {
        const { data: user } = await supabase.auth.getUser();
        const userId = user?.user?.id;

        if (userId) {
          const { data: matches } = await supabase.rpc("match_memories", {
            p_user_id: userId,
            p_project: targetProject,
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
      }

      // 3. Insert record directly into Supabase (skipping LLM extraction pass)
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;

      if (!userId) {
        throw new Error("User session expired. Please sign in again.");
      }

      const { error: insertError } = await supabase.from("memories").insert({
        user_id: userId,
        project: targetProject,
        content: content.trim(),
        embedding: embedding,
        category: category,
        source_tool: "Dashboard Manual",
      });

      if (insertError) throw insertError;

      router.push("/feed");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add memory record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "680px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => router.push("/feed")}
          style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "0.375rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}
        >
          ← Cancel
        </button>
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          Manual Memory Entry
        </span>
      </div>

      {/* Form Container */}
      <div className="bg-surface border-subtle" style={{ padding: "2rem", borderRadius: "8px" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Add Memory Record</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          Manually store an atomic fact, preference, or decision. Skips LLM extraction pass with automatic dedup check.
        </p>

        <form onSubmit={handleAddMemory} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Content */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
              ATOMIC FACT CONTENT
            </label>
            <textarea
              className="input-field"
              style={{ minHeight: "100px", resize: "vertical" }}
              placeholder="e.g. User prefers strict TypeScript types over any or implicit type definitions."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "0.375rem" }}>
              CATEGORY
            </label>
            <select className="input-field" value={category} onChange={(e: any) => setCategory(e.target.value)}>
              <option value="preference">Preference</option>
              <option value="decision">Decision</option>
              <option value="project_detail">Project Detail</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Project Tag */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.375rem" }}>
              <label style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                PROJECT TAG
              </label>
              <button
                type="button"
                onClick={() => setProjectMode(projectMode === "existing" ? "new" : "existing")}
                style={{ background: "none", border: "none", color: "#10b981", fontSize: "0.75rem", cursor: "pointer", fontFamily: "var(--font-mono)" }}
              >
                {projectMode === "existing" ? "+ New Project Tag" : "Select Existing Tag"}
              </button>
            </div>

            {projectMode === "existing" ? (
              <select className="input-field" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                {existingProjects.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input-field"
                placeholder="e.g. wealth-advisor-ai"
                value={customProject}
                onChange={(e) => setCustomProject(e.target.value)}
                required
              />
            )}
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div style={{ padding: "0.75rem", borderRadius: "4px", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#f87171", fontSize: "0.875rem" }}>
              {errorMsg}
            </div>
          )}

          {/* Duplicate Warning Dialog */}
          {duplicateWarning && (
            <div style={{ padding: "1rem", borderRadius: "4px", backgroundColor: "rgba(234, 179, 8, 0.1)", border: "1px solid #eab308", color: "#fef08a", fontSize: "0.875rem" }}>
              <p style={{ marginBottom: "0.75rem" }}>⚠️ {duplicateWarning}</p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.75rem" }}
                  onClick={() => {
                    setDuplicateConfirmed(true);
                    setDuplicateWarning(null);
                  }}
                >
                  Insert Anyway
                </button>
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  style={{ background: "none", border: "1px solid var(--border-color)", color: "var(--text-primary)", padding: "0.25rem 0.75rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: "0.5rem" }}>
            {loading ? "Embedding & Checking Dedup..." : "Save Memory Record"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AddMemoryPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>Loading form...</div>}>
      <AddMemoryForm />
    </Suspense>
  );
}
