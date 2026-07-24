import "./globals.css";
import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Aethos Memory — Dashboard",
  description: "Portable memory layer for AI tools",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav
          style={{
            borderBottom: "1px solid var(--border-color)",
            backgroundColor: "var(--surface-color)",
            padding: "0.875rem 2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Link href="/feed" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "1.125rem" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)" }} />
            Aethos Memory
          </Link>

          <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>
            <Link href="/feed" style={{ color: "var(--text-primary)" }}>Feed</Link>
            <Link href="/add" style={{ color: "var(--text-secondary)" }}>+ Add</Link>
            <Link href="/projects" style={{ color: "var(--text-secondary)" }}>Projects</Link>
            <Link href="/settings" style={{ color: "var(--text-secondary)" }}>Settings</Link>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
