"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-color, #0b1326)",
        color: "#fff",
        padding: "2rem",
        fontFamily: "var(--font-inter, sans-serif)",
      }}
    >
      <div
        className="bg-surface border-subtle"
        style={{
          padding: "2rem",
          borderRadius: "8px",
          textAlign: "center",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "#f87171" }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary, #94a3b8)", marginBottom: "1.5rem" }}>
          {error.message || "An unexpected error occurred while rendering the page."}
        </p>
        <button
          onClick={() => reset()}
          style={{
            backgroundColor: "#10b981",
            color: "#0b1326",
            border: "none",
            fontWeight: 700,
            fontSize: "0.875rem",
            padding: "0.625rem 1.25rem",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
