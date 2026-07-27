"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function TopBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/feed?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header
      style={{
        height: "64px",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: "var(--surface-glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Date Pill Selector (Official Emerald Brand Colors) */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 0.85rem",
            borderRadius: "10px",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            fontSize: "0.8125rem",
            color: "#34d399",
            fontFamily: "var(--font-mono)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          This Month
        </div>
      </div>

      {/* Center Search Input */}
      <div style={{ position: "relative", width: "420px" }}>
        <span
          style={{
            position: "absolute",
            left: "0.85rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search memories or vector facts... (press Enter)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          className="input-field"
          style={{ paddingLeft: "2.4rem", paddingRight: "4rem", height: "38px", fontSize: "0.825rem", borderRadius: "10px" }}
        />
        <span
          style={{
            position: "absolute",
            right: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "0.65rem",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            border: "1px solid var(--border-color)",
            padding: "0.15rem 0.4rem",
            borderRadius: "4px",
            pointerEvents: "none",
          }}
        >
          ↵ Enter
        </span>
      </div>

      {/* Right Action Bar: Pure Emerald Brand Button */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link href="/analytics" className="btn-ghost" style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}>
          Manage Analytics
        </Link>
        <Link href="/add" className="btn-primary" style={{ textDecoration: "none", fontSize: "0.8rem", padding: "0.45rem 0.95rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add New Memory
        </Link>
      </div>
    </header>
  );
}
