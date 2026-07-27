"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AethosLogo from "./AethosLogo";

const DatabaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const TerminalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5"/>
    <line x1="12" y1="19" x2="20" y2="19"/>
  </svg>
);

const NAV_MAIN = [
  { href: "/feed",      label: "Memory Feed", icon: <DatabaseIcon /> },
  { href: "/projects",  label: "Projects",     icon: <FolderIcon /> },
  { href: "/analytics", label: "Analytics",    icon: <AnalyticsIcon /> },
  { href: "/setup",     label: "MCP Setup",    icon: <TerminalIcon /> },
  { href: "/settings",  label: "Settings",     icon: <SettingsIcon /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [todayStr, setTodayStr] = useState("MONDAY, MARCH 27");

  useEffect(() => {
    const d = new Date();
    const formatted = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
    setTodayStr(formatted);
  }, []);

  return (
    <aside
      style={{
        width: "250px",
        backgroundColor: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "1.25rem 1rem",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      <div>
        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", paddingLeft: "0.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <AethosLogo size={26} />
            <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Aethos <span style={{ color: "#10b981" }}>Memory</span>
            </h1>
          </div>
        </div>

        {/* User Welcome Card */}
        <div
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.15)",
            borderRadius: "14px",
            padding: "1rem 1.15rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "#34d399", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "0.25rem" }}>
            {todayStr}
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
            Welcome back, Developer!
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {NAV_MAIN.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.65rem 0.95rem",
                  borderRadius: "12px",
                  fontSize: "0.875rem",
                  fontWeight: active ? 600 : 500,
                  color: active ? "#34d399" : "var(--text-secondary)",
                  backgroundColor: active ? "rgba(16, 185, 129, 0.14)" : "transparent",
                  border: active ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid transparent",
                  boxShadow: active ? "0 4px 16px rgba(16, 185, 129, 0.15)" : "none",
                  transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                  textDecoration: "none",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", color: active ? "#10b981" : "var(--text-muted)" }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sensible & Practical System Status Card */}
      <div
        className="bg-surface border-subtle"
        style={{
          padding: "1rem",
          borderRadius: "14px",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          backgroundColor: "rgba(16, 185, 129, 0.04)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "#34d399", letterSpacing: "0.08em", fontWeight: 700 }}>
            SYSTEM HEALTH
          </span>
          <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#34d399", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <div className="pulse-dot" style={{ width: "6px", height: "6px" }} /> Active
          </span>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Database:</span>
            <span style={{ color: "#f8fafc", fontWeight: 600 }}>Supabase</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Vector Engine:</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>pgvector (768d)</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>MCP Protocol:</span>
            <span style={{ color: "#34d399", fontWeight: 600 }}>FastMCP v2.4</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
