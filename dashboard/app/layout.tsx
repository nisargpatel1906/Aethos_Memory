import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import AppShell from "./components/AppShell";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aethosmemory.com";

export const viewport: Viewport = {
  themeColor: "#0b1326",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aethos Memory — Universal Proactive Context Bank for AI Agents",
    template: "%s | Aethos Memory",
  },
  description:
    "Universal, cross-tool persistent memory layer for AI assistants. Automatically capture, sync, and recall context, architectural decisions, and preferences across Claude Code, Cursor, OpenCode, and Antigravity IDE.",
  keywords: [
    "Aethos Memory",
    "AI memory",
    "Model Context Protocol",
    "MCP",
    "FastMCP",
    "pgvector",
    "Claude Code",
    "Cursor",
    "OpenCode",
    "Antigravity IDE",
    "vector search",
    "AI developer tools",
    "persistent context",
  ],
  authors: [{ name: "Nisarg Patel", url: "https://github.com/nisargpatel1906" }],
  creator: "Nisarg Patel",
  publisher: "Aethos Memory",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Aethos Memory — Universal Context Bank for AI Agents",
    description:
      "Universal, cross-tool persistent memory layer for AI coding assistants. Eliminates context loss between Claude Code, Cursor, OpenCode, and Antigravity IDE.",
    url: siteUrl,
    siteName: "Aethos Memory",
    images: [
      {
        url: "/logo.svg",
        width: 350,
        height: 350,
        alt: "Aethos Memory Universal AI Context Bank Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aethos Memory — Universal Proactive Context Bank for AI Agents",
    description:
      "Cross-tool persistent memory layer for AI assistants powered by FastMCP and Supabase pgvector.",
    images: ["/logo.svg"],
    creator: "@nisargpatel1906",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Aethos Memory",
  url: siteUrl,
  description: "Universal, cross-tool persistent memory layer for AI coding assistants.",
  author: {
    "@type": "Person",
    name: "Nisarg Patel",
    url: "https://github.com/nisargpatel1906",
  },
};

const jsonLdSoftwareApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aethos Memory",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Windows, macOS, Linux",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  license: "https://opensource.org/licenses/MIT",
  description:
    "Universal persistent memory bank for AI assistants. Syncs context, technical decisions, and user preferences across Claude Code, Cursor, OpenCode, and Antigravity IDE via Model Context Protocol (MCP) and Supabase pgvector.",
  featureList: [
    "Cross-tool context retention across 22+ AI IDEs and CLI agents",
    "FastMCP 3.4+ server with 768-dimensional vector embeddings",
    "Supabase pgvector HNSW semantic similarity search",
    "Automatic turn-by-turn memory extraction and entity detection",
    "Interactive Knowledge Graph and real-time dashboard",
    "Zero-latency local cache fallback",
  ],
  author: {
    "@type": "Person",
    name: "Nisarg Patel",
    url: "https://github.com/nisargpatel1906",
  },
};

const jsonLdFAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Aethos Memory?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aethos Memory is an open-source, universal persistent memory layer for AI coding assistants. It allows AI tools such as Claude Code, Cursor, OpenCode, and Antigravity IDE to share a unified memory bank, preserving technical decisions, coding preferences, and project architecture permanently across sessions.",
      },
    },
    {
      "@type": "Question",
      name: "Which AI tools are supported by Aethos Memory?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aethos Memory supports Claude Code, Cursor, OpenCode, Windsurf, Antigravity IDE, Cline, Roo Code, Claude Desktop, and any client compatible with the Model Context Protocol (MCP).",
      },
    },
    {
      "@type": "Question",
      name: "How does Aethos Memory store and search context?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Memories are stored in a PostgreSQL database with pgvector, indexed via HNSW cosine distance. Text embeddings are generated using Gemini text-embedding-004 (768 dimensions), Groq, or OpenAI models. A local cache provides 0ms instant retrieval for active sessions.",
      },
    },
    {
      "@type": "Question",
      name: "Is my data private with Aethos Memory?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Aethos Memory is 100% open-source (MIT licensed) and self-hosted. All memory contents and credentials remain exclusively in your local environment or your private Supabase database. No user data is sent to external third-party servers.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" style={{ backgroundColor: "#0b1326", colorScheme: "dark" }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftwareApp) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
        />
      </head>
      <body style={{ backgroundColor: "#0b1326", color: "#f8fafc", minHeight: "100vh" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
