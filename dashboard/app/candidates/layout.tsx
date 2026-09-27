import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Memory Candidates & Staging",
  description:
    "Review, approve, or discard candidate memories automatically detected by AI coding assistants.",
  alternates: {
    canonical: "/candidates",
  },
};

export default function CandidatesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
