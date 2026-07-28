"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { getSupabase } from "../../lib/supabaseClient";

// Dynamically import react-force-graph-2d so it only renders on client
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export default function GraphView() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  // ResizeObserver for 100% accurate responsive container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodesMap = new Map();
    const linksMap = new Map();

    memories.forEach((m) => {
      let entities = m.entities || [];
      if (!Array.isArray(entities)) entities = [];
      
      // Fallback to tags if entities empty
      if (entities.length === 0 && Array.isArray(m.tags)) {
        entities = m.tags;
      }

      const nodes = entities.map((t: string) => {
        return t.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      });

      nodes.forEach((entity: string) => {
        if (!nodesMap.has(entity)) {
          nodesMap.set(entity, { id: entity, name: entity, val: 1 });
        } else {
          const node = nodesMap.get(entity);
          node.val += 1;
        }
      });

      // Create links between co-occurring entities
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const source = nodes[i];
          const target = nodes[j];
          const linkId = [source, target].sort().join("::");
          
          if (!linksMap.has(linkId)) {
            linksMap.set(linkId, { source, target, val: 1 });
          } else {
            const link = linksMap.get(linkId);
            link.val += 1;
          }
        }
      }
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links: Array.from(linksMap.values()),
    };
  }, [memories]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <p className="text-emerald-400 font-mono text-sm animate-pulse">Loading Knowledge Graph...</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-surface border-subtle relative overflow-hidden"
      style={{
        width: "100%",
        height: "calc(100vh - 110px)",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header Overlay */}
      <div className="absolute top-5 left-6 z-10 pointer-events-none">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f8fafc", fontFamily: "var(--font-inter)" }}>
            Knowledge Graph
          </h1>
          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", backgroundColor: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#34d399", padding: "0.2rem 0.65rem", borderRadius: "12px", fontWeight: 600 }}>
            {graphData.nodes.length} Nodes • {graphData.links.length} Links
          </span>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginTop: "0.25rem", fontFamily: "var(--font-inter)" }}>
          Interactive multi-hop map of technologies, stack decisions, and preferences.
        </p>
      </div>

      <div style={{ width: "100%", height: "100%", flex: 1, position: "relative" }}>
        {graphData.nodes.length > 0 ? (
          <ForceGraph2D
            ref={graphRef}
            width={dimensions.width > 0 ? dimensions.width : undefined}
            height={dimensions.height > 0 ? dimensions.height : undefined}
            graphData={graphData}
            backgroundColor="#0d1914"
            d3AlphaDecay={0.04}
            nodeLabel="name"
            linkColor={() => "rgba(52, 211, 153, 0.3)"}
            linkWidth={(link) => Math.min((link.val || 1) * 1.5, 6)}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              if (typeof node.x !== "number" || typeof node.y !== "number" || isNaN(node.x) || isNaN(node.y)) {
                return;
              }
              const safeScale = globalScale && globalScale > 0 ? globalScale : 1;
              const label = node.name || "";
              const fontSize = Math.min(Math.max(13 / safeScale, 4), 32);
              ctx.font = `600 ${fontSize}px Inter, sans-serif`;

              // Node circle glow
              const r = Math.max(5 + (node.val || 1) * 1.5, 6);
              ctx.beginPath();
              ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
              ctx.fillStyle = "#10b981";
              ctx.shadowColor = "rgba(16, 185, 129, 0.9)";
              ctx.shadowBlur = 12;
              ctx.fill();
              ctx.shadowBlur = 0;

              // Node text label
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = "#f8fafc";
              ctx.fillText(label, node.x, node.y + r + fontSize + 1);
            }}
            onNodeClick={(node: any) => {
              if (graphRef.current && typeof node.x === "number" && typeof node.y === "number") {
                graphRef.current.centerAt(node.x, node.y, 800);
                graphRef.current.zoom(3.5, 1200);
              }
            }}
          />
        ) : graphData.nodes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-12 text-center">
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", color: "#34d399" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "auto" }}>
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            </div>
            <p style={{ color: "#f8fafc", fontWeight: 600, fontSize: "1rem", marginBottom: "0.25rem" }}>No entities extracted yet</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Connect your AI tool or manually add memories to visualize your knowledge graph.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
