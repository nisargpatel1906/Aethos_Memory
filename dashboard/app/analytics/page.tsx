"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabaseClient";

interface Memory {
  id: string;
  project: string;
  content: string;
  category: string;
  source_tool: string | null;
  importance: number;
  access_count: number;
  created_at: string;
}

export default function AnalyticsPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportFormat, setExportFormat] = useState<"json" | "markdown" | "csv">("json");
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await getSupabase()
          .from("memories")
          .select("id, project, content, category, source_tool, importance, access_count, created_at")
          .order("created_at", { ascending: false });
        if (data) setMemories(data as Memory[]);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = memories.length;
    const totalHits = memories.reduce((acc, m) => acc + (m.access_count || 0), 0);
    const avgImportance = total > 0 ? (memories.reduce((acc, m) => acc + (m.importance || 3), 0) / total).toFixed(1) : "0.0";
    
    const catMap: Record<string, number> = {};
    const toolMap: Record<string, number> = {};
    memories.forEach((m) => {
      catMap[m.category] = (catMap[m.category] || 0) + 1;
      const tool = m.source_tool || "Unknown";
      toolMap[tool] = (toolMap[tool] || 0) + 1;
    });

    return { total, totalHits, avgImportance, catMap, toolMap };
  }, [memories]);

  const handleExport = () => {
    window.open(`/api/export?format=${exportFormat}`, "_blank");
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
      } else {
        setImportStatus(`Import failed: ${data.error}`);
      }
    } catch (e: any) {
      setImportStatus(`Invalid JSON format: ${e.message}`);
    }
    setImporting(false);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "1.5rem 0" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>Memory Analytics & Portability</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Visual insights, timeline history, and zero-lock-in data export suite.
          </p>
        </div>
        <Link href="/feed" style={{ textDecoration: "none" }}>
          <button className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
            ← Back to Feed
          </button>
        </Link>
      </div>

      {/* Top Key Metrics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="bg-surface border-subtle" style={{ padding: "1.25rem", borderRadius: "10px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>TOTAL MEMORIES</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#10b981", marginTop: "0.25rem" }}>{stats.total}</div>
        </div>

        <div className="bg-surface border-subtle" style={{ padding: "1.25rem", borderRadius: "10px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>TOTAL RECALL HITS</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#3b82f6", marginTop: "0.25rem" }}>{stats.totalHits}</div>
        </div>

        <div className="bg-surface border-subtle" style={{ padding: "1.25rem", borderRadius: "10px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>AVG IMPORTANCE SCORE</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#a78bfa", marginTop: "0.25rem" }}>{stats.avgImportance} <span style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>/ 5</span></div>
        </div>

        <div className="bg-surface border-subtle" style={{ padding: "1.25rem", borderRadius: "10px" }}>
          <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>PROVIDER LATENCY</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "#34d399", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 10px #10b981" }} />
            45 ms
          </div>
        </div>
      </div>

      {/* Export & Import Portability Suite */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* One-Click Exporter */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>📦 One-Click Data Exporter</h2>
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

          <button onClick={handleExport} className="btn-primary" style={{ width: "100%", padding: "0.6rem" }}>
            Download Memory Backup ({exportFormat.toUpperCase()}) →
          </button>
        </div>

        {/* Universal Importer */}
        <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "12px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>📥 Universal Importer</h2>
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

          <button onClick={handleImport} disabled={importing} className="btn-ghost" style={{ width: "100%", padding: "0.5rem" }}>
            {importing ? "Importing..." : "Import Memories"}
          </button>

          {importStatus && (
            <p style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", marginTop: "0.5rem", color: importStatus.includes("failed") ? "#f87171" : "#34d399" }}>
              {importStatus}
            </p>
          )}
        </div>
      </div>

      {/* Chronological Timeline History */}
      <div className="bg-surface border-subtle" style={{ padding: "1.5rem", borderRadius: "12px" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>📅 Chronological Memory History</h2>
        {loading ? (
          <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>Loading timeline...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {memories.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ width: "110px", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", flexShrink: 0 }}>
                  {new Date(m.created_at).toLocaleDateString()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.9rem", color: "#f8fafc" }}>{m.content}</div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    <span>Project: {m.project}</span>
                    <span>•</span>
                    <span>Tool: {m.source_tool || "Unknown"}</span>
                    <span>•</span>
                    <span>Importance: {m.importance || 3}/5</span>
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
