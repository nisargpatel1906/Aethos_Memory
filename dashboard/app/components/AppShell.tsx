"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

// Pages that get bare full-screen layout (no sidebar)
const BARE_PATHS = ["/", "/connect", "/onboarding", "/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isBare) {
    return <main style={{ minHeight: "100vh" }}>{children}</main>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar />
        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
