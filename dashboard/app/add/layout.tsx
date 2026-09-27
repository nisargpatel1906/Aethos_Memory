import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Add New Memory",
  description:
    "Manually insert a persistent fact, architectural decision, or rule into your Aethos Memory vault.",
  alternates: {
    canonical: "/add",
  },
};

export default function AddLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
