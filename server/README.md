# aethos-memory

Portable memory layer for AI tools — MCP server package.

## What this is

A local MCP server that exposes four tools (`remember`, `recall`, `forget`, `list_memories`) over stdio. Any MCP-capable AI tool (Claude Code, Cursor, Claude Desktop, Antigravity, etc.) can call these tools to share memory across sessions and across tools via a shared Supabase backing store.

## Quick start

### Prerequisites
- Python 3.10+ with `uv` installed (`pip install uv`)
- A Supabase project with the schema applied (see `../supabase/schema.sql`)
- API keys: Groq, OpenRouter, Gemini

### 1. Apply the database schema

Open your Supabase project → SQL Editor, paste and run the contents of `../supabase/schema.sql`.

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS — keep secret) |
| `GROQ_API_KEY` | Groq API key (primary extraction LLM) |
| `OPENROUTER_API_KEY` | OpenRouter API key (fallback extraction LLM) |
| `GEMINI_API_KEY` | Google Gemini API key (embeddings — `gemini-embedding-001`) |
| `AETHOS_USER_ID` | Your Supabase `auth.users` UUID |
| `AETHOS_PROJECT` | Project tag for this MCP client config (default: `global`) |

### 3. Add to your MCP client

**Claude Desktop / Cursor** (`claude_desktop_config.json` or `mcp_settings.json`):
```json
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key",
        "GROQ_API_KEY": "gsk_...",
        "OPENROUTER_API_KEY": "sk-or-...",
        "GEMINI_API_KEY": "AIzaSy...",
        "AETHOS_USER_ID": "your-supabase-user-uuid",
        "AETHOS_PROJECT": "global"
      }
    }
  }
}
```

**Claude Code CLI**:
```bash
claude mcp add aethos-memory -- uvx aethos-memory \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  -e GROQ_API_KEY="gsk_..." \
  -e OPENROUTER_API_KEY="sk-or-..." \
  -e GEMINI_API_KEY="AIzaSy..." \
  -e AETHOS_USER_ID="your-supabase-user-uuid" \
  -e AETHOS_PROJECT="global"
```

The dashboard (see `../dashboard/`) can generate this snippet for you automatically after setup.

### 4. (Optional) Run the eval harness

```bash
cd server
uv run python eval/run_eval.py
```

This runs offline (no API keys needed) and compares the three retrieval strategies.

## MCP tools

| Tool | Description |
|---|---|
| `remember(content, project)` | Store a fact, decision, or preference |
| `recall(query, project)` | Semantic search for relevant memories |
| `forget(memory_id, description)` | Delete a memory by ID or description |
| `list_memories(project)` | Return all memories for a project |

## Architecture notes

- **Stateless**: no in-memory state between calls — every call reads/writes directly to Supabase
- **Embeddings**: Gemini `gemini-embedding-001` (768 dims) — single provider, no fallback by design
- **Extraction**: Groq (primary) → OpenRouter (fallback) — LLM converts raw content to atomic facts
- **Transport**: stdio — spawned per session by the MCP client, no always-on process needed
