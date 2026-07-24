import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

export const metadata: Metadata = {
  title: "Aethos Memory — Neural Ledger Dashboard",
  description: "Portable AI memory layer — search, manage, and sync context across all your AI tools.",
};

const LOGIN_PATHS = ["/", "/login", "/onboarding"];

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

/**
 * AppShell decides at runtime (client-side) whether to render the sidebar
 * layout or a bare page. It imports two client components to do so.
 */
import AppShell from "./components/AppShell";
