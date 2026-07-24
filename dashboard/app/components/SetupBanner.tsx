"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface SetupBannerProps {
  memoryCount: number;
}

export default function SetupBanner({ memoryCount }: SetupBannerProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden until we check localStorage

  useEffect(() => {
    // Once user has memories, never show again
    if (memoryCount > 0) {
      localStorage.setItem("aethos_setup_done", "1");
      setDismissed(true);
      return;
    }
    const done = localStorage.getItem("aethos_setup_done");
    const dismissed = localStorage.getItem("aethos_banner_dismissed");
    setDismissed(!!done || !!dismissed);
  }, [memoryCount]);

  const handleDismiss = () => {
    localStorage.setItem("aethos_banner_dismissed", "1");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      style={{
        backgroundColor: "rgba(251,191,36,0.07)",
        border: "1px solid rgba(251,191,36,0.3)",
        borderRadius: "6px",
        padding: "1rem 1.25rem",
        marginBottom: "1.25rem",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fbbf24", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Almost there — connect your AI tool
        </div>

        {/* Step checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {[
            { done: true,  label: "Dashboard is live" },
            { done: false, label: "Copy your MCP config", action: <Link href="/onboarding" style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "#10b981", textDecoration: "none", marginLeft: "0.5rem" }}>Open setup wizard →</Link> },
            { done: false, label: "Paste config into your AI tool & restart it" },
            { done: false, label: "Chat with your AI — memories appear here automatically" },
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem" }}>
              <span style={{ color: step.done ? "#34d399" : "#fbbf24", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                {step.done ? "✓" : "·"}
              </span>
              <span style={{ color: step.done ? "var(--text-secondary)" : "var(--text-primary)" }}>
                {step.label}
              </span>
              {step.action}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleDismiss}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: "1rem",
          flexShrink: 0,
          padding: "0.125rem",
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
