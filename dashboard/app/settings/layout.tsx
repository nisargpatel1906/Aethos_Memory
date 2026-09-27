import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Settings & System Connections",
  description:
    "Configure API keys, Supabase credentials, model embedding providers, and local cache policies for Aethos Memory.",
  alternates: {
    canonical: "/settings",
  },
};

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
