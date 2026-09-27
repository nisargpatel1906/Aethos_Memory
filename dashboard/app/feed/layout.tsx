import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Universal Context Feed",
  description:
    "Real-time stream of persistent AI memories synced across Claude Code, Cursor, OpenCode, and Antigravity IDE.",
  alternates: {
    canonical: "/feed",
  },
};

export default function FeedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
