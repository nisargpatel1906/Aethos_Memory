<div align="center">

<img src="Aethos Memory.svg" alt="Aethos Memory Logo" width="200" />

<br/>
<br/>

# 🧠 Aethos Memory

### Universal, Cross-Tool Persistent Memory for AI Assistants

<img src="Aethos-Memory-Master-Workflow.svg" width="100%" alt="Aethos Memory — System Architecture and Animated Workflow"/>

<br/>

> Store preferences, decisions, and project facts **once**.
> Access them everywhere — across **Claude Code, Cursor, Windsurf, Antigravity, OpenCode, Goose** and more — with **zero vendor lock-in**.

<br/>

[![GitHub Stars](https://img.shields.io/github/stars/nisargpatel1906/Aethos_Memory?style=social)](https://github.com/nisargpatel1906/Aethos_Memory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastMCP](https://img.shields.io/badge/FastMCP-3.4%2B-39CD96?style=flat-square)](https://gofastmcp.com)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)

<br/>

<table>
  <tr>
    <td align="center"><a href="#-zero-to-hero-quickstart"><b>⚡ Quick Start</b></a></td>
    <td align="center"><a href="#-mcp-tools-overview"><b>🔧 MCP Tools</b></a></td>
    <td align="center"><a href="#-how-it-works"><b>🔄 How It Works</b></a></td>
  </tr>
  <tr>
    <td align="center"><a href="#-supported-ai-tools--platforms"><b>🤖 Supported Tools</b></a></td>
    <td align="center"><a href="#-privacy--architecture"><b>🔒 Privacy</b></a></td>
    <td align="center"><a href="#-repository-structure"><b>📁 Structure</b></a></td>
  </tr>
</table>

</div>

<br/>

---

## 💡 Why Aethos Memory?

Every time you start a new chat, your AI assistant forgets everything — your stack, preferences, project decisions, your name. You repeat yourself every session, across every tool.

**Aethos Memory fixes this.** One MCP server, one database, every AI assistant remembers everything — forever.

<table>
  <tr>
    <th>❌ Without Aethos</th>
    <th>✅ With Aethos</th>
  </tr>
  <tr>
    <td>Repeat your tech stack every session</td>
    <td>AI already knows your stack from session 1</td>
  </tr>
  <tr>
    <td>Start from scratch in every tool</td>
    <td>Claude Code, Cursor, OpenCode share one memory</td>
  </tr>
  <tr>
    <td>AI forgets your name and preferences</td>
    <td>Permanent identity and preference store</td>
  </tr>
  <tr>
    <td>Project decisions lost between sessions</td>
    <td>Architecture decisions stored across all sessions</td>
  </tr>
  <tr>
    <td>Vendor locked to one AI tool</td>
    <td>100% portable — works with any MCP client</td>
  </tr>
</table>

<br/>

---

## 🔄 How It Works

```
    Claude Code         OpenCode            Cursor / Windsurf
        |                   |                       |
        | remember()         | recall()              | list_memories()
        v                   v                       v
+---------------------------------------------------------------+
|                    Aethos Memory Server                       |
|              FastMCP · Python · Gemini Embeddings             |
|                                                               |
|   +-----------------------------------------------------+    |
|   |          3-Pass Agentic RAG Retrieval                |    |
|   |  Pass 1: Vector Similarity Search (threshold: 0.50) |    |
|   |  Pass 2: LLM Query Expansion + Broader Retry        |    |
|   |  Pass 3: LLM Relevance Reranking & Filtering        |    |
|   +-----------------------------------------------------+    |
+------------------------------+--------------------------------+
                               |
                               v
+---------------------------------------------------------------+
|                 Supabase Postgres + pgvector                  |
|                   Your Private Context Bank                   |
+---------------------------------------------------------------+
                               ^
                               | View · Edit · Manage
                    +----------+----------+
                    |  Next.js Web App UI |
                    |  localhost:3000     |
                    +---------------------+
```

**The AI never sees your full database.** Aethos uses vector similarity search to retrieve only the few most relevant facts for each query — fast, private, and precise.

<br/>

---

## ⚡ Zero to Hero Quickstart

Get Aethos Memory running in **under 5 minutes** from scratch.

<br/>

### Step 1 — Database Setup

1. Create a free account at [Supabase.com](https://supabase.com) and start a new project.
2. In your Supabase Dashboard, open **SQL Editor**.
3. Copy the full contents of [`supabase/schema.sql`](supabase/schema.sql), paste it into the SQL Editor, and click **Run**.

> *This creates the `memories` table, pgvector indexes, and semantic search functions automatically.*

<br/>

### Step 2 — Get Your Free API Keys

You need **2 keys** (both have generous free tiers):

| Key | Where to Get It | Used For |
|---|---|---|
| **Supabase URL + Service Role Key** | Project Settings → API | Database read/write |
| **Gemini API Key** | [Google AI Studio](https://aistudio.google.com/app/apikey) | 768-dim vector embeddings |
| Groq API Key *(optional)* | [Groq Console](https://console.groq.com/keys) | Fast LLM fact extraction |

<br/>

### Step 3 — Set Up the MCP Server

```bash
# Clone the repository
git clone https://github.com/nisargpatel1906/Aethos_Memory.git
cd Aethos_Memory/server

# Create virtual environment
python -m venv .venv
.venv\Scripts\pip install -e .    # Windows
# source .venv/bin/activate && pip install -e .   # macOS/Linux

# Fill in your credentials
copy .env.example .env    # then edit .env with your keys
```

<br/>

### Step 4 — Launch the Web Dashboard

Double-click **`start.bat`** (Windows) to launch instantly — or run manually:

```bash
cd dashboard
npm install
npm run build && npm start
```

Open **[http://localhost:3000](http://localhost:3000)**, click **Connect Database**, paste your Supabase URL and Anon Key, and your dashboard is live.

<br/>

### Step 5 — Connect to Your AI Tool

Go to **[http://localhost:3000/setup](http://localhost:3000/setup)** and copy your generated MCP config for your tool.

**Claude Code / Claude Desktop** — add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:/path/to/Aethos_Memory/server/.venv/Scripts/python.exe",
      "args": ["C:/path/to/Aethos_Memory/server/run_mcp.py"]
    }
  }
}
```

**OpenCode** — add to `opencode.jsonc`:

```jsonc
{
  "mcp": {
    "aethos-memory": {
      "type": "local",
      "command": [
        "C:/path/to/Aethos_Memory/server/.venv/Scripts/python.exe",
        "C:/path/to/Aethos_Memory/server/run_mcp.py"
      ]
    }
  }
}
```

> Credentials are auto-loaded from `server/.env` — no env vars needed in the client config.

<br/>

### Step 6 — Start Remembering!

Restart your AI tool and just talk naturally:

```
"Remember that I prefer TypeScript and Next.js App Router for all web projects."
→ Stored permanently across all sessions and tools.

"What tech stack do I prefer?"
→ Found: "User prefers TypeScript and Next.js App Router."

"My name is Nisarg Patel."
→ Stored as identity fact. All future sessions will know your name.
```

<br/>

---

## 🔧 MCP Tools Overview

Aethos Memory exposes **4 core tools** + **3 alias shortcuts** for maximum compatibility:

| Tool | Alias | What It Does |
|---|---|---|
| `remember` | `save_memory` | Analyzes conversation, extracts atomic facts, stores them in vector memory |
| `recall` | `search_memories` | 3-pass semantic search — finds the most relevant context for any query |
| `forget` | `delete_memory` | Deletes a stored memory by ID or keyword description |
| `list_memories` | — | Returns all stored memories for a given project tag |

### 🧠 3-Pass Agentic RAG Retrieval

When `recall` is called, Aethos runs a 3-pass intelligent search:

| Pass | Strategy | Threshold |
|---|---|---|
| **1 — Direct Match** | Vector cosine similarity via pgvector | `0.50` |
| **2 — Query Expansion** | LLM rewrites query into broader concept, searches globally | `0.40` |
| **3 — LLM Reranking** | LLM grades candidates by relevance, returns ordered results | — |

<br/>

---

## 🤖 Supported AI Tools & Platforms

<div align="center">

<table>
  <tr>
    <td align="center" width="120"><b>Claude Code</b><br/><sub>CLI + Desktop</sub></td>
    <td align="center" width="120"><b>OpenCode</b><br/><sub>Zen + Build</sub></td>
    <td align="center" width="120"><b>Cursor</b><br/><sub>IDE</sub></td>
    <td align="center" width="120"><b>Windsurf</b><br/><sub>IDE</sub></td>
    <td align="center" width="120"><b>Antigravity</b><br/><sub>AI IDE</sub></td>
  </tr>
  <tr>
    <td align="center" width="120"><b>Goose</b><br/><sub>CLI</sub></td>
    <td align="center" width="120"><b>Aider</b><br/><sub>via MCP bridge</sub></td>
    <td align="center" width="120"><b>Cline</b><br/><sub>VS Code</sub></td>
    <td align="center" width="120"><b>Continue</b><br/><sub>VS Code</sub></td>
    <td align="center" width="120"><b>Any MCP Client</b><br/><sub>OpenAI-compatible</sub></td>
  </tr>
</table>

</div>

> Any tool that supports the **Model Context Protocol (MCP)** works out of the box — no changes needed.

<br/>

---

## 🔒 Privacy & Architecture

| Property | Details |
|---|---|
| **100% Self-Hosted** | Your memories live exclusively in your own Supabase database |
| **Zero Central Servers** | No third-party proxy ever touches your data or queries |
| **BYOK** | Bring Your Own Keys — fully free-tier compatible, $0/month |
| **Row-Level Security** | All memories scoped to your `AETHOS_USER_ID` — one user can never read another's |
| **Secret-Safe Extraction** | API keys and passwords filtered out by extraction prompt — never stored |
| **Project Isolation** | Memories tagged per-project (`global`, `backend`, `dashboard`, etc.) |

<br/>

---

## 📁 Repository Structure

```
Aethos_Memory/
├── Aethos Memory.svg                  # Official logo
├── Aethos-Memory-Master-Workflow.svg  # Architecture diagram
├── start.bat                          # 1-click web app launcher (Windows)
├── start_all.bat                      # Full-stack launcher (Windows)
|
├── supabase/
│   └── schema.sql                     # Postgres + pgvector migration (run once)
|
├── server/                            # Python FastMCP server
│   ├── run_mcp.py                     # Entry point (auto-loads .env)
│   ├── .env                           # Your credentials (never committed)
│   └── src/aethos_memory/
│       ├── server.py                  # MCP tool definitions
│       ├── retrieval.py               # 3-pass Agentic RAG strategies
│       ├── prompts.py                 # Extraction & instruction prompts
│       ├── providers.py               # Gemini embeddings + Groq/OpenRouter LLM
│       ├── db.py                      # Supabase vector operations
│       └── config.py                  # Environment variable loader
|
└── dashboard/                         # Next.js 14 Web Application
    ├── app/
    │   ├── feed/                      # Memory feed & cards
    │   ├── add/                       # Add new memories
    │   ├── projects/                  # Project management
    │   ├── settings/                  # API keys & connection
    │   ├── setup/                     # MCP config generator
    │   └── login/                     # Auth & connect
    └── lib/
        └── supabaseClient.ts          # Supabase client & credentials
```

<br/>

---

## ⭐ Support the Project

Aethos Memory is free and open source. If it saves you time and context-switching pain:

- ⭐ **Star the repo** — it genuinely helps visibility
- 🐛 **Report bugs** in [Issues](https://github.com/nisargpatel1906/Aethos_Memory/issues)
- 💬 **Share feedback** in [Discussions](https://github.com/nisargpatel1906/Aethos_Memory/discussions)
- 🔀 **Contribute** — PRs are welcome!

<br/>

<div align="center">

**Built with ❤️ by [Nisarg Patel](https://github.com/nisargpatel1906)**

[![GitHub](https://img.shields.io/badge/GitHub-nisargpatel1906-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nisargpatel1906/Aethos_Memory)

</div>
