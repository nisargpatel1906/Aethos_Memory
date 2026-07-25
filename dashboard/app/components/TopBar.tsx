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
        height: "60px",
        borderBottom: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.5rem",
        flexShrink: 0,
      }}
    >
      {/* Live Search */}
      <div style={{ position: "relative", width: "480px" }}>
        <span
          style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-secondary)",
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
          placeholder="Search memories… (press Enter)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
          className="input-field"
          style={{ paddingLeft: "2.25rem", height: "36px", fontSize: "0.8125rem" }}
        />
      </div>

      {/* Right-side actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/add" className="btn-primary" style={{ textDecoration: "none" }}>
          + Add Memory
        </Link>
      </div>
    </header>
  );
}
