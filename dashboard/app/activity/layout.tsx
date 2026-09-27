import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Activity Log & Audit Trail",
  description:
    "Chronological audit trail of all memory insertions, vector recall queries, and automated context turns.",
  alternates: {
    canonical: "/activity",
  },
};

export default function ActivityLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
