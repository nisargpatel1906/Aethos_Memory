import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found | Aethos Memory",
  description: "The requested Aethos Memory page could not be found.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "520px" }}>
        <div
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "4rem",
            fontWeight: 800,
            color: "#10b981",
            lineHeight: 1,
            marginBottom: "1rem",
          }}
        >
          404
        </div>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "#f8fafc",
            marginBottom: "0.75rem",
            letterSpacing: "-0.02em",
          }}
        >
          Memory Not Found
        </h1>
        <p
          style={{
            color: "#94a3b8",
            fontSize: "0.95rem",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          The route you requested does not exist or has been relocated. Return to your memory feed or check setup guides.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/feed"
            className="btn-primary"
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "8px",
              backgroundColor: "#10b981",
              color: "#042f2e",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            ← Open Memory Feed
          </Link>
          <Link
            href="/setup"
            style={{
              padding: "0.65rem 1.25rem",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "#f8fafc",
              fontWeight: 500,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Setup Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
