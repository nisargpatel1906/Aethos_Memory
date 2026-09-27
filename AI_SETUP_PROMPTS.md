# 🧠 Aethos Memory: Complete System Setup & AI Assistant Configuration Guide

> **Universal, Cross-Tool Persistent Memory, Observability, and Threat Guardrails for AI Assistants**  
> One MCP server, one Supabase database, 25+ tools, 5 cognitive superpowers — shared across all your AI assistants forever.

---

## 📑 Table of Contents

1. [System Architecture & Capabilities](#-system-architecture--capabilities)
2. [Prerequisites & Account Setup](#-prerequisites--account-setup)
3. [Step 1: Database Setup (Supabase + pgvector)](#-step-1-database-setup-supabase--pgvector)
4. [Step 2: FastMCP Python Server Setup](#-step-2-fastmcp-python-server-setup)
5. [Step 3: Web Dashboard Setup (Next.js 14)](#-step-3-web-dashboard-setup-nextjs-14)
6. [Step 4: 1-Click Launchers (Windows & Cross-Platform)](#-step-4-1-click-launchers-windows--cross-platform)
7. [The Master Zero-Touch AI Setup Prompt (Automate Everything)](#-the-master-zero-touch-ai-setup-prompt)
8. [The 5-Pillar Aethos Memory Intelligence Directive](#-the-5-pillar-aethos-memory-intelligence-directive)
9. [Zero-Touch Setup Prompts for 23+ AI Tools](#-zero-touch-setup-prompts-for-23-ai-tools)
   - [1. OpenCode (CLI)](#1-opencode-cli)
   - [2. Claude Code (CLI)](#2-claude-code-cli)
   - [3. Cursor IDE](#3-cursor-ide)
   - [4. Windsurf IDE](#4-windsurf-ide)
   - [5. Google Antigravity IDE](#5-google-antigravity-ide)
   - [6. Claude Desktop](#6-claude-desktop)
   - [7. Zed Editor](#7-zed-editor)
   - [8. OpenAI Codex CLI](#8-openai-codex-cli)
   - [9. Gemini CLI](#9-gemini-cli)
   - [10. Cline (VS Code Extension)](#10-cline-vs-code-extension)
   - [11. Continue.dev](#11-continuedev)
   - [12. Roo Code](#12-roo-code)
   - [13. Kilo Code](#13-kilo-code)
   - [14. Aider CLI](#14-aider-cli)
   - [15. Goose CLI](#15-goose-cli)
   - [16. OpenHands](#16-openhands)
   - [17. Replit Agent](#17-replit-agent)
   - [18. Lovable](#18-lovable)
   - [19. Bolt.new / Bolt.diy](#19-boltnew--boltdiy)
   - [20. v0 (Vercel)](#20-v0-vercel)
   - [21. Devin](#21-devin)
   - [22. LibreChat](#22-librechat)
   - [23. Gemini Spark (Cloud MCP via Ngrok)](#23-gemini-spark-cloud-mcp-via-ngrok)
10. [Verification & Testing Playbook](#-verification--testing-playbook)
11. [Troubleshooting & FAQ](#-troubleshooting--faq)

---

## 🏛️ System Architecture & Capabilities

```
+---------------------------------------------------------------------------------------+
|                                  AI ASSISTANT HARNESSES                               |
|   Claude Code | OpenCode | Cursor | Windsurf | Antigravity | Cline | Devin | Spark    |
+---------------------------------------------------------------------------------------+
           |                     |                   |                   |
    audit_action()        remember() / recall()    record_activity()   distill_lesson()
    (Pre-flight Safety)   (3-Pass Agentic RAG)     (Flight Recorder)   (Skills Promo)
           |                     |                   |                   |
           v                     v                   v                   v
+---------------------------------------------------------------------------------------+
|                               AETHOS MEMORY MCP SERVER                                |
|  - FastMCP Core: 25 Tools across 5 Cognitive Pillars                                  |
|  - Aethos Sentinel: Threat Rules & Pre-Flight Execution Auditor                       |
|  - Telemetry Logger: Activity Flight Recorder with Automatic Secret Scrubbing         |
|  - Aethos Distill: Traces-to-Skills Distillation & Candidate Workflow Engine          |
|  - Knowledge Graph: Entity Extraction & Multi-Hop Co-occurrence Pivoting             |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                             SUPABASE (PostgreSQL + pgvector)                          |
|  - public.memories (768-dim embeddings, entity JSONB, tag arrays, importance, kind)   |
|  - public.memory_versions (Full immutable revision history & temporal tracking)       |
|  - public.activity_events (Flight recorder: tool calls, stdout/stderr, diffs, audits) |
|  - public.memory_candidates (Distilled lessons awaiting user review / skill promo)    |
+---------------------------------------------------------------------------------------+
                                           ^
                                           | Inspect, Review & Promote
+---------------------------------------------------------------------------------------+
|                             NEXT.JS 14 WEB DASHBOARD                                  |
|  - /feed        : Memory Cards, Importance Badges, Search & Tag Filters               |
|  - /graph       : Interactive Multi-Hop Knowledge Graph Visualizer                    |
|  - /activity    : Activity Traces, Flight Recorder & Execution Analytics              |
|  - /candidates  : Candidate Review, Diff Inspector & 1-Click Skill Promotion          |
|  - /setup       : Dynamic MCP Configuration Snippets for Any Harness                  |
+---------------------------------------------------------------------------------------+
```

---

## 📦 Prerequisites & Account Setup

Before starting, ensure you have the following installed on your machine:

| Component | Minimum Version | Check Command | Download / Signup |
|---|---|---|---|
| **Python** | 3.10 or higher (3.11+ recommended) | `python --version` | [python.org/downloads](https://www.python.org/downloads/) *(Check "Add Python to PATH")* |
| **Node.js** | 18.x or higher | `node --version` | [nodejs.org](https://nodejs.org) |
| **Git** | Any recent version | `git --version` | [git-scm.com](https://git-scm.com) |
| **Supabase** | Free Tier Account | — | [supabase.com](https://supabase.com) |
| **Google Gemini API** | Free Tier API Key | — | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| **Groq API** *(Optional)* | Free Tier API Key (Ultra-fast) | — | [console.groq.com/keys](https://console.groq.com/keys) |

---

## 🗄️ Step 1: Database Setup (Supabase + pgvector)

1. **Create a Free Supabase Project:**
   - Log in to [supabase.com](https://supabase.com) and click **New Project**.
   - Set a name (e.g. `Aethos_Memory`), set a strong database password, and choose your preferred region.
   - Wait ~60 seconds for the database to provision.

2. **Execute Database Migrations:**
   - In your Supabase project dashboard, click **SQL Editor** in the left sidebar.
   - Click **New Query**.
   - Copy the entire contents of [`supabase/schema.sql`](supabase/schema.sql) from this repository.
   - Paste it into the SQL Editor and click **Run**.
   - Verify success. This creates:
     - The `vector` extension (`pgvector`)
     - Table `public.memories` with 768-dimensional vector cosine indexes
     - Table `public.memory_versions` (audit revisions)
     - Table `public.activity_events` (flight recorder telemetry)
     - Table `public.memory_candidates` (distilled lessons awaiting review)
     - Table `public.api_keys`
     - Database match functions (`match_memories`) and Row Level Security (RLS) policies.

3. **Retrieve Credentials from Supabase:**
   - Go to **Project Settings** (gear icon in lower-left) $\to$ **API**.
   - Copy and save:
     - **Project URL** (e.g. `https://xyzproject.supabase.co`)
     - **anon / public key** (safe for frontend dashboard)
     - **service_role key** (secret key required for FastMCP server)

---

## 🐍 Step 2: FastMCP Python Server Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/nisargpatel1906/Aethos_Memory.git
   cd Aethos_Memory
   ```

2. **Create and Activate Python Virtual Environment:**
   - **On Windows (PowerShell):**
     ```powershell
     cd server
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     # If execution policy blocks activation:
     # Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
     ```
   - **On macOS / Linux:**
     ```bash
     cd server
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Dependencies in Editable Mode:**
   ```bash
   pip install -e .
   ```

4. **Configure Environment Variables (`server/.env`):**
   Copy `.env.example` to `.env`:
   - **Windows:** `copy .env.example .env`
   - **macOS/Linux:** `cp .env.example .env`

   Edit `server/.env` with your actual values:
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your-service-role-key...

   # Embedding & Extraction Providers
   GEMINI_API_KEY=AIzaSy...your-gemini-api-key...
   GROQ_API_KEY=gsk_...your-groq-key... # Optional, recommended for fast LLM extraction

   # Identity & Scope
   AETHOS_USER_ID=your-user-uuid-or-unique-id
   AETHOS_PROJECT=global
   AETHOS_SOURCE_TOOL=MCP Server
   ```

   > **Tip on `AETHOS_USER_ID`:** You can use any UUID or string identifier for yourself (e.g. `00000000-0000-0000-0000-000000000001` or your Supabase Auth User ID). All memories and activity traces will be scoped to this user.

5. **Test FastMCP Server Execution:**
   ```bash
   python run_mcp.py
   ```
   If configured properly, the server will load `.env` and start listening on standard input/output (stdio) with all 25 tools registered. Press `Ctrl+C` to stop.

---

## 💻 Step 3: Web Dashboard Setup (Next.js 14)

The web dashboard provides a rich visual interface to browse memories, explore the knowledge graph, view activity traces in the flight recorder, review distilled lesson candidates, and promote candidates to agent skills.

1. **Install Dependencies:**
   ```bash
   cd ../dashboard   # From server directory, move into dashboard
   npm install
   ```

2. **Configure Environment Variables (`dashboard/.env.local`):**
   Create a `.env.local` file in `dashboard/`:
   ```env
   # Public Supabase Client (Browser safe)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...

   # Server-side Supabase Key (For server actions and candidates promotion)
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...your-service-role-key...

   # Gemini API Key (For re-embedding operations)
   GEMINI_API_KEY=AIzaSy...your-gemini-api-key...
   ```

3. **Start Dashboard:**
   - **Development Mode:**
     ```bash
     npm run dev
     ```
   - **Production Mode (Recommended for daily use):**
     ```bash
     npm run build
     npm run start
     ```
   - Open your browser at **[http://localhost:3000](http://localhost:3000)**.
   - Explore the views:
     - `/feed`: Memory cards, search, importance ratings, tags, and deletion
     - `/graph`: Interactive multi-hop entity knowledge graph
     - `/activity`: Live activity telemetry, bash commands, error traces, and audits
     - `/candidates`: Extracted lesson candidates and 1-click promotion to `.agents/skills/<slug>/SKILL.md`
     - `/setup`: Interactive config generator for your favorite AI tools

---

## 🚀 Step 4: 1-Click Launchers (Windows & Cross-Platform)

For Windows users, Aethos Memory includes pre-built 1-click batch scripts in the project root:

1. **`start.bat` (Dashboard Launcher):**
   - Automatically installs npm dependencies if missing.
   - Builds production bundle if not yet built.
   - Launches web dashboard on `http://localhost:3000`.

2. **`start_all.bat` (Full-Stack Unified Launcher):**
   - Double-clicking `start_all.bat` executes `start_all.ps1`.
   - Starts the FastMCP Server on port 8000.
   - Starts an Ngrok tunnel (for remote or cloud AI tools like Gemini Spark).
   - Starts the Next.js Web Dashboard on port 3000.
   - All three services run in a single unified PowerShell window with graceful `Ctrl+C` shutdown!

---

## 🤖 The Master Zero-Touch AI Setup Prompt

> **Copy and paste this SINGLE prompt directly into ANY AI assistant** (Claude Code, Cursor, OpenCode, Antigravity, Windsurf, Cline, etc.) when you have this repository open:

```text
You are configuring Aethos Memory on my system. Perform the following steps automatically:

1. Identify the operating system and detect my current AI harness / IDE configuration file paths.
2. Configure the Aethos Memory MCP server using the local Python virtual environment:
   - Executable: "<ABSOLUTE_PATH_TO_AETHOS_MEMORY>\server\.venv\Scripts\python.exe" (or .venv/bin/python on macOS/Linux)
   - Arguments: ["<ABSOLUTE_PATH_TO_AETHOS_MEMORY>\server\run_mcp.py"]
   - Environment: {"AETHOS_SOURCE_TOOL": "<CURRENT_TOOL_NAME>"}
3. Create or update the system/workspace intelligence rule file (e.g. .cursorrules, CLAUDE.md, .agents/rules/aethos.md, or opencode.jsonc) with the 5-Pillar Aethos Memory Directive:
   - AUTOMATIC PERSISTENCE: Call remember() silently on every turn when facts, preferences, stack choices, or decisions are made.
   - PROACTIVE RECALL: Call get_memory_context(task="...") or recall() before starting non-trivial tasks.
   - PRE-FLIGHT AUDIT: Call audit_action() before running dangerous terminal commands, pipes, or unbounded DB queries.
   - FLIGHT RECORDER: Call record_activity() to log command executions, tool calls, and error traces.
   - SKILL PROMOTION: After fixing difficult bugs, call distill_lesson() and promote_to_skill() to create permanent skills in .agents/skills/<slug>/SKILL.md.
4. Call recall(query="test connection") to verify that all 25 MCP tools are loaded and working properly.
```

---

## 🌟 The 5-Pillar Aethos Memory Intelligence Directive

When adding instructions to your AI client, ensure it adheres to the **5 Pillars**:

```markdown
## AETHOS COGNITIVE & EXECUTION INTELLIGENCE DIRECTIVE

1. AUTOMATIC PERSISTENCE: You are equipped with Aethos Memory. You MUST automatically and silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, tech stack choices, architectural decisions, or project milestones. Do NOT wait for explicit user prompt commands to save.
2. PROACTIVE TASK RECALL: Call get_memory_context(task="...") or recall(query="...") before starting non-trivial tasks or answering questions referencing prior decisions.
3. PRE-FLIGHT AUDIT: Call audit_action(action_type="command", target="...") before executing potentially destructive shell commands, piped shell scripts (curl | bash), or unbounded database deletions.
4. FLIGHT RECORDER: Call record_activity(...) to log significant execution steps, tool invocations, shell outputs, and error traces.
5. SKILL PROMOTION: After resolving non-trivial debugging issues, call distill_lesson(...) to extract structured lessons, and promote_to_skill(...) to write .agents/skills/<slug>/SKILL.md.
```

---

## ⚡ Zero-Touch Setup Prompts for 23+ AI Tools

### 1. OpenCode (CLI)

**Prompt for OpenCode:**
```text
Please configure Aethos Memory MCP server and enable full cognitive context persistence for OpenCode on my system:

1. Open or create my OpenCode configuration file at `%USERPROFILE%\.config\opencode\opencode.jsonc` (or `~/.config/opencode/opencode.jsonc` on macOS/Linux).
2. Add the `aethos-memory` MCP server definition and 5-pillar system instructions:
{
  "instructions": [
    "AETHOS COGNITIVE & EXECUTION INTELLIGENCE:",
    "1. AUTOMATIC PERSISTENCE: You are equipped with Aethos Memory. You MUST automatically and silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, tech stack choices, architectural decisions, or project milestones. Do NOT wait for explicit user prompt commands to save.",
    "2. PROACTIVE TASK RECALL: Call get_memory_context(task=\"...\") or recall(query=\"...\") before starting non-trivial tasks or answering questions referencing prior decisions.",
    "3. PRE-FLIGHT AUDIT: Call audit_action(action_type=\"command\", target=\"...\") before executing potentially destructive shell commands, piped shell scripts (curl | bash), or unbounded database deletions.",
    "4. FLIGHT RECORDER: Call record_activity(...) to log significant execution steps, tool invocations, shell outputs, and error traces.",
    "5. SKILL PROMOTION: After resolving non-trivial debugging issues, call distill_lesson(...) to extract structured lessons, and promote_to_skill(...) to write .agents/skills/<slug>/SKILL.md."
  ],
  "mcp": {
    "aethos-memory": {
      "type": "local",
      "command": [
        "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
        "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"
      ],
      "environment": {
        "AETHOS_SOURCE_TOOL": "OpenCode"
      }
    }
  }
}
3. Verify that all MCP tools (remember, recall, audit_action, record_activity, distill_lesson, promote_to_skill) are registered cleanly.
```

---

### 2. Claude Code (CLI)

**Prompt for Claude Code:**
```text
Please set up Aethos Memory for Claude Code:

1. Register the MCP server by running:
   claude mcp add aethos-memory C:\Users\YourName\Documents\Aethos_Memory\server\.venv\Scripts\python.exe -- C:\Users\YourName\Documents\Aethos_Memory\server\run_mcp.py
   (On macOS/Linux: claude mcp add aethos-memory /path/to/server/.venv/bin/python -- /path/to/server/run_mcp.py)

2. Create or update `CLAUDE.md` in the root of my current project directory (or in `%USERPROFILE%` / `~` for global coverage):
   ## Aethos Memory System Rules
   - You are equipped with Aethos Memory (remember, recall, audit_action, record_activity, distill_lesson, promote_to_skill).
   - AUTOMATIC PERSISTENCE: Automatically and silently call remember() on EVERY turn whenever identity facts, preferences, stack choices, decisions, or project goals are mentioned. Never wait for explicit commands.
   - PROACTIVE RECALL: Call get_memory_context(task="...") or recall() before planning non-trivial tasks or answering questions referencing past decisions.
   - PRE-FLIGHT AUDIT: Call audit_action() before running potentially destructive commands or script pipings.
   - FLIGHT RECORDER: Call record_activity() to capture significant execution commands and error traces.
   - DISTILLATION & SKILLS: After solving difficult bugs or establishing procedures, call distill_lesson() and promote_to_skill() to install reusable lessons in .agents/skills/<slug>/SKILL.md.

3. Test the connection by calling recall() to retrieve my existing user context.
```

---

### 3. Cursor IDE

**Prompt for Cursor:**
```text
Please configure Aethos Memory MCP server and auto-save rules for Cursor:

1. Open or update my Cursor MCP configuration file at `%USERPROFILE%\.cursor\mcp.json` (or `~/.cursor/mcp.json` on macOS):
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Cursor"
      }
    }
  }
}

2. Create or update `.cursorrules` in my current workspace root (or in my main `%USERPROFILE%` folder for global cross-project coverage):
   ## Aethos Memory System Rules
   - You are equipped with Aethos Memory (remember, recall, audit_action, record_activity, distill_lesson, promote_to_skill).
   - AUTOMATIC MEMORY PERSISTENCE: Silently call remember() on EVERY turn whenever user preferences, tech stack choices, architectural plans, or project decisions are discussed. Do NOT wait for explicit user prompt commands.
   - PROACTIVE RECALL: Call get_memory_context(task="...") before starting work on complex features or debugging.
   - PRE-FLIGHT SAFETY AUDIT: Call audit_action() before executing risky shell commands (e.g. destructive deletions, disk formatting, piping scripts to bash).
   - FLIGHT RECORDER: Log execution steps with record_activity().
   - SKILL PROMOTION: After fixing non-trivial bugs, distill the solution using distill_lesson() and promote_to_skill().

3. Confirm when setup is ready.
```

---

### 4. Windsurf IDE

**Prompt for Windsurf:**
```text
Please configure Aethos Memory for Windsurf:

1. Update my Windsurf MCP config at `%USERPROFILE%\.codeium\windsurf\mcp_config.json` (or `~/.codeium/windsurf/mcp_config.json` on macOS):
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Windsurf IDE"
      }
    }
  }
}

2. Create `.windsurfrules` in the root of my project directory (or in `%USERPROFILE%` for global coverage):
   ## Aethos Memory Rules
   - Silently call remember() on EVERY turn whenever user preferences, tech stack choices, or project decisions are mentioned.
   - Call get_memory_context(task="...") before starting non-trivial tasks to retrieve relevant conventions and debugging patterns.
   - Call audit_action() before executing potentially destructive terminal commands.
   - When solving difficult errors, distill the lesson with distill_lesson() and promote_to_skill().

3. Verify connection.
```

---

### 5. Google Antigravity IDE

**Prompt for Antigravity:**
```text
Please set up Aethos Memory MCP server for Antigravity IDE:

1. Add the `aethos-memory` entry to my Antigravity MCP config file at `%USERPROFILE%\.gemini\config\mcp_config.json` (or `~/.gemini/config/mcp_config.json` on macOS):
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Antigravity IDE"
      }
    }
  }
}

2. Create or update `.agents/rules/aethos.md` in my workspace root (or in `%USERPROFILE%\.gemini\config\rules\aethos.md` for global coverage):
   ## Aethos Memory Intelligence Directive
   - Automatically and silently call remember() on EVERY turn when personal facts, preferences, stack choices, decisions, or milestones are mentioned.
   - Call get_memory_context() or recall() before answering past decision inquiries or tackling complex tasks.
   - Run audit_action() before running risky bash commands or destructive file operations.
   - Record significant execution steps with record_activity().
   - Use distill_lesson() and promote_to_skill() to turn problem resolutions into permanent project skills in `.agents/skills/<slug>/SKILL.md`.

3. Verify that all MCP tools are loaded cleanly.
```

---

### 6. Claude Desktop

**Prompt for Claude Desktop:**
```text
Please configure Aethos Memory for Claude Desktop:

Update my Claude Desktop config file at `%APPDATA%\Claude\claude_desktop_config.json` (or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Claude Desktop"
      }
    }
  }
}
```

---

### 7. Zed Editor

**Prompt for Zed Editor:**
```text
Please configure Aethos Memory MCP context server for Zed:

Add the context server to my Zed settings file at `%APPDATA%\Zed\settings.json` (or `~/.config/zed/settings.json` on macOS):
{
  "context_servers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Zed Editor"
      }
    }
  }
}
```

---

### 8. OpenAI Codex CLI

**Prompt for OpenAI Codex CLI:**
```text
Configure Aethos Memory in my Codex CLI config file at `%USERPROFILE%\.codex\config.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "OpenAI Codex CLI"
      }
    }
  }
}
```

---

### 9. Gemini CLI

**Prompt for Gemini CLI:**
```text
Configure Aethos Memory in my Gemini CLI config at `%USERPROFILE%\.gemini\config.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Gemini CLI"
      }
    }
  }
}
```

---

### 10. Cline (VS Code Extension)

**Prompt for Cline:**
```text
Please set up Aethos Memory for Cline:

1. Add `aethos-memory` to my Cline MCP settings file at `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Cline"
      }
    }
  }
}

2. Create `.clinerules` in my workspace root (or in `%USERPROFILE%` for global coverage):
   ## Aethos Memory System Rules
   - Silently call remember() on EVERY turn whenever identity facts, preferences, stack choices, decisions, or project goals are mentioned.
   - Check get_memory_context() before beginning non-trivial tasks.
   - Run audit_action() before executing high-risk terminal commands.
   - Promote verified debugging workflows with distill_lesson() and promote_to_skill().
```

---

### 11. Continue.dev

**Prompt for Continue.dev:**
```text
Please add Aethos Memory to my `.continue/config.json`:

{
  "mcpServers": [
    {
      "name": "aethos-memory",
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Continue.dev"
      }
    }
  ],
  "customInstructions": "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory. Automatically and silently call remember() on EVERY turn whenever user preferences or decisions are mentioned. Call audit_action() before running dangerous terminal commands."
}
```

---

### 12. Roo Code

**Prompt for Roo Code:**
```text
Configure Aethos Memory for Roo Code:

1. Add to `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Roo Code"
      }
    }
  }
}
2. Create `.roorules` in workspace root enforcing automatic background persistence and pre-flight action auditing.
```

---

### 13. Kilo Code

**Prompt for Kilo Code:**
```text
Configure Aethos Memory in `%USERPROFILE%\.kilo\mcp.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe",
      "args": ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Kilo Code"
      }
    }
  }
}
```

---

### 14. Aider CLI

**Prompt for Aider:**
```text
Configure Aethos Memory for Aider:

1. Add to `.aider.conf.yml`:
   read: [CONVENTIONS.md]

2. Create `CONVENTIONS.md`:
   - Automatically call aethos-memory_remember when user preferences or architecture decisions are stated.
   - Call audit_action before executing destructive file commands.
```

---

### 15. Goose CLI

**Prompt for Goose:**
```text
Add Aethos Memory extension to my Goose configuration at `%USERPROFILE%\.config\goose\config.yaml` using:
name: aethos-memory
cmd: "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe"
args: ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"]
envs:
  AETHOS_SOURCE_TOOL: "Goose CLI"
```

---

### 16. OpenHands

**Prompt for OpenHands:**
```text
Configure Aethos Memory in my OpenHands config at `%USERPROFILE%\.openhands\config.toml`:
[mcp.aethos-memory]
command = "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe"
args = ["C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"]
env = { AETHOS_SOURCE_TOOL = "OpenHands" }

[instructions]
aethos_memory = "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory. Automatically call remember() on every turn when preferences or architectural decisions are made. Call audit_action() before running risky bash commands."
```

---

### 17. Replit Agent

**Prompt for Replit Agent:**
```text
Add Aethos Memory to `.replit` file:
[mcpServers.aethos-memory]
command = "python"
args = ["server/run_mcp.py"]
env = { AETHOS_SOURCE_TOOL = "Replit Agent" }

[instructions]
aethos_memory = "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory. Silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals."
```

---

### 18. Lovable

**Prompt for Lovable:**
```text
Add Aethos Memory to `.lovable/mcp.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "python",
      "args": ["server/run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Lovable"
      }
    }
  },
  "systemInstructions": "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory. Silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals."
}
```

---

### 19. Bolt.new / Bolt.diy

**Prompt for Bolt:**
```text
Add Aethos Memory to `.bolt/mcp.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "python",
      "args": ["server/run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Bolt.new"
      }
    }
  },
  "systemInstructions": "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory. Silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals."
}
```

---

### 20. v0 (Vercel)

**Prompt for v0:**
```text
Add Aethos Memory to `v0.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "python",
      "args": ["server/run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "v0"
      }
    }
  },
  "systemInstructions": "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory. Silently call remember() on EVERY turn whenever user preferences, tech stack choices, or design decisions are mentioned."
}
```

---

### 21. Devin

**Prompt for Devin:**
```text
Add Aethos Memory to `.devin/mcp.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "python",
      "args": ["server/run_mcp.py"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Devin"
      }
    }
  },
  "systemInstructions": "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory. Silently call remember() on EVERY turn whenever user preferences or decisions are mentioned. Call audit_action() before executing risky shell commands."
}
```

---

### 22. LibreChat

**Prompt for LibreChat:**
```text
Configure Aethos Memory in `librechat.yaml`:
mcpServers:
  aethos-memory:
    type: stdio
    command: "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\.venv\\Scripts\\python.exe"
    args:
      - "C:\\Users\\YourName\\Documents\\Aethos_Memory\\server\\run_mcp.py"
    env:
      AETHOS_SOURCE_TOOL: "LibreChat"
    instructions: "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory. Silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals."
```

---

### 23. Gemini Spark (Cloud MCP via Ngrok)

> Gemini Spark connects to MCP servers over HTTPS, not locally. You need to expose your local Aethos Memory server publicly using a free Ngrok tunnel.

**Setup Instructions:**
1. Install Ngrok:
   ```powershell
   winget install ngrok.ngrok
   ```
2. Sign up free at [ngrok.com](https://ngrok.com) and get your authtoken from the dashboard.
3. Authenticate Ngrok:
   ```powershell
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```
4. Claim your free permanent domain at [ngrok.com/cloud-edge/domains](https://dashboard.ngrok.com/cloud-edge/domains) (e.g. `https://your-name.ngrok-free.app`).
5. Launch `start_all.bat` (or configure `start_cloud_mcp.ps1` with your domain).
6. In **Gemini Spark** $\to$ **Custom Apps** $\to$ **Add a custom app link**, paste:
   ```
   https://YOUR_NGROK_DOMAIN.ngrok-free.app/mcp
   ```

---

## 🧪 Verification & Testing Playbook

After connecting your AI tool, run through this 5-minute verification checklist:

### 1. Test Silent Memory Persistence (`remember`)
In your AI assistant, say:
```
Hi! My name is Nisarg. I strongly prefer building fullstack apps with Next.js 14 App Router and Supabase pgvector. Remember this.
```
- **Expected Result:** The assistant silently calls `remember(...)` (or `save_memory`).
- **Verification:** Open [http://localhost:3000/feed](http://localhost:3000/feed). The memory card appears with extracted entities (`Next.js 14`, `Supabase pgvector`) and an importance score.

### 2. Test Multi-Hop Semantic Recall (`recall`)
Open a **brand new chat session** or different AI tool and ask:
```
What is my preferred fullstack stack and database?
```
- **Expected Result:** The assistant calls `recall(...)` or `get_memory_context(...)` and accurately replies with your preferences without you repeating them!

### 3. Test Aethos Sentinel Safety Guardrail (`audit_action`)
In your AI assistant, say:
```
Audit this command before running: rm -rf /
```
- **Expected Result:** The tool calls `audit_action(...)` and returns `BLOCK` or `WARN` with a clear explanation of destructive filesystem risk.

### 4. Test Activity Flight Recorder (`record_activity`)
Execute any command or inspect a file through your agent.
- **Expected Result:** Execution events are logged to Supabase.
- **Verification:** Open [http://localhost:3000/activity](http://localhost:3000/activity) to view real-time traces, tool calls, and error logs with auto-scrubbed credentials.

### 5. Test Traces-to-Skills Distillation (`distill_lesson` & `promote_to_skill`)
In your AI assistant, ask:
```
We solved a tricky bug where Next.js 14 Route Handlers failed due to unawaited cookies(). Distill this debugging lesson and promote it to an agent skill.
```
- **Expected Result:** The tool creates a structured candidate with trigger conditions, and installs it into `.agents/skills/nextjs-14-cookies/SKILL.md`. All future agents immediately inherit the skill!

---

## 🛠️ Troubleshooting & FAQ

### Q1: `python` or `fastmcp` is not recognized on Windows.
- **Fix:** Ensure Python is added to your Windows PATH. When running locally, always use the absolute path to your virtual environment: `C:\Users\<YourUsername>\Documents\Aethos_Memory\server\.venv\Scripts\python.exe`.

### Q2: PowerShell shows execution policy error when activating `.venv`.
- **Fix:** Run this once in PowerShell as your current user:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### Q3: How do I find my `AETHOS_USER_ID`?
- **Fix:** 
  1. Open the dashboard at [http://localhost:3000](http://localhost:3000).
  2. Navigate to **Settings** in the bottom-left sidebar.
  3. Copy your User ID shown on the screen and paste it into `server/.env`.
  4. (Alternatively, any standard UUID string works fine for local single-user setups).

### Q4: Port 8000 or 3000 is already in use.
- **Fix:**
  - For dashboard: run `npm run dev -- -p 3001` to run on port 3001.
  - For FastMCP server: change `--port 8000` to `--port 8001` in your start script.

### Q5: How are secrets kept safe?
- **Answer:** Aethos Memory features **Aethos Sentinel** secret scrubbing. Any API keys matching OpenAI, Supabase, Google Gemini, GitHub, AWS, Stripe, or generic Bearer tokens are scrubbed (`[REDACTED_SECRET]`) automatically both during ingestion and activity telemetry logging.
