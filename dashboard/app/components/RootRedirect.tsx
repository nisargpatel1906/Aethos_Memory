"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import AethosLogo from "./AethosLogo";
import { hasCredentials } from "../../lib/supabaseClient";

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (hasCredentials()) {
      router.replace("/feed");
    } else {
      router.replace("/connect");
    }
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-color, #0b1326)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <AethosLogo size={48} />
        <div style={{ marginTop: "1.25rem", fontSize: "0.875rem", fontFamily: "var(--font-mono, monospace)", color: "var(--text-secondary, #94a3b8)" }}>
          Loading Aethos Memory…
        </div>
      </div>
    </div>
  );
}
