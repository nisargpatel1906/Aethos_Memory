"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getSupabase, getUserId } from "../../lib/supabaseClient";

interface MemoryCandidate {
  id: string;
  project: string;
  memory_id: string | null;
  state: "candidate" | "approved" | "rejected" | "superseded";
  kind: "workflow" | "correction" | "debugging_pattern" | "gotcha" | "convention" | "preference" | "decision";
  title: string;
  body: string;
  applicability: string;
  tags: string[];
  evidence: Record<string, any>;
  review_reason: string;
  created_at: string;
  approved_at: string | null;
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    workflow:          { label: "Workflow",          bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    correction:        { label: "Correction",        bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
    debugging_pattern: { label: "Debugging Pattern", bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
    gotcha:            { label: "Gotcha",            bg: "rgba(239,68,68,0.15)",  color: "#f87171" },
    convention:        { label: "Convention",        bg: "rgba(16,185,129,0.15)", color: "#34d399" },
  };
  const item = map[kind] || { label: kind, bg: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: item.bg,
        color: item.color,
        fontFamily: "var(--font-mono)",
        fontSize: "0.6875rem",
        fontWeight: 700,
        padding: "0.2rem 0.6rem",
        borderRadius: "12px",
      }}
    >
      {item.label}
    </span>
  );
}

