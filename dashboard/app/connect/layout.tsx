import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Connect Supabase Database",
  description:
    "Connect your Supabase project URL and keys to activate real-time pgvector sync for Aethos Memory.",
  alternates: {
    canonical: "/connect",
  },
};

export default function ConnectLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
