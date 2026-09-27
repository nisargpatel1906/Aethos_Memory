import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Memory Analytics & Visual Insights",
  description:
    "Explore AI memory usage metrics, category distributions, tool breakdown, and vector embedding statistics.",
  alternates: {
    canonical: "/analytics",
  },
};

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
