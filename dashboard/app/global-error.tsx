"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, backgroundColor: "#0b1326", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ textAlign: "center", maxWidth: "450px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f87171", marginBottom: "0.5rem" }}>
              Application Error
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {error?.message || "A critical error occurred."}
            </p>
            <button
              onClick={() => reset()}
              style={{ backgroundColor: "#10b981", color: "#0b1326", border: "none", fontWeight: 700, padding: "0.75rem 1.5rem", borderRadius: "4px", cursor: "pointer" }}
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
