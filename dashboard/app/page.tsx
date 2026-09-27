import RootRedirect from "./components/RootRedirect";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* Dynamic client routing handler for browser sessions */}
      <RootRedirect />

      {/* 
        Semantic, server-rendered content accessible to search crawlers,
        AI answer engines (Perplexity, GPTBot, ClaudeBot), and no-JS clients.
      */}
      <section
        aria-label="Aethos Memory Overview"
        className="crawler-content"
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "2rem 1.5rem",
          color: "#94a3b8",
          fontFamily: "var(--font-inter, sans-serif)",
          lineHeight: "1.6",
        }}
      >
        <header style={{ marginBottom: "2rem", borderBottom: "1px solid #1e293b", paddingBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#f8fafc", marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
            Aethos Memory — Universal Proactive Context Bank for AI Assistants
          </h1>
          <p style={{ fontSize: "1.05rem", color: "#e2e8f0", maxWidth: "800px" }}>
            <strong>Aethos Memory</strong> is an open-source, universal persistent memory layer for AI coding assistants.
            It allows tools like Claude Code, Cursor, OpenCode, Windsurf, and Antigravity IDE to share a unified memory bank,
            permanently preserving technical decisions, coding preferences, and project architecture across sessions.
          </p>
        </header>

        {/* Quick Navigation Links */}
        <nav aria-label="Aethos Memory Navigation" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          <Link href="/feed" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>
            → Open Memory Feed
          </Link>
          <Link href="/setup" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>
            → Setup &amp; Integrations
          </Link>
          <Link href="/connect" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>
            → Connect Supabase Database
          </Link>
          <Link href="/analytics" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>
            → Visual Analytics
          </Link>
          <Link href="/graph" style={{ color: "#34d399", fontWeight: 600, textDecoration: "none" }}>
            → Knowledge Graph
          </Link>
        </nav>

        {/* Comparison Table */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#f8fafc", marginBottom: "1rem" }}>
            Why Aethos Memory?
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b", color: "#f8fafc" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Without Aethos Memory</th>
                  <th style={{ padding: "0.75rem 1rem", color: "#34d399" }}>With Aethos Memory</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>Repeat tech stack and preferences every session</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#f8fafc" }}>AI assistants know stack from session 1</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>Memory siloed per IDE (Cursor, Claude, OpenCode)</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#f8fafc" }}>One shared memory bank across 22+ AI tools</td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <td style={{ padding: "0.75rem 1rem" }}>Architecture decisions lost across conversations</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#f8fafc" }}>Every technical decision stored with 768d vector embeddings</td>
                </tr>
                <tr>
                  <td style={{ padding: "0.75rem 1rem" }}>Vendor lock-in to proprietary AI ecosystem</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#f8fafc" }}>100% portable open-source Model Context Protocol (MCP)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Technical Architecture */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.75rem" }}>
            Technical Architecture
          </h2>
          <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>Protocol:</strong> Model Context Protocol (MCP) using Python 3.10+ FastMCP server.</li>
            <li><strong>Database:</strong> PostgreSQL with pgvector extension and HNSW cosine distance indexing.</li>
            <li><strong>Vector Embeddings:</strong> Google Gemini text-embedding-004 (768 dimensions), Groq, or OpenAI.</li>
            <li><strong>Speed:</strong> 0ms local caching for active session rules; &lt;180ms remote vector search.</li>
            <li><strong>Privacy:</strong> 100% self-hosted, MIT open-source license. No proprietary cloud dependency.</li>
          </ul>
        </section>

        {/* Core MCP Tools */}
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#f8fafc", marginBottom: "0.75rem" }}>
            Core MCP Tools
          </h2>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
            <div>
              <dt style={{ fontFamily: "var(--font-mono)", color: "#34d399", fontWeight: 600 }}>remember(content, category, tags, project)</dt>
              <dd style={{ marginLeft: "1rem" }}>Stores a newly discovered fact, decision, preference, or project detail.</dd>
            </div>
            <div>
              <dt style={{ fontFamily: "var(--font-mono)", color: "#34d399", fontWeight: 600 }}>recall(query, project, limit, threshold)</dt>
              <dd style={{ marginLeft: "1rem" }}>Performs semantic similarity search against stored embeddings.</dd>
            </div>
            <div>
              <dt style={{ fontFamily: "var(--font-mono)", color: "#34d399", fontWeight: 600 }}>get_skeleton_context(project)</dt>
              <dd style={{ marginLeft: "1rem" }}>Generates a high-density system prompt summary of preferences and rules.</dd>
            </div>
            <div>
              <dt style={{ fontFamily: "var(--font-mono)", color: "#34d399", fontWeight: 600 }}>get_knowledge_graph(project)</dt>
              <dd style={{ marginLeft: "1rem" }}>Returns entity nodes and relationship edges discovered in the memory bank.</dd>
            </div>
            <div>
              <dt style={{ fontFamily: "var(--font-mono)", color: "#34d399", fontWeight: 600 }}>auto_save_turn(user_message, assistant_response, project)</dt>
              <dd style={{ marginLeft: "1rem" }}>Passively identifies and saves architectural choices after each conversation turn.</dd>
            </div>
          </dl>
        </section>

        {/* E-E-A-T Signals */}
        <footer style={{ borderTop: "1px solid #1e293b", paddingTop: "1.5rem", fontSize: "0.85rem", color: "#64748b" }}>
          <p>
            Maintained by Nisarg Patel • Open Source under MIT License •{" "}
            <a href="https://github.com/nisargpatel1906/Aethos_Memory" style={{ color: "#34d399" }}>
              GitHub Repository
            </a>{" "}
            • Last updated: September 2026.
          </p>
        </footer>
      </section>
    </div>
  );
}
