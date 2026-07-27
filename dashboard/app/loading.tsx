import React from "react";

export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "65vh",
        gap: "1.25rem",
      }}
    >
      {/* Sleek Dual-Ring Glowing Emerald Spinner */}
      <div style={{ position: "relative", width: "48px", height: "48px" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid rgba(16, 185, 129, 0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "3px solid transparent",
            borderTopColor: "#10b981",
            borderRightColor: "#34d399",
            animation: "spin 0.75s linear infinite",
            filter: "drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))",
          }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
        <span
          style={{
            fontSize: "0.85rem",
            fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
            fontWeight: 600,
          }}
        >
          LOADING...
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
          Fetching context from Aethos Memory
        </span>
      </div>
    </div>
  );
}
