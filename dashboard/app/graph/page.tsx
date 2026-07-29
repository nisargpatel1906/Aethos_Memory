"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { getSupabase } from "../../lib/supabaseClient";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

/* ── colour palette ─────────────────────────────────────── */
const PALETTE = {
  hub:      { fill: "#f59e0b", glow: "rgba(245, 158, 11, 0.6)",  label: "Hub Nodes (8+ links)" },
  medium:   { fill: "#06b6d4", glow: "rgba(6, 182, 212, 0.5)",   label: "Medium (4–7 links)" },
  low:      { fill: "#10b981", glow: "rgba(16, 185, 129, 0.45)",  label: "Standard (1–3 links)" },
  isolated: { fill: "#64748b", glow: "rgba(100, 116, 139, 0.35)", label: "Isolated (0 links)" },
};

function getNodeTier(linkCount: number) {
  if (linkCount >= 8) return PALETTE.hub;
  if (linkCount >= 4) return PALETTE.medium;
  if (linkCount >= 1) return PALETTE.low;
  return PALETTE.isolated;
}

/* ── main component ─────────────────────────────────────── */
export default function GraphView() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  /* ── data fetch ──────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("memories")
        .select("entities, tags, created_at")
        .order("created_at", { ascending: false });

      if (error) console.error("Error loading memories for graph:", error);
      if (data) setMemories(data);
      setLoading(false);
    }
    load();
  }, []);

  /* ── responsive resize ───────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  /* ── build graph data ────────────────────────────────── */
  const graphData = useMemo(() => {
    const nodesMap = new Map<string, { id: string; name: string; val: number; linkCount: number }>();
    const linksMap = new Map<string, { source: string; target: string; val: number }>();

    memories.forEach((m) => {
      let entities = m.entities || [];
      if (!Array.isArray(entities)) entities = [];
      if (entities.length === 0 && Array.isArray(m.tags)) entities = m.tags;

      const names = entities.map((t: string) =>
        t.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
      );

      names.forEach((entity: string) => {
        if (!nodesMap.has(entity)) {
          nodesMap.set(entity, { id: entity, name: entity, val: 1, linkCount: 0 });
        } else {
          nodesMap.get(entity)!.val += 1;
        }
      });

      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const linkId = [names[i], names[j]].sort().join("::");
          if (!linksMap.has(linkId)) {
            linksMap.set(linkId, { source: names[i], target: names[j], val: 1 });
          } else {
            linksMap.get(linkId)!.val += 1;
          }
        }
      }
    });

    // Count links per node
    linksMap.forEach((link) => {
      const s = nodesMap.get(link.source as string);
      const t = nodesMap.get(link.target as string);
      if (s) s.linkCount += 1;
      if (t) t.linkCount += 1;
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksMap.values()),
    };
  }, [memories]);

  /* ── zoom helpers ────────────────────────────────────── */
  const handleZoomIn = useCallback(() => {
    if (graphRef.current) {
      const current = graphRef.current.zoom();
      graphRef.current.zoom(current * 1.4, 400);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (graphRef.current) {
      const current = graphRef.current.zoom();
      graphRef.current.zoom(current / 1.4, 400);
    }
  }, []);

  const handleZoomFit = useCallback(() => {
    if (graphRef.current) graphRef.current.zoomToFit(600, 60);
  }, []);

  /* ── mouse tracking for tooltip ──────────────────────── */
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  }, []);

  /* ── loading state ───────────────────────────────────── */
  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "calc(100vh - 110px)", gap: "1rem",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          border: "3px solid rgba(16,185,129,0.15)",
          borderTopColor: "#10b981",
          animation: "spin 1s linear infinite",
        }} />
        <p style={{ color: "#34d399", fontFamily: "var(--font-mono)", fontSize: "0.8rem" }}>
          Building Knowledge Graph…
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        width: "100%",
        height: "calc(100vh - 110px)",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        background: "radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(6,182,212,0.04) 0%, transparent 50%), #060e0a",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 12px 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* ── Glassmorphism Header ─────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        padding: "1.25rem 1.5rem",
        background: "linear-gradient(180deg, rgba(6,14,10,0.9) 0%, rgba(6,14,10,0.4) 70%, transparent 100%)",
        backdropFilter: "blur(8px)",
        pointerEvents: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Animated graph icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(6,182,212,0.15) 100%)",
            border: "1px solid rgba(16,185,129,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(16,185,129,0.15)",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-inter)", lineHeight: 1.2 }}>
              Knowledge Graph
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "0.15rem", fontFamily: "var(--font-inter)" }}>
              Interactive multi-hop map of your memory entities
            </p>
          </div>
          <div style={{
            marginLeft: "auto",
            display: "flex", gap: "0.5rem", alignItems: "center",
          }}>
            <span style={{
              fontSize: "0.7rem", fontFamily: "var(--font-mono)", fontWeight: 600,
              backgroundColor: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)",
              color: "#34d399", padding: "0.25rem 0.65rem", borderRadius: "8px",
            }}>
              {graphData.nodes.length} nodes
            </span>
            <span style={{
              fontSize: "0.7rem", fontFamily: "var(--font-mono)", fontWeight: 600,
              backgroundColor: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.35)",
              color: "#22d3ee", padding: "0.25rem 0.65rem", borderRadius: "8px",
            }}>
              {graphData.links.length} links
            </span>
          </div>
        </div>
      </div>

      {/* ── Graph Canvas ─────────────────────────────────── */}
      <div style={{ width: "100%", height: "100%", flex: 1, position: "relative" }}>
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width > 0 ? dimensions.width : undefined}
            height={dimensions.height > 0 ? dimensions.height : undefined}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            d3AlphaDecay={0.035}
            d3VelocityDecay={0.3}
            warmupTicks={80}
            cooldownTicks={200}
            nodeLabel=""
            linkCurvature={0.15}
            linkColor={(link: any) => {
              const strength = Math.min((link.val || 1) / 4, 1);
              return `rgba(52, 211, 153, ${0.08 + strength * 0.22})`;
            }}
            linkWidth={(link: any) => Math.min(0.5 + (link.val || 1) * 0.8, 5)}
            linkDirectionalParticles={(link: any) => (link.val || 1) >= 3 ? 2 : 0}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleColor={() => "rgba(52, 211, 153, 0.6)"}
            onNodeHover={(node: any) => setHoveredNode(node)}
            onNodeClick={(node: any) => {
              if (graphRef.current && typeof node.x === "number" && typeof node.y === "number") {
                graphRef.current.centerAt(node.x, node.y, 800);
                graphRef.current.zoom(3.5, 1200);
              }
            }}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              if (typeof node.x !== "number" || typeof node.y !== "number" || isNaN(node.x) || isNaN(node.y)) return;

              const safeScale = globalScale && globalScale > 0 ? globalScale : 1;
              const tier = getNodeTier(node.linkCount || 0);
              const isHovered = hoveredNode && hoveredNode.id === node.id;

              // ── Node radius (power curve) ──
              const baseR = 3 + Math.pow(node.val || 1, 0.6) * 2.5;
              const r = isHovered ? baseR * 1.4 : baseR;

              // ── Outer halo (hub nodes get bigger glow) ──
              if ((node.linkCount || 0) >= 4 || isHovered) {
                const haloR = r * (isHovered ? 3.5 : 2.5);
                const gradient = ctx.createRadialGradient(node.x, node.y, r * 0.5, node.x, node.y, haloR);
                gradient.addColorStop(0, tier.glow);
                gradient.addColorStop(1, "rgba(0,0,0,0)");
                ctx.beginPath();
                ctx.arc(node.x, node.y, haloR, 0, 2 * Math.PI);
                ctx.fillStyle = gradient;
                ctx.fill();
              }

              // ── Inner glow ring ──
              ctx.beginPath();
              ctx.arc(node.x, node.y, r * 1.6, 0, 2 * Math.PI);
              ctx.fillStyle = tier.glow.replace(/[\d.]+\)$/, "0.12)");
              ctx.fill();

              // ── Main node circle ──
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
              const grad = ctx.createRadialGradient(
                node.x - r * 0.3, node.y - r * 0.3, 0,
                node.x, node.y, r
              );
              grad.addColorStop(0, "#ffffff");
              grad.addColorStop(0.3, tier.fill);
              grad.addColorStop(1, tier.fill);
              ctx.fillStyle = grad;
              ctx.shadowColor = tier.glow;
              ctx.shadowBlur = isHovered ? 20 : 10;
              ctx.fill();
              ctx.shadowBlur = 0;

              // ── Bright center dot ──
              ctx.beginPath();
              ctx.arc(node.x - r * 0.2, node.y - r * 0.2, r * 0.25, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(255,255,255,0.7)";
              ctx.fill();

              // ── Label (smart visibility) ──
              const showLabel = isHovered || safeScale > 1.2 || (node.linkCount || 0) >= 4 || (node.val || 1) >= 3;
              if (showLabel) {
                const label = node.name || "";
                const fontSize = Math.min(Math.max(11 / safeScale, 3.5), 20);
                ctx.font = `600 ${fontSize}px Inter, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";

                // Text outline for readability
                ctx.strokeStyle = "rgba(6,14,10,0.85)";
                ctx.lineWidth = fontSize * 0.3;
                ctx.lineJoin = "round";
                ctx.strokeText(label, node.x, node.y + r + fontSize * 0.3);

                // Text fill
                ctx.fillStyle = isHovered ? "#ffffff" : "rgba(248,250,252,0.85)";
                ctx.fillText(label, node.x, node.y + r + fontSize * 0.3);
              }
            }}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              if (typeof node.x !== "number" || typeof node.y !== "number") return;
              const r = 3 + Math.pow(node.val || 1, 0.6) * 2.5;
              ctx.beginPath();
              ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
          />
        ) : (
          /* ── Empty State ─────────────────────────────────── */
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", padding: "3rem", textAlign: "center",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.03) 70%)",
              border: "1px solid rgba(16,185,129,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "1.25rem",
              boxShadow: "0 0 40px rgba(16,185,129,0.1)",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </div>
            <p style={{ color: "#f8fafc", fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.35rem" }}>
              No entities extracted yet
            </p>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", maxWidth: 360, lineHeight: 1.5 }}>
              Connect your AI tool and start chatting. Aethos will automatically extract knowledge entities and build your graph.
            </p>
          </div>
        )}
      </div>

      {/* ── Hover Tooltip ────────────────────────────────── */}
      {hoveredNode && (
        <div style={{
          position: "fixed",
          left: mousePos.x + 16,
          top: mousePos.y - 10,
          zIndex: 50,
          pointerEvents: "none",
          background: "rgba(6,14,10,0.92)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 10,
          padding: "0.55rem 0.85rem",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 16px rgba(16,185,129,0.1)",
          maxWidth: 260,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: getNodeTier(hoveredNode.linkCount || 0).fill,
              boxShadow: `0 0 6px ${getNodeTier(hoveredNode.linkCount || 0).glow}`,
            }} />
            <span style={{ color: "#f8fafc", fontWeight: 700, fontSize: "0.85rem", fontFamily: "var(--font-inter)" }}>
              {hoveredNode.name}
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#94a3b8" }}>
            <span>{hoveredNode.val || 1} mention{(hoveredNode.val || 1) !== 1 ? "s" : ""}</span>
            <span style={{ color: "#64748b" }}>•</span>
            <span>{hoveredNode.linkCount || 0} link{(hoveredNode.linkCount || 0) !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      {/* ── Zoom Controls ────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 20, left: 20, zIndex: 10,
        display: "flex", flexDirection: "column", gap: "0.35rem",
      }}>
        {[
          { label: "+", action: handleZoomIn },
          { label: "−", action: handleZoomOut },
          { label: "⊙", action: handleZoomFit },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              width: 34, height: 34, borderRadius: 8,
              background: "rgba(6,14,10,0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#94a3b8", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", fontWeight: 700,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)";
              e.currentTarget.style.color = "#34d399";
              e.currentTarget.style.background = "rgba(16,185,129,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
              e.currentTarget.style.color = "#94a3b8";
              e.currentTarget.style.background = "rgba(6,14,10,0.8)";
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* ── Legend Panel ──────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 20, right: 20, zIndex: 10,
        background: "rgba(6,14,10,0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "0.65rem 0.85rem",
        display: "flex", flexDirection: "column", gap: "0.35rem",
      }}>
        <span style={{ fontSize: "0.6rem", fontFamily: "var(--font-mono)", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.1rem" }}>
          Legend
        </span>
        {Object.values(PALETTE).map((tier) => (
          <div key={tier.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: tier.fill,
              boxShadow: `0 0 6px ${tier.glow}`,
              flexShrink: 0,
            }} />
            <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "var(--font-inter)", whiteSpace: "nowrap" }}>
              {tier.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
