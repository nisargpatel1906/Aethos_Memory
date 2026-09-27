import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Setup & Client Integrations Guide",
  description:
    "Step-by-step setup guides and MCP configuration snippets for Claude Code, Cursor, OpenCode, Windsurf, and Antigravity IDE.",
  alternates: {
    canonical: "/setup",
  },
};

export default function SetupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
