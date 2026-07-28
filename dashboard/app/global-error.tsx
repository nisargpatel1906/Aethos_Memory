"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: "#050b08", color: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "2rem" }}>
          <div style={{ backgroundColor: "#0d1914", border: "1px solid rgba(255,255,255,0.08)", padding: "2rem", borderRadius: "16px", textAlign: "center", maxWidth: "480px" }}>
            <h2 style={{ fontSize: "1.25rem", color: "#f87171", marginBottom: "0.5rem" }}>Global Application Error</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {error?.message || "An error occurred in the root layout."}
            </p>
            <button
              onClick={() => reset()}
              style={{ backgroundColor: "#10b981", color: "#021a12", border: "none", fontWeight: 700, padding: "0.6rem 1.25rem", borderRadius: "8px", cursor: "pointer" }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