function StateBadge({ state }: { state: string }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    candidate:  { label: "Review Candidate", bg: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "rgba(245,158,11,0.3)" },
    approved:   { label: "Approved Memory",  bg: "rgba(16,185,129,0.15)", color: "#34d399", border: "rgba(16,185,129,0.3)" },
    rejected:   { label: "Rejected",         bg: "rgba(239,68,68,0.12)",  color: "#f87171", border: "rgba(239,68,68,0.3)" },
    superseded: { label: "Superseded",       bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.3)" },
  };
  const item = map[state] || map.candidate;
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
        fontWeight: 700,
        padding: "0.2rem 0.55rem",
        borderRadius: "12px",
      }}
    >
      {item.label}
    </span>
  );
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<MemoryCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("candidate");
  const [kindFilter, setKindFilter] = useState("ALL");
  const [skillModalCandidate, setSkillModalCandidate] = useState<MemoryCandidate | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("memory_candidates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setCandidates(data as MemoryCandidate[]);
      }
    } catch (e) {
      console.error("Failed to load memory candidates:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleApprove = async (cand: MemoryCandidate) => {
    setActionLoadingId(cand.id);
    try {
      const supabase = getSupabase();
      const userId = getUserId();

      // 1. Insert into memories table as verified high-importance memory
      const lessonContent = `[${cand.kind.toUpperCase()}] ${cand.title}\nApplicability: ${cand.applicability}\n\n${cand.body}`;
      const { data: memData } = await supabase
        .from("memories")
        .insert({
          user_id: userId,
          project: cand.project || "global",
          content: lessonContent,
          category: "decision",
          source_tool: `Aethos-Distill (${cand.kind})`,
          importance: 5,
          tags: Array.from(new Set([...(cand.tags || []), cand.kind, "distilled-lesson"])),
        })
        .select()
        .single();

      // 2. Mark candidate approved in database
      await supabase
        .from("memory_candidates")
        .update({
          state: "approved",
          memory_id: memData?.id || null,
          approved_at: new Date().toISOString(),
          review_reason: "Approved by user via Web Dashboard",
          updated_at: new Date().toISOString(),
        })
        .eq("id", cand.id)
        .eq("user_id", userId);

      await fetchCandidates();
    } catch (e) {
      console.error("Failed to approve candidate:", e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (cand: MemoryCandidate) => {
    setActionLoadingId(cand.id);
    try {
      const supabase = getSupabase();
      const userId = getUserId();

      await supabase
        .from("memory_candidates")
        .update({
          state: "rejected",
          review_reason: "Rejected by user via Web Dashboard",
          updated_at: new Date().toISOString(),
        })
        .eq("id", cand.id)
        .eq("user_id", userId);

      await fetchCandidates();
    } catch (e) {
      console.error("Failed to reject candidate:", e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (stateFilter !== "ALL" && c.state !== stateFilter) return false;
      if (kindFilter !== "ALL" && c.kind !== kindFilter) return false;
      return true;
    });
  }, [candidates, stateFilter, kindFilter]);

  const candidateCount = useMemo(() => {
    return candidates.filter((c) => c.state === "candidate").length;
  }, [candidates]);

  const approvedCount = useMemo(() => {
    return candidates.filter((c) => c.state === "approved").length;
  }, [candidates]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Candidate Review &amp; Skill Promotion
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Review high-signal lessons distilled from past debugging runs, approve into active memory, or promote to standard Agent Skills.
          </p>
        </div>
        <button
          onClick={fetchCandidates}
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34d399",
            borderRadius: "10px",
            padding: "0.5rem 1rem",
            fontSize: "0.8125rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh Candidates
        </button>
      </div>

      {/* Overview Stat Counters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ backgroundColor: "var(--card-bg, #18181b)", border: "1px solid var(--border-color, #27272a)", borderRadius: "12px", padding: "1.1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Awaiting Review</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#fbbf24", marginTop: "0.25rem" }}>{candidateCount}</div>
        </div>
        <div style={{ backgroundColor: "var(--card-bg, #18181b)", border: "1px solid var(--border-color, #27272a)", borderRadius: "12px", padding: "1.1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Approved Project Lessons</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#34d399", marginTop: "0.25rem" }}>{approvedCount}</div>
        </div>
        <div style={{ backgroundColor: "var(--card-bg, #18181b)", border: "1px solid var(--border-color, #27272a)", borderRadius: "12px", padding: "1.1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Total Distilled Lessons</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#60a5fa", marginTop: "0.25rem" }}>{candidates.length}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.5rem" }}>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          style={{
            backgroundColor: "var(--input-bg, #18181b)",
            border: "1px solid var(--border-color, #27272a)",
            borderRadius: "10px",
            padding: "0.6rem 0.85rem",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
        >
          <option value="ALL">All States</option>
          <option value="candidate">Awaiting Review (Candidates)</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="superseded">Superseded</option>
        </select>

        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          style={{
            backgroundColor: "var(--input-bg, #18181b)",
            border: "1px solid var(--border-color, #27272a)",
            borderRadius: "10px",
            padding: "0.6rem 0.85rem",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
        >
          <option value="ALL">All Kinds</option>
          <option value="workflow">Workflows</option>
          <option value="correction">Corrections</option>
          <option value="debugging_pattern">Debugging Patterns</option>
          <option value="gotcha">Gotchas</option>
          <option value="convention">Conventions</option>
        </select>
      </div>

      {/* Candidates Feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          Loading distilled memory candidates...
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 1.5rem",
            border: "1px dashed var(--border-color, #27272a)",
            borderRadius: "14px",
            backgroundColor: "rgba(24, 24, 27, 0.4)",
          }}
        >
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>No candidates found</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: "500px", margin: "0.5rem auto 1.5rem" }}>
            When agents finish complex debugging or multi-step tasks, you can distill lessons directly into candidates.
          </p>
          <div style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "#34d399", backgroundColor: "rgba(16,185,129,0.08)", padding: "0.5rem 1rem", borderRadius: "8px", display: "inline-block" }}>
            MCP Tool: distill_lesson(session_trace=&quot;...&quot;)
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredCandidates.map((cand) => {
            const isActing = actionLoadingId === cand.id;
            const dateStr = new Date(cand.created_at).toLocaleDateString();

            return (
              <div
                key={cand.id}
                style={{
                  backgroundColor: "var(--card-bg, #18181b)",
                  border: "1px solid var(--border-color, #27272a)",
                  borderRadius: "14px",
                  padding: "1.25rem 1.5rem",
                }}
              >
                {/* Badges Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <KindBadge kind={cand.kind} />
                    <StateBadge state={cand.state} />
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      Project: {cand.project}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    Distilled: {dateStr}
                  </span>
                </div>

                {/* Candidate Title */}
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.75rem", letterSpacing: "-0.01em" }}>
                  {cand.title}
                </h2>

                {/* Applicability Trigger */}
                {cand.applicability && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      backgroundColor: "rgba(59, 130, 246, 0.08)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.85rem",
                      fontSize: "0.8125rem",
                      color: "#93c5fd",
                    }}
                  >
                    <strong>Trigger Condition:</strong> {cand.applicability}
                  </div>
                )}

                {/* Lesson Body */}
                <div
                  style={{
                    marginTop: "0.85rem",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                    lineHeight: "1.6",
                    whiteSpace: "pre-wrap",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "8px",
                    padding: "0.85rem 1rem",
                    fontFamily: "var(--font-sans, inherit)",
                  }}
                >
                  {cand.body}
                </div>

                {/* Tags */}
                {cand.tags && cand.tags.length > 0 && (
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                    {cand.tags.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: "0.6875rem",
                          fontFamily: "var(--font-mono)",
                          backgroundColor: "rgba(255, 255, 255, 0.06)",
                          color: "var(--text-secondary)",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "6px",
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Controls */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color, #27272a)" }}>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    {cand.state === "candidate" && (
                      <>
                        <button
                          disabled={isActing}
                          onClick={() => handleApprove(cand)}
                          style={{
                            backgroundColor: "#10b981",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "0.45rem 0.9rem",
                            fontSize: "0.8125rem",
                            fontWeight: 700,
                            cursor: isActing ? "not-allowed" : "pointer",
                            opacity: isActing ? 0.7 : 1,
                          }}
                        >
                          Approve &amp; Index
                        </button>
                        <button
                          disabled={isActing}
                          onClick={() => handleReject(cand)}
                          style={{
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                            color: "#f87171",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            borderRadius: "8px",
                            padding: "0.45rem 0.9rem",
                            fontSize: "0.8125rem",
                            fontWeight: 700,
                            cursor: isActing ? "not-allowed" : "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setSkillModalCandidate(cand)}
                      style={{
                        backgroundColor: "rgba(99, 102, 241, 0.15)",
                        color: "#a5b4fc",
                        border: "1px solid rgba(99, 102, 241, 0.35)",
                        borderRadius: "8px",
                        padding: "0.45rem 0.9rem",
                        fontSize: "0.8125rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      Promote to Agent Skill
                    </button>
                  </div>

                  <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    ID: {cand.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skill Promotion Modal */}
      {skillModalCandidate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--card-bg, #18181b)",
              border: "1px solid var(--border-color, #27272a)",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "600px",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>
                Promote to Standard Agent Skill
              </h3>
              <button
                onClick={() => setSkillModalCandidate(null)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
              Promoting creates a permanent <code>.agents/skills/&lt;slug&gt;/SKILL.md</code> in your project repository so all skill-capable AI agents (Cursor, Claude Code, Codex, OpenCode, Antigravity) automatically discover and follow the lesson!
            </p>

            <div
              style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                border: "1px solid var(--border-color, #27272a)",
                borderRadius: "10px",
                padding: "0.85rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8125rem",
                color: "#34d399",
                marginBottom: "1.25rem",
                overflowX: "auto",
              }}
            >
              MCP Tool: promote_to_skill(candidate_id=&quot;{skillModalCandidate.id}&quot;)
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={() => setSkillModalCandidate(null)}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  color: "var(--text-primary)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`promote_to_skill(candidate_id="${skillModalCandidate.id}")`);
                  alert("Copied promote_to_skill command to clipboard!");
                  setSkillModalCandidate(null);
                }}
                style={{
                  backgroundColor: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.5rem 1rem",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Copy MCP Command
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
