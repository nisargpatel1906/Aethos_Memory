<p align="center">
  <img src="Aethos Memory.svg" alt="Aethos Memory Logo" width="180" />
</p>

# Aethos Memory

> **Universal, Cross-Tool Memory Bank for your AI Assistants**
> 
> Store preferences, decisions, and project facts once. Access them everywhere across **Claude Code, Cursor, Windsurf, Antigravity, OpenCode, Goose**, and more — with zero vendor lock-in.

---

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Claude Code   │       │  Cursor / IDEs  │       │ Antigravity / AI│
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │ remember()              │ recall()                │ list_memories()
         ▼                         ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Aethos Memory Server                          │
│                (FastMCP Python + Gemini Embeddings)                 │
└──────────────────────────────────┬──────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Supabase Postgres + pgvector                     │
│                        (Central Context Bank)                       │
└─────────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ View / Edit / Manage
                        ┌──────────┴──────────┐
                        │ Next.js Web App UI  │
                        └─────────────────────┘
```

---

## ⚡ Zero to Hero Quickstart Guide (Step-by-Step)

Follow these **5 simple steps** to get Aethos Memory up and running from scratch in under 3 minutes.

### Step 1: Database Setup (1 Minute)

1. Create a free account at [Supabase.com](https://supabase.com) and create a new project.
2. In your Supabase Dashboard, click **SQL Editor** on the left menu.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repository, copy the full SQL script, paste it into the Supabase SQL Editor, and click **Run**.
   *This automatically creates the `memories` table, vector indexes, and semantic search functions.*

---

### Step 2: Get Your Free API Keys

You need just 2 main keys (100% free tier eligible):

1. **Supabase Credentials**:
   - Go to **Project Settings → API** in Supabase.
   - Copy your **Project URL**, **anon key**, and **service_role key**.
2. **Gemini API Key** (for fast 768-dimensional vector embeddings):
   - Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
3. *(Optional)* **Groq API Key**:
   - Get a free key at [Groq Console](https://console.groq.com/keys) for ultra-fast LLM fact extraction.

---

### Step 3: Launch the Dashboard & Web App

1. Open your terminal in the `dashboard/` folder and run:
   ```bash
   cd dashboard
   npm install
   npm run dev
   ```
2. Open **[http://localhost:3000](http://localhost:3000)** (or `http://localhost:3003`) in your browser.
3. Click **Connect Database** on the screen, paste your Supabase URL & Anon Key, and your dashboard is live!

---

### Step 4: Add Aethos Memory to Your AI Tools

Go to the **[http://localhost:3000/setup](http://localhost:3000/setup)** page in your dashboard, select your AI tool and OS (Windows / macOS), and copy your generated MCP configuration snippet!

#### Example: Claude Code / Claude Desktop Configuration
Add this block to your `mcp.json` or `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "GEMINI_API_KEY": "your-gemini-api-key",
        "AETHOS_USER_ID": "your-user-uuid",
        "AETHOS_PROJECT": "global"
      }
    }
  }
}
```

#### Example: Cursor / Windsurf / OpenCode Configuration
Add `aethos-memory` under your MCP server settings using command `uvx` and args `["aethos-memory"]` with your environment variables.

---

### Step 5: Start Remembering & Recalling!

Restart your AI tool, then try these natural prompts in any AI chat:

- **To store a memory**:
  > *"Remember that we strictly mandate Next.js 14 App Router and TailwindCSS for all web projects."*
- **To recall memories in a different AI tool**:
  > *"What tech stack and frameworks do we prefer for web projects?"*
- **To list all memories for a project**:
  > *"List all stored memories for project global."*

---

## 🛠️ MCP Tools Overview

Aethos Memory exposes 4 core tools + 3 automatic alias shortcuts for maximum AI client compatibility:

| Tool Name | Alias Name | Description |
|---|---|---|
| `remember` | `save_memory` | Analyzes conversation and stores facts, decisions, or preferences into vector memory. |
| `recall` | `search_memories` | Performs semantic vector search to find relevant context for current queries. |
| `forget` | `delete_memory` | Deletes a stored memory record by ID or keyword description. |
| `list_memories` | — | Retrieves all stored memory records for a given project tag. |

---

## 🚀 Supported AI Tools & Platforms

- **Claude Code** (CLI)
- **Claude Desktop** (macOS / Windows)
- **Cursor IDE**
- **Windsurf IDE**
- **Google Antigravity**
- **OpenCode**
- **Goose CLI**
- **Aider** (via MCP bridge)
- **VS Code** (Cline / Continue / Roo Code)

---

## 📁 Repository Structure

```
Aethos_Memory/
├── supabase/
│   └── schema.sql            # One-click Postgres + pgvector database migration
├── server/                   # Python FastMCP server package
│   └── src/aethos_memory/    # MCP server logic & providers
├── dashboard/                # Next.js 14 Web Application
│   ├── app/                  # Feed, Setup, Projects, Settings, Add pages
│   └── lib/                  # Supabase client & credentials
└── docs/                     # Architecture & Data Models
```

---

## 🔒 Privacy & Architecture

- **100% Self-Hosted & Private**: Your memories live exclusively inside your own Supabase database.
- **Zero Central Servers**: No third-party proxy server ever touches your data or queries.
- **BYOK (Bring Your Own Keys)**: Fully free-tier compatible with zero monthly cost.
