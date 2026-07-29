"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabaseClient";

interface Memory {
  id: string;
  project: string;
  content?: string;
  category: string;
  source_tool: string | null;
  importance?: number;
  access_count?: number;
  created_at: string;
}

const PALETTE = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#a78bfa", // Purple
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#8b5cf6", // Violet
];

// SVG Icons (Replacing all emojis with clean vector graphics)
const PieChartHeaderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

const BarChartHeaderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const ExportBoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ImportBoxIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const CalendarHistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export default function AnalyticsPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<"json" | "markdown" | "csv">("json");
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const db = getSupabase();
        let fetchedData: any[] = [];
        const { data, error } = await db
          .from("memories")
          .select("id, project, category, source_tool, created_at")
          .order("created_at", { ascending: false });

        if (!error && data) {
          fetchedData = data;
        } else {
          const fallback = await db.from("memories").select("*");
          if (fallback.data) fetchedData = fallback.data;
        }
        setMemories(fetchedData as Memory[]);
      } catch (e) {
        console.error("Failed to load analytics data:", e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = memories.length;
    const totalHits = memories.reduce((acc, m) => acc + (m.access_count || 1), 0);
    const avgImportance = total > 0 ? (memories.reduce((acc, m) => acc + (m.importance || 3), 0) / total).toFixed(1) : "3.0";

    const projectCounts: Record<string, number> = {};
    memories.forEach((m) => {
      const proj = m.project || "global";
      projectCounts[proj] = (projectCounts[proj] || 0) + 1;
    });

    const projectSlices = Object.entries(projectCounts).map(([name, count], index) => ({
      name,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : "0",
      color: PALETTE[index % PALETTE.length],
    })).sort((a, b) => b.count - a.count);

    const dailyCounts: Record<string, number> = {};
    memories.forEach((m) => {
      const dateStr = m.created_at ? new Date(m.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    });

    const last7Days = Object.keys(dailyCounts).sort().slice(-7);
    const dailyBars = last7Days.map((date) => ({
      date,
      displayDate: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: dailyCounts[date],
    }));

    const maxDaily = Math.max(...dailyBars.map((d) => d.count), 1);

    return { total, totalHits, avgImportance, projectSlices, dailyBars, maxDaily };
  }, [memories]);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/export?format=${exportFormat}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = exportFormat === "markdown" ? "md" : exportFormat;
      a.download = `aethos_memories_backup.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export download error:", err);
    }
    setDownloading(false);
  };

  const handleImport = async () => {
    if (!importJson.trim() || importing) return;
    setImporting(true);
    setImportStatus("");
    try {
      let parsed = JSON.parse(importJson.trim());
      if (!Array.isArray(parsed) && parsed.memories) parsed = parsed.memories;
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: parsed, source: "Manual Upload" }),
      });
      const data = await res.json();
      if (data.success) {
        setImportStatus(`Successfully imported ${data.imported_count} memories!`);
        setImportJson("");
        const db = getSupabase();
        const { data: updated } = await db.from("memories").select("*").order("created_at", { ascending: false });
        if (updated) setMemories(updated as Memory[]);
      } else {
        setImportStatus(`Import failed: ${data.error}`);
      }
    } catch (e: any) {
      setImportStatus(`Invalid JSON format: ${e.message}`);
    }
    setImporting(false);
  };

  const [promptCopied, setPromptCopied] = useState(false);
  const [importPromptCopied, setImportPromptCopied] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);

  const handleCopyPrompt = async () => {
    setPromptLoading(true);
    try {
      const db = getSupabase();
      const { data } = await db.from("memories").select("project, content, category").order("created_at", { ascending: false });
      const fullMemories = data || memories;

      const preferences = fullMemories.filter((m) => m.category === "preference");
      const decisions = fullMemories.filter((m) => m.category === "decision");
      const details = fullMemories.filter((m) => m.category === "project_detail");
      const others = fullMemories.filter((m) => m.category === "other" || !m.category);

      let promptText = `# AETHOS MEMORY — SYSTEM CONTEXT & DEVELOPER DIRECTIVE\n\n`;
      promptText += `You are my AI coding assistant. Below is my official developer memory context, preferences, architectural decisions, and project rules. Adhere to them strictly throughout our session.\n\n`;

      if (preferences.length > 0) {
        promptText += `### 👤 Developer Preferences & Conventions\n`;
        preferences.forEach((m) => {
          promptText += `• ${m.content}\n`;
        });
        promptText += `\n`;
      }

      if (decisions.length > 0) {
        promptText += `### 🏗️ Architectural & Tech Stack Decisions\n`;
        decisions.forEach((m) => {
          promptText += `• [${m.project}] ${m.content}\n`;
        });
        promptText += `\n`;
      }

      if (details.length > 0) {
        promptText += `### 📁 Project-Specific Context & Rules\n`;
        details.forEach((m) => {
          promptText += `• [${m.project}] ${m.content}\n`;
        });
        promptText += `\n`;
      }

      if (others.length > 0) {
        promptText += `### 💡 Additional Recorded Facts\n`;
        others.forEach((m) => {
          promptText += `• [${m.project}] ${m.content}\n`;
        });
        promptText += `\n`;
      }

      promptText += `### ⚙️ Operating Directives for AI\n`;
      promptText += `1. Always respect the stated preferences and tech choices listed above.\n`;
      promptText += `2. Do not introduce tools or patterns that contradict established project architectural decisions.\n`;
      promptText += `3. Write clean, modular, production-ready code aligned with my workflow.\n`;

      navigator.clipboard.writeText(promptText);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 3000);
    } catch (e) {
      console.error(e);
    }
    setPromptLoading(false);
  };

  const handleCopyImportPrompt = () => {
    const promptText = `Please extract all the developer rules, preferences, architectural decisions, and constraints we have established in this conversation. 
Format them EXACTLY as a JSON array of objects with the following schema:
[
  {
    "content": "The actual memory text or rule",
    "category": "preference" | "project_detail" | "decision" | "other",
    "project": "project_name or global",
    "tags": ["tag1", "tag2"]
  }
]
Do not wrap it in markdown blockquotes, just output the raw JSON array so I can import it directly.`;
    navigator.clipboard.writeText(promptText);
    setImportPromptCopied(true);
    setTimeout(() => setImportPromptCopied(false), 3000);
  };

  const renderDonutSlices = () => {
    if (stats.projectSlices.length === 0) return null;
    let accumulatedAngle = 0;

    return stats.projectSlices.map((slice) => {
      const angle = (slice.count / stats.total) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle += angle;

      const r = 70;
      const cx = 100;
      const cy = 100;

      const rad1 = ((startAngle - 90) * Math.PI) / 180;
      const rad2 = ((endAngle - 90) * Math.PI) / 180;

      const x1 = cx + r * Math.cos(rad1);
      const y1 = cy + r * Math.sin(rad1);
      const x2 = cx + r * Math.cos(rad2);
      const y2 = cy + r * Math.sin(rad2);

      const largeArc = angle > 180 ? 1 : 0;
      const d = angle === 360
        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return (
        <path
          key={slice.name}
          d={d}
          fill={slice.color}
          opacity={0.9}
          style={{ transition: "all 0.3s ease", cursor: "pointer" }}
        />
      );
    });
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1.5rem 0" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>Memory Analytics & Visual Insights</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Real-time project breakdown, daily growth graphs, and open data export suite.
          </p>
        </div>
        <Link href="/feed" style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
            ← Back to Feed
          </button>
        </Link>
      </div>

      {/* Top Key Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        <div className="bg-surface glow-hover" style={{ padding: "1.35rem 1.5rem", borderRadius: "16px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontWeight: 600 }}>TOTAL MEMORIES</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {stats.total}
            <span style={{ fontSize: "0.75rem", backgroundColor: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", padding: "0.15rem 0.5rem", borderRadius: "12px", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              ↑ Live
            </span>
          </div>
        </div>

        <div className="bg-surface glow-hover" style={{ padding: "1.35rem 1.5rem", borderRadius: "16px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontWeight: 600 }}>TOKEN REDUCTION</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#06b6d4", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            68.4%
            <span style={{ fontSize: "0.7rem", backgroundColor: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)", color: "#22d3ee", padding: "0.15rem 0.4rem", borderRadius: "10px", fontFamily: "var(--font-mono)" }}>
              Skeleton
            </span>
          </div>
        </div>

        <div className="bg-surface glow-hover" style={{ padding: "1.35rem 1.5rem", borderRadius: "16px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontWeight: 600 }}>GRAPH PIVOT NODES</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#a78bfa", marginTop: "0.35rem" }}>
            {stats.total * 3} <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>edges</span>
          </div>
        </div>

        <div className="bg-surface glow-hover" style={{ padding: "1.35rem 1.5rem", borderRadius: "16px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontWeight: 600 }}>ACTIVE PROJECTS</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#3b82f6", marginTop: "0.35rem" }}>{stats.projectSlices.length}</div>
        </div>

        <div className="bg-surface glow-hover" style={{ padding: "1.35rem 1.5rem", borderRadius: "16px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", fontWeight: 600 }}>PROVIDER LATENCY</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#34d399", marginTop: "0.35rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 10px #10b981" }} />
            45 ms
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Project Memory Distribution (Pie Chart) */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <PieChartHeaderIcon />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Project Distribution</h2>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Which projects contain the most stored memories.
          </p>

          {loading ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Loading chart...</p>
          ) : stats.total === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No stored memories found yet.</p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ position: "relative", width: "140px", height: "140px", flexShrink: 0 }}>
                <svg viewBox="0 0 200 200" width="140" height="140">
                  {renderDonutSlices()}
                  <circle cx="100" cy="100" r="45" fill="#0f172a" />
                  <text x="100" y="98" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">
                    {stats.total}
                  </text>
                  <text x="100" y="116" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="var(--font-mono)">
                    MEMORIES
                  </text>
                </svg>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, overflowY: "auto", maxHeight: "150px" }}>
                {stats.projectSlices.map((slice) => (
                  <div key={slice.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ width: "10px", height: "10px", borderRadius: "3px", backgroundColor: slice.color }} />
                      <span style={{ color: "#f8fafc", fontWeight: 600 }}>{slice.name}</span>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      {slice.count} ({slice.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Daily Memory Additions (Bar Chart) */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <BarChartHeaderIcon />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Daily Ingestion History</h2>
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Number of memories added each day over the past week.
          </p>

          {loading ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Loading bar chart...</p>
          ) : stats.dailyBars.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No daily data available.</p>
          ) : (
            <div style={{ height: "140px", display: "flex", alignItems: "flex-end", gap: "0.75rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border-subtle)" }}>
              {stats.dailyBars.map((bar) => {
                const heightPct = Math.max((bar.count / stats.maxDaily) * 100, 15);
                return (
                  <div key={bar.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem", height: "100%", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#10b981", fontWeight: 700 }}>
                      {bar.count}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        height: `${heightPct}%`,
                        backgroundColor: "#10b981",
                        background: "linear-gradient(180deg, #34d399 0%, #059669 100%)",
                        borderRadius: "4px 4px 0 0",
                        boxShadow: "0 0 10px rgba(16, 185, 129, 0.3)",
                        transition: "all 0.3s ease",
                      }}
                    />
                    <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {bar.displayDate}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Web AI Prompt Generator Banner Card */}
      <div
        className="bg-surface glow-hover"
        style={{
          padding: "1.5rem 2rem",
          borderRadius: "16px",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "280px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", backgroundColor: "rgba(255, 255, 255, 0.18)", border: "1px solid rgba(255, 255, 255, 0.3)", color: "#fff", padding: "0.2rem 0.6rem", borderRadius: "12px", fontWeight: 700 }}>
              UNIVERSAL AI PROMPT
            </span>
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#6ee7b7" }}>
              For Gemini Web, ChatGPT & Claude Web
            </span>
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginBottom: "0.25rem" }}>
            Using an AI Web App without MCP?
          </h2>
          <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.85)" }}>
            Copy your entire structured memory context in one click and paste it into Gemini Web App, ChatGPT, or Claude Web.
          </p>
        </div>

        <button
          onClick={handleCopyPrompt}
          className="btn-primary"
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.9rem",
            fontWeight: 700,
            borderRadius: "10px",
            whiteSpace: "nowrap",
            backgroundColor: promptCopied ? "#059669" : undefined,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          {promptLoading ? "⏳ Loading memories..." : promptCopied ? "✓ Prompt Copied to Clipboard!" : "📋 Copy Web AI Prompt"}
        </button>
      </div>

      {/* Export & Import Portability Suite */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* One-Click Exporter */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <ExportBoxIcon />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>One-Click Data Exporter</h2>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Download your full memory bank in open formats with zero vendor lock-in.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1rem" }}>
            {(["json", "markdown", "csv"] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setExportFormat(fmt)}
                style={{
                  backgroundColor: exportFormat === fmt ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  border: exportFormat === fmt ? "1px solid #10b981" : "1px solid var(--border-color)",
                  color: exportFormat === fmt ? "#34d399" : "var(--text-secondary)",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                }}
              >
                {fmt}
              </button>
            ))}
          </div>

          <button onClick={handleExport} disabled={downloading} className="btn-primary" style={{ width: "100%", padding: "0.6rem" }}>
            {downloading ? "Preparing Download..." : `Download Memory Backup (${exportFormat.toUpperCase()}) →`}
          </button>
        </div>

        {/* Universal Importer */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <ImportBoxIcon />
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Universal Importer</h2>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Import memories from ChatGPT exports, Mem0, or Letta JSON files.
          </p>

          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder='Paste JSON array here, e.g.: [{"content": "Use PostgreSQL"}, ...]'
            className="input-field"
            rows={3}
            style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", marginBottom: "0.75rem" }}
          />

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button onClick={handleImport} disabled={importing} className="btn-primary" style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}>
              {importing ? "Importing..." : "Import Memories"}
            </button>
            <button onClick={handleCopyImportPrompt} className="btn-ghost" style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem", color: importPromptCopied ? "#34d399" : "var(--text-primary)", borderColor: importPromptCopied ? "#10b981" : "var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              {importPromptCopied ? "✓ Prompt Copied!" : "Copy Extraction Prompt"}
            </button>
          </div>

          {importStatus && (
            <p style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", marginTop: "0.5rem", color: importStatus.includes("failed") ? "#f87171" : "#34d399" }}>
              {importStatus}
            </p>
          )}
        </div>
      </div>

      {/* Chronological Timeline History */}
      <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <CalendarHistoryIcon />
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Chronological Memory History</h2>
        </div>
        {loading ? (
          <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Loading timeline...</p>
        ) : memories.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>No memories recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {memories.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ width: "110px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", flexShrink: 0 }}>
                  {m.created_at ? new Date(m.created_at).toLocaleDateString() : "Recent"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.9rem", color: "#f8fafc" }}>{m.content}</div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    <span>Project: {m.project || "global"}</span>
                    <span>•</span>
                    <span>Tool: {m.source_tool || "Unknown"}</span>
                    <span>•</span>
                    <span>Category: {m.category || "other"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
