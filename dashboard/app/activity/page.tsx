"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getSupabase } from "../../lib/supabaseClient";

interface ActivityEvent {
  id: string;
  project: string;
  session_id: string;
  harness: string;
  event_type: "command" | "tool_call" | "user_message" | "tool_result" | "approval" | "error" | "agent_thought" | "metric";
  title: string;
  payload: Record<string, any>;
  status: "success" | "failed" | "pending" | "blocked" | "warning";
  created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    success: { label: "Success", bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.3)" },
    failed:  { label: "Failed",  bg: "rgba(239,68,68,0.12)",  color: "#f87171", border: "rgba(239,68,68,0.3)" },
    blocked: { label: "Blocked", bg: "rgba(220,38,38,0.15)",  color: "#ef4444", border: "rgba(220,38,38,0.4)" },
    warning: { label: "Warning", bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.3)" },
    pending: { label: "Pending", bg: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "rgba(148,163,184,0.3)" },
  };
  const item = map[status] || map.success;
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

function EventTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    command:       { label: "Command",       bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    tool_call:     { label: "Tool Call",     bg: "rgba(168,85,247,0.15)", color: "#c084fc" },
    tool_result:   { label: "Tool Result",   bg: "rgba(99,102,241,0.15)", color: "#818cf8" },
    user_message:  { label: "User Prompt",   bg: "rgba(16,185,129,0.15)", color: "#34d399" },
    approval:      { label: "Approval",      bg: "rgba(234,179,8,0.15)",  color: "#facc15" },
    error:         { label: "Error",         bg: "rgba(239,68,68,0.15)",  color: "#f87171" },
    agent_thought: { label: "Agent Thought", bg: "rgba(236,72,153,0.15)", color: "#f472b6" },
  };
  const item = map[type] || { label: type, bg: "rgba(148,163,184,0.15)", color: "#94a3b8" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        backgroundColor: item.bg,
        color: item.color,
        fontFamily: "var(--font-mono)",
        fontSize: "0.6875rem",
        fontWeight: 600,
        padding: "0.2rem 0.55rem",
        borderRadius: "8px",
      }}
    >
      {item.label}
    </span>
  );
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [harnessFilter, setHarnessFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("activity_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setEvents(data as ActivityEvent[]);
      }
    } catch (e) {
      console.error("Failed to load activity events:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const harnesses = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.harness) set.add(e.harness);
    });
    return Array.from(set);
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (harnessFilter !== "ALL" && e.harness !== harnessFilter) return false;
      if (typeFilter !== "ALL" && e.event_type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = e.title?.toLowerCase().includes(q);
        const inHarness = e.harness?.toLowerCase().includes(q);
        const inCmd = e.payload?.command?.toLowerCase().includes(q);
        const inTool = e.payload?.tool_name?.toLowerCase().includes(q);
        if (!inTitle && !inHarness && !inCmd && !inTool) return false;
      }
      return true;
    });
  }, [events, harnessFilter, typeFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = events.length;
    const failures = events.filter((e) => e.status === "failed" || e.status === "blocked").length;
    const commands = events.filter((e) => e.event_type === "command").length;
    const activeHarnesses = harnesses.length;
    return { total, failures, commands, activeHarnesses };
  }, [events, harnesses]);

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Cross-Harness Activity Traces
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Real-time execution telemetry and flight recorder across Claude Code, Cursor, OpenCode, Codex, and Antigravity.
          </p>
        </div>
        <button
          onClick={fetchEvents}
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
          Refresh Feed
        </button>
      </div>

      {/* Observability Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ backgroundColor: "var(--card-bg, #18181b)", border: "1px solid var(--border-color, #27272a)", borderRadius: "12px", padding: "1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Total Telemetry Events</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#34d399", marginTop: "0.25rem" }}>{stats.total}</div>
        </div>
        <div style={{ backgroundColor: "var(--card-bg, #18181b)", border: "1px solid var(--border-color, #27272a)", borderRadius: "12px", padding: "1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Commands Executed</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#60a5fa", marginTop: "0.25rem" }}>{stats.commands}</div>
        </div>
        <div style={{ backgroundColor: "var(--card-bg, #18181b)", border: "1px solid var(--border-color, #27272a)", borderRadius: "12px", padding: "1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Recorded Failures</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: stats.failures > 0 ? "#f87171" : "#94a3b8", marginTop: "0.25rem" }}>{stats.failures}</div>
        </div>
        <div style={{ backgroundColor: "var(--card-bg, #18181b)", border: "1px solid var(--border-color, #27272a)", borderRadius: "12px", padding: "1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>Connected Harnesses</div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#c084fc", marginTop: "0.25rem" }}>{stats.activeHarnesses || 1}</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="Search commands, tools, or errors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: "220px",
            backgroundColor: "var(--input-bg, #18181b)",
            border: "1px solid var(--border-color, #27272a)",
            borderRadius: "10px",
            padding: "0.6rem 0.85rem",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
        />

        <select
          value={harnessFilter}
          onChange={(e) => setHarnessFilter(e.target.value)}
          style={{
            backgroundColor: "var(--input-bg, #18181b)",
            border: "1px solid var(--border-color, #27272a)",
            borderRadius: "10px",
            padding: "0.6rem 0.85rem",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
        >
          <option value="ALL">All Harnesses</option>
          {harnesses.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            backgroundColor: "var(--input-bg, #18181b)",
            border: "1px solid var(--border-color, #27272a)",
            borderRadius: "10px",
            padding: "0.6rem 0.85rem",
            color: "var(--text-primary)",
            fontSize: "0.875rem",
          }}
        >
          <option value="ALL">All Event Types</option>
          <option value="command">Commands</option>
          <option value="tool_call">Tool Calls</option>
          <option value="user_message">User Prompts</option>
          <option value="approval">Approvals</option>
          <option value="error">Errors</option>
          <option value="agent_thought">Agent Thoughts</option>
        </select>
      </div>

      {/* Events List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
          Loading activity traces...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 1.5rem",
            border: "1px dashed var(--border-color, #27272a)",
            borderRadius: "14px",
            backgroundColor: "rgba(24, 24, 27, 0.4)",
          }}
        >
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>No activity recorded yet</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", maxWidth: "500px", margin: "0.5rem auto 1.5rem" }}>
            When coding agents run commands, execute tools, or encounter errors, Aethos records them silently here.
          </p>
          <div style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "#34d399", backgroundColor: "rgba(16,185,129,0.08)", padding: "0.5rem 1rem", borderRadius: "8px", display: "inline-block" }}>
            MCP Tool: record_activity(event_type=&quot;command&quot;, command=&quot;npm test&quot;)
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredEvents.map((ev) => {
            const isExpanded = expandedId === ev.id;
            const dateStr = new Date(ev.created_at).toLocaleString();
            const cmd = ev.payload?.command;
            const toolName = ev.payload?.tool_name;
            const err = ev.payload?.error;

            return (
              <div
                key={ev.id}
                style={{
                  backgroundColor: "var(--card-bg, #18181b)",
                  border: "1px solid var(--border-color, #27272a)",
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-secondary)",
                        fontWeight: 700,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "6px",
                      }}
                    >
                      {ev.harness}
                    </span>
                    <EventTypeBadge type={ev.event_type} />
                    <StatusBadge status={ev.status} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {dateStr}
                  </span>
                </div>

                {/* Title / Description */}
                <div style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.6rem" }}>
                  {ev.title}
                </div>

                {/* Command Preview */}
                {cmd && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      backgroundColor: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8125rem",
                      color: "#60a5fa",
                      overflowX: "auto",
                    }}
                  >
                    $ {cmd}
                  </div>
                )}

                {/* Tool Name Preview */}
                {toolName && !cmd && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8125rem",
                      color: "#c084fc",
                    }}
                  >
                    Tool invoked: <strong>{toolName}</strong>
                  </div>
                )}

                {/* Error preview if any */}
                {err && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      borderRadius: "8px",
                      padding: "0.5rem 0.75rem",
                      color: "#f87171",
                      fontSize: "0.8125rem",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Error: {err}
                  </div>
                )}

                {/* Expand / Collapse Payload Details */}
                <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#34d399",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {isExpanded ? "Collapse Raw Payload ▲" : "View Full Payload & Output ▼"}
                  </button>

                  <span style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    ID: {ev.id.slice(0, 8)}...
                  </span>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      backgroundColor: "rgba(0, 0, 0, 0.5)",
                      border: "1px solid var(--border-color, #27272a)",
                      borderRadius: "8px",
                      padding: "0.75rem",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      color: "#e2e8f0",
                      maxHeight: "350px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {JSON.stringify(ev.payload, null, 2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
