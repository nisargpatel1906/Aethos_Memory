"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

// Pages that get bare full-screen layout (no sidebar)
const BARE_PATHS = ["/", "/connect", "/onboarding", "/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    // Show brief top progress loader on route change to confirm page switch
    setNavigating(true);
    const timer = setTimeout(() => setNavigating(false), 450);
    return () => clearTimeout(timer);
  }, [pathname]);

  const isBare = BARE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isBare) {
    return (
      <main style={{ minHeight: "100vh", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}>
        {children}
      </main>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-color)", color: "var(--text-primary)", position: "relative" }}>
      {/* Top Page Transition Progress Line */}
      {navigating && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "linear-gradient(90deg, #10b981 0%, #34d399 50%, #60a5fa 100%)",
            boxShadow: "0 0 10px #10b981",
            zIndex: 9999,
            animation: "pulse-emerald 1s infinite alternate",
          }}
        />
      )}

      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, backgroundColor: "var(--bg-color)" }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", backgroundColor: "var(--bg-color)", color: "var(--text-primary)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
