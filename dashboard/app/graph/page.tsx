"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { getSupabase } from "../../lib/supabaseClient";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/* ── colour system ──────────────────────────────────────── */
const TIERS = {
  hub:      { fill: "#fbbf24", core: "#f59e0b", glow: "rgba(251,191,36,0.55)",  ring: "rgba(251,191,36,0.18)", label: "Hub (8+)" },
  high:     { fill: "#38bdf8", core: "#0ea5e9", glow: "rgba(56,189,248,0.45)",  ring: "rgba(56,189,248,0.14)", label: "High (4–7)" },
  med:      { fill: "#34d399", core: "#10b981", glow: "rgba(52,211,153,0.40)",  ring: "rgba(52,211,153,0.12)", label: "Medium (2–3)" },
  low:      { fill: "#94a3b8", core: "#64748b", glow: "rgba(148,163,184,0.30)", ring: "rgba(148,163,184,0.08)", label: "Low (0–1)" },
};
function tier(lc: number) {
  if (lc >= 8) return TIERS.hub;
  if (lc >= 4) return TIERS.high;
  if (lc >= 2) return TIERS.med;
  return TIERS.low;
}

/* ── component ──────────────────────────────────────────── */
export default function GraphView() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>();
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [hovered, setHovered] = useState<any>(null);
  const [focused, setFocused] = useState<any>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  /* ── fetch ───────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const sb = getSupabase();
      const { data, error } = await sb.from("memories").select("entities, tags, created_at").order("created_at", { ascending: false });
      if (error) console.error("Graph load error:", error);
      if (data) setMemories(data);
      setLoading(false);
    })();
  }, []);

  /* ── resize ──────────────────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((es) => {
      for (const e of es) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) setDims({ w: width, h: height });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  /* ── graph data ──────────────────────────────────────── */
  const graphData = useMemo(() => {
    const nm = new Map<string, { id: string; name: string; val: number; linkCount: number }>();
    const lm = new Map<string, { source: string; target: string; val: number }>();

    memories.forEach((m) => {
      let ents = Array.isArray(m.entities) ? m.entities : [];
      if (!ents.length && Array.isArray(m.tags)) ents = m.tags;
      const names = ents.map((t: string) => t.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase()));

      names.forEach((n: string) => {
        const existing = nm.get(n);
        if (existing) existing.val += 1;
        else nm.set(n, { id: n, name: n, val: 1, linkCount: 0 });
      });

      for (let i = 0; i < names.length; i++)
        for (let j = i + 1; j < names.length; j++) {
          const lid = [names[i], names[j]].sort().join("::");
          const existing = lm.get(lid);
          if (existing) existing.val += 1;
          else lm.set(lid, { source: names[i], target: names[j], val: 1 });
        }
    });

    lm.forEach((l) => {
      const s = nm.get(l.source as string);
      const t = nm.get(l.target as string);
      if (s) s.linkCount++;
      if (t) t.linkCount++;
    });

    return { nodes: Array.from(nm.values()), links: Array.from(lm.values()) };
  }, [memories]);

  /* ── neighbour sets for focus mode ───────────────────── */
  const neighbourMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    graphData.links.forEach((l: any) => {
      const s = typeof l.source === "object" ? l.source.id : l.source;
      const t = typeof l.target === "object" ? l.target.id : l.target;
      if (!map.has(s)) map.set(s, new Set());
      if (!map.has(t)) map.set(t, new Set());
      map.get(s)!.add(t);
      map.get(t)!.add(s);
    });
    return map;
  }, [graphData]);

  const isHighlighted = useCallback(
    (nodeId: string) => {
      if (!focused) return true;
      if (focused.id === nodeId) return true;
      return neighbourMap.get(focused.id)?.has(nodeId) ?? false;
    },
    [focused, neighbourMap]
  );

  const isLinkHighlighted = useCallback(
    (link: any) => {
      if (!focused) return true;
      const s = typeof link.source === "object" ? link.source.id : link.source;
      const t = typeof link.target === "object" ? link.target.id : link.target;
      return focused.id === s || focused.id === t;
    },
    [focused]
  );

  /* ── top entities ────────────────────────────────────── */
  const topEntities = useMemo(() => {
    return [...graphData.nodes].sort((a, b) => b.linkCount - a.linkCount).slice(0, 8);
  }, [graphData]);

  /* ── search matches ──────────────────────────────────── */
  const searchMatch = useCallback(
    (name: string) => {
      if (!search) return false;
      return name.toLowerCase().includes(search.toLowerCase());
    },
    [search]
  );

  /* ── zoom ────────────────────────────────────────────── */
  const zoomIn = useCallback(() => { graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 400); }, []);
  const zoomOut = useCallback(() => { graphRef.current?.zoom(graphRef.current.zoom() / 1.5, 400); }, []);
  const zoomFit = useCallback(() => { graphRef.current?.zoomToFit(600, 60); }, []);

  const focusNode = useCallback((node: any) => {
    setFocused(node);
    if (graphRef.current && typeof node.x === "number" && typeof node.y === "number") {
      graphRef.current.centerAt(node.x, node.y, 800);
      graphRef.current.zoom(4, 1000);
    }
  }, []);

  /* ── loading ─────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100vh - 110px)", gap: "1.25rem" }}>
        <div style={{ position: "relative", width: 56, height: 56 }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(16,185,129,0.1)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#10b981", animation: "spin 1s linear infinite" }} />
          <div style={{ position: "absolute", inset: 6, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#38bdf8", animation: "spin 1.5s linear infinite reverse" }} />
        </div>
        <p style={{ color: "#34d399", fontFamily: "var(--font-mono)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>
          Building Knowledge Graph…
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={(e) => setMouse({ x: e.clientX, y: e.clientY })}
      style={{
        width: "100%", height: "calc(100vh - 110px)", borderRadius: 20,
        display: "flex", flexDirection: "column", position: "relative", overflow: "hidden",
        background: "radial-gradient(ellipse at 25% 15%, rgba(16,185,129,0.07) 0%, transparent 50%), radial-gradient(ellipse at 75% 85%, rgba(56,189,248,0.05) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(251,191,36,0.02) 0%, transparent 40%), #060e0a",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 16px 48px rgba(0,0,0,0.6)",
      }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        padding: "1rem 1.25rem 2rem",
        background: "linear-gradient(180deg, rgba(6,14,10,0.95) 0%, rgba(6,14,10,0.5) 60%, transparent 100%)",
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", pointerEvents: "auto" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(56,189,248,0.15))",
            border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(16,185,129,0.12)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-inter)", lineHeight: 1.1 }}>Knowledge Graph</h1>
            <p style={{ color: "#64748b", fontSize: "0.7rem", fontFamily: "var(--font-inter)" }}>Interactive entity relationship map</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem", alignItems: "center" }}>
            {/* Search toggle */}
            <button onClick={() => { setShowSearch(!showSearch); setSearch(""); }}
              style={{ width: 30, height: 30, borderRadius: 8, background: showSearch ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)", border: "1px solid " + (showSearch ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.08)"), color: showSearch ? "#34d399" : "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", transition: "all 0.2s" }}>
              ⌕
            </button>
            {showSearch && (
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entities…"
                style={{
                  width: 160, padding: "0.3rem 0.6rem", borderRadius: 8, fontSize: "0.72rem",
                  background: "rgba(0,0,0,0.4)", border: "1px solid rgba(16,185,129,0.3)",
                  color: "#f8fafc", outline: "none", fontFamily: "var(--font-mono)",
                }}
              />
            )}
            {focused && (
              <button onClick={() => setFocused(null)}
                style={{ padding: "0.25rem 0.55rem", borderRadius: 8, fontSize: "0.65rem", fontFamily: "var(--font-mono)", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", color: "#fbbf24", cursor: "pointer", fontWeight: 600, transition: "all 0.2s" }}>
                ✕ Clear Focus
              </button>
            )}
            <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", fontWeight: 600, backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#34d399", padding: "0.2rem 0.55rem", borderRadius: 8 }}>
              {graphData.nodes.length}
            </span>
            <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", fontWeight: 600, backgroundColor: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#38bdf8", padding: "0.2rem 0.55rem", borderRadius: 8 }}>
              {graphData.links.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Canvas ────────────────────────────────────────── */}
      <div style={{ width: "100%", height: "100%", flex: 1, position: "relative" }}>
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            width={dims.w > 0 ? dims.w : undefined}
            height={dims.h > 0 ? dims.h : undefined}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            d3AlphaDecay={0.03}
            d3VelocityDecay={0.25}
            warmupTicks={100}
            cooldownTicks={250}
            nodeLabel=""
            linkCurvature={0.18}
            linkColor={(link: any) => {
              if (!isLinkHighlighted(link)) return "rgba(255,255,255,0.02)";
              const v = Math.min((link.val || 1) / 4, 1);
              return `rgba(52,211,153,${0.06 + v * 0.24})`;
            }}
            linkWidth={(link: any) => {
              if (!isLinkHighlighted(link)) return 0.3;
              return Math.min(0.4 + (link.val || 1) * 0.7, 4.5);
            }}
            linkDirectionalParticles={(link: any) => {
              if (!isLinkHighlighted(link)) return 0;
              return (link.val || 1) >= 2 ? 3 : 1;
            }}
            linkDirectionalParticleWidth={(link: any) => Math.min(1 + (link.val || 1) * 0.4, 3)}
            linkDirectionalParticleSpeed={0.003}
            linkDirectionalParticleColor={(link: any) => {
              if (!isLinkHighlighted(link)) return "transparent";
              return "rgba(52,211,153,0.7)";
            }}
            onNodeHover={(node: any) => setHovered(node)}
            onNodeClick={(node: any) => focusNode(node)}
            onBackgroundClick={() => setFocused(null)}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              if (typeof node.x !== "number" || typeof node.y !== "number" || isNaN(node.x) || isNaN(node.y)) return;

              const scale = globalScale && globalScale > 0 ? globalScale : 1;
              const t = tier(node.linkCount || 0);
              const hl = isHighlighted(node.id);
              const isHov = hovered?.id === node.id;
              const isFoc = focused?.id === node.id;
              const isSearched = search && searchMatch(node.name);
              const dimmed = !hl && !isSearched;

              // ── Radius ──
              const baseR = 2.5 + Math.pow(node.val || 1, 0.55) * 2.2;
              const r = isHov ? baseR * 1.5 : isFoc ? baseR * 1.6 : baseR;

              if (dimmed) {
                // Dim mode: ghost circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, r * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(100,116,139,0.08)";
                ctx.fill();
                return;
              }

              // ── Search pulse ring ──
              if (isSearched) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, r * 4, 0, Math.PI * 2);
                ctx.strokeStyle = "rgba(251,191,36,0.35)";
                ctx.lineWidth = 1.5 / scale;
                ctx.stroke();
              }

              // ── Outer atmospheric halo ──
              if ((node.linkCount || 0) >= 4 || isHov || isFoc) {
                const haloR = r * (isFoc ? 5 : isHov ? 4 : 3);
                const g1 = ctx.createRadialGradient(node.x, node.y, r * 0.3, node.x, node.y, haloR);
                g1.addColorStop(0, t.glow);
                g1.addColorStop(0.4, t.ring);
                g1.addColorStop(1, "rgba(0,0,0,0)");
                ctx.beginPath();
                ctx.arc(node.x, node.y, haloR, 0, Math.PI * 2);
                ctx.fillStyle = g1;
                ctx.fill();
              }

              // ── Mid ring ──
              ctx.beginPath();
              ctx.arc(node.x, node.y, r * 1.8, 0, Math.PI * 2);
              ctx.fillStyle = t.ring;
              ctx.fill();

              // ── Focus ring (animated look via double ring) ──
              if (isFoc) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, r * 2.4, 0, Math.PI * 2);
                ctx.strokeStyle = t.fill;
                ctx.lineWidth = 0.8 / scale;
                ctx.setLineDash([3 / scale, 3 / scale]);
                ctx.stroke();
                ctx.setLineDash([]);
              }

              // ── Main orb ──
              const g2 = ctx.createRadialGradient(node.x - r * 0.25, node.y - r * 0.25, 0, node.x, node.y, r);
              g2.addColorStop(0, "rgba(255,255,255,0.9)");
              g2.addColorStop(0.25, t.fill);
              g2.addColorStop(0.8, t.core);
              g2.addColorStop(1, t.core);
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
              ctx.fillStyle = g2;
              ctx.shadowColor = t.glow;
              ctx.shadowBlur = isFoc ? 24 : isHov ? 18 : 8;
              ctx.fill();
              ctx.shadowBlur = 0;

              // ── Specular highlight ──
              const g3 = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.35, 0, node.x - r * 0.2, node.y - r * 0.25, r * 0.5);
              g3.addColorStop(0, "rgba(255,255,255,0.75)");
              g3.addColorStop(1, "rgba(255,255,255,0)");
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
              ctx.fillStyle = g3;
              ctx.fill();

              // ── Label ──
              const showLbl = isHov || isFoc || isSearched || scale > 1.4 || (node.linkCount || 0) >= 4 || (node.val || 1) >= 4;
              if (showLbl) {
                const fs = Math.min(Math.max(10 / scale, 3), 16);
                ctx.font = `700 ${fs}px Inter, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                const y = node.y + r + fs * 0.35;

                // Outline
                ctx.strokeStyle = "rgba(6,14,10,0.9)";
                ctx.lineWidth = fs * 0.35;
                ctx.lineJoin = "round";
                ctx.strokeText(node.name, node.x, y);

                // Fill
                ctx.fillStyle = isFoc || isHov ? "#ffffff" : isSearched ? "#fbbf24" : "rgba(248,250,252,0.82)";
                ctx.fillText(node.name, node.x, y);
              }
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              if (typeof node.x !== "number" || typeof node.y !== "number") return;
              const r = 2.5 + Math.pow(node.val || 1, 0.55) * 2.2;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r + 5, 0, Math.PI * 2);
              ctx.fillStyle = color;
              ctx.fill();
            }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "3rem", textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </div>
            <p style={{ color: "#f8fafc", fontWeight: 700, fontSize: "1rem" }}>No entities extracted yet</p>
            <p style={{ color: "#64748b", fontSize: "0.82rem", maxWidth: 340, marginTop: "0.3rem", lineHeight: 1.5 }}>
              Start chatting with your AI tool. Aethos will extract entities and build your knowledge graph automatically.
            </p>
          </div>
        )}
      </div>

      {/* ── Hover Tooltip ─────────────────────────────────── */}
      {hovered && !focused && (
        <div style={{
          position: "fixed", left: mouse.x + 14, top: mouse.y - 8, zIndex: 50, pointerEvents: "none",
          background: "rgba(6,14,10,0.94)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          padding: "0.5rem 0.75rem",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)",
          maxWidth: 240,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.15rem" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: tier(hovered.linkCount || 0).fill, boxShadow: `0 0 8px ${tier(hovered.linkCount || 0).glow}` }} />
            <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.8rem" }}>{hovered.name}</span>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "#64748b" }}>
            <span><span style={{ color: "#94a3b8" }}>{hovered.val || 1}</span> mentions</span>
            <span>·</span>
            <span><span style={{ color: "#94a3b8" }}>{hovered.linkCount || 0}</span> links</span>
          </div>
        </div>
      )}

      {/* ── Focus Panel ───────────────────────────────────── */}
      {focused && (
        <div style={{
          position: "absolute", top: 70, right: 16, zIndex: 10, width: 200,
          background: "rgba(6,14,10,0.92)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
          padding: "0.85rem", boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: tier(focused.linkCount || 0).fill, boxShadow: `0 0 10px ${tier(focused.linkCount || 0).glow}` }} />
            <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", flex: 1 }}>{focused.name}</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.65rem" }}>
            <span style={{ fontSize: "0.62rem", fontFamily: "var(--font-mono)", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34d399", padding: "0.15rem 0.4rem", borderRadius: 6 }}>
              {focused.val} mentions
            </span>
            <span style={{ fontSize: "0.62rem", fontFamily: "var(--font-mono)", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", color: "#38bdf8", padding: "0.15rem 0.4rem", borderRadius: 6 }}>
              {focused.linkCount} links
            </span>
          </div>
          <div style={{ fontSize: "0.6rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.3rem", fontFamily: "var(--font-mono)" }}>
            Connected To
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", maxHeight: 180, overflowY: "auto" }}>
            {[...neighbourMap.get(focused.id) || []].slice(0, 12).map((nId) => {
              const n = graphData.nodes.find((nd: any) => nd.id === nId);
              if (!n) return null;
              return (
                <button key={nId} onClick={() => focusNode(n)}
                  style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.4rem", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", color: "#94a3b8", fontSize: "0.7rem", textAlign: "left", transition: "all 0.15s", fontFamily: "var(--font-inter)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.08)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.25)"; e.currentTarget.style.color = "#34d399"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#94a3b8"; }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: tier(n.linkCount || 0).fill, flexShrink: 0 }} />
                  {n.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Zoom Controls ─────────────────────────────────── */}
      <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 10, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {[{ l: "+", a: zoomIn }, { l: "−", a: zoomOut }, { l: "⊙", a: zoomFit }].map((b) => (
          <button key={b.l} onClick={b.a}
            style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(6,14,10,0.85)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 700, transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"; e.currentTarget.style.color = "#34d399"; e.currentTarget.style.background = "rgba(16,185,129,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "rgba(6,14,10,0.85)"; }}>
            {b.l}
          </button>
        ))}
      </div>

      {/* ── Top Entities Panel ─────────────────────────────── */}
      {!focused && topEntities.length > 0 && (
        <div style={{
          position: "absolute", bottom: 16, right: 16, zIndex: 10,
          background: "rgba(6,14,10,0.88)", backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12,
          padding: "0.6rem 0.7rem", maxWidth: 180,
        }}>
          <div style={{ fontSize: "0.55rem", color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.35rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
            Top Entities
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            {topEntities.map((e) => (
              <button key={e.id} onClick={() => focusNode(e)}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0.3rem", borderRadius: 5, background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "0.66rem", textAlign: "left", transition: "all 0.15s", fontFamily: "var(--font-inter)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: tier(e.linkCount).fill, boxShadow: `0 0 4px ${tier(e.linkCount).glow}`, flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                <span style={{ fontSize: "0.58rem", color: "#475569", fontFamily: "var(--font-mono)" }}>{e.linkCount}</span>
              </button>
            ))}
          </div>
          {/* Legend */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "0.4rem", paddingTop: "0.35rem", display: "flex", flexWrap: "wrap", gap: "0.3rem 0.5rem" }}>
            {Object.values(TIERS).map((t) => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: t.fill, flexShrink: 0 }} />
                <span style={{ fontSize: "0.52rem", color: "#475569", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
