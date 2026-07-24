import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "./components/AppShell";

export const metadata: Metadata = {
  title: "Aethos Memory",
  description: "Portable AI memory layer — search, manage, and sync context across all your AI tools.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" style={{ backgroundColor: "#0b1326", colorScheme: "dark" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ backgroundColor: "#0b1326", color: "#f8fafc", minHeight: "100vh" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
