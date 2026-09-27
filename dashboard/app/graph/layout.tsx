import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Knowledge Graph Visualization",
  description:
    "Interactive 2D force-directed relationship graph connecting architectural decisions, code preferences, and project entities.",
  alternates: {
    canonical: "/graph",
  },
};

export default function GraphLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
