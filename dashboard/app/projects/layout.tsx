import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Projects & Workspace Scopes",
  description:
    "Manage workspace isolation tags, project-specific memories, and cross-project knowledge boundaries.",
  alternates: {
    canonical: "/projects",
  },
};

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
