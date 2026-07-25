# 🤖 Zero-Touch AI Setup Prompts for Aethos Memory

> **How to use this file:**  
> Simply copy the prompt for your AI tool below and paste it directly into your AI assistant (Claude Code, OpenCode, Cursor, Windsurf, Antigravity, etc.).  
> **Your AI assistant will automatically read your paths, configure the MCP server, write the auto-save rules, and test the connection for you!**

---

## ⚡ 1. OpenCode (CLI)

**Copy and paste this prompt to OpenCode:**

```text
Please configure Aethos Memory MCP server and enable automatic context persistence for OpenCode on my system:

1. Open or create my OpenCode configuration file at `%USERPROFILE%\.config\opencode\opencode.jsonc` (or `~/.config/opencode/opencode.jsonc` on macOS/Linux).
2. Add the `aethos-memory` MCP server definition and system instructions:
{
  "instructions": [
    "AUTOMATIC MEMORY PERSISTENCE: You are equipped with Aethos Memory (aethos-memory_remember). You MUST automatically and silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals. Do NOT wait for explicit user prompt commands to save."
  ],
  "mcp": {
    "aethos-memory": {
      "type": "local",
      "command": [
        "uvx",
        "aethos-memory"
      ],
      "environment": {
        "AETHOS_SOURCE_TOOL": "OpenCode"
      }
    }
  }
}
3. Verify that the MCP server tools (remember, recall, forget) are registered cleanly.
```

---

## ⚡ 2. Claude Code (CLI)

**Copy and paste this prompt to Claude Code:**

```text
Please set up Aethos Memory for Claude Code:

1. Run the command to register the MCP server:
   claude mcp add aethos-memory uvx aethos-memory -- -e AETHOS_SOURCE_TOOL="Claude Code"

2. Create a file named `CLAUDE.md` in the root of my current project directory with the following content:
   ## Aethos Memory System Rules
   - You are equipped with Aethos Memory (aethos-memory_remember and aethos-memory_recall).
   - You MUST automatically and silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals.
   - Never wait for explicit prompt commands like "save this".

3. Test the connection by retrieving my user context.
```

---

## ⚡ 3. Cursor IDE

**Copy and paste this prompt to Cursor AI Agent:**

```text
Please configure Aethos Memory MCP server and auto-save rules for Cursor:

1. Open or update my Cursor MCP configuration file at `%USERPROFILE%\.cursor\mcp.json` (or `~/.cursor/mcp.json` on macOS):
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Cursor"
      }
    }
  }
}

2. Create or update `.cursorrules` in my current workspace root with:
   ## Aethos Memory System Rules
   - You are equipped with Aethos Memory (aethos-memory_remember).
   - You MUST automatically and silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals.
   - Do NOT wait for explicit user prompt commands to save.

3. Confirm when setup is ready.
```

---

## ⚡ 4. Windsurf IDE

**Copy and paste this prompt to Cascade / Windsurf AI:**

```text
Please configure Aethos Memory for Windsurf:

1. Update my Windsurf MCP config at `%USERPROFILE%\.codeium\windsurf\mcp_config.json` (or `~/.codeium/windsurf/mcp_config.json` on macOS):
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Windsurf IDE"
      }
    }
  }
}

2. Create `.windsurfrules` in the root of my project directory:
   ## Aethos Memory Rules
   - Automatically and silently call aethos-memory_remember on EVERY turn whenever user preferences, tech stack choices, or project decisions are mentioned.

3. Verify connection.
```

---

## ⚡ 5. Antigravity IDE

**Copy and paste this prompt to Antigravity AI:**

```text
Please set up Aethos Memory MCP server for Antigravity IDE:

1. Add the `aethos-memory` entry to my Antigravity MCP config file at `%USERPROFILE%\.gemini\config\mcp_config.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Antigravity IDE"
      }
    }
  }
}

2. Create a `.instructions.md` rule file in my project root enforcing automatic background saving.
3. Test that the MCP server functions are loaded.
```

---

## ⚡ 6. Zed Editor

**Copy and paste this prompt to Zed AI Assistant:**

```text
Please configure Aethos Memory MCP context server for Zed:

Add the context server to my Zed settings file at `%APPDATA%\Zed\settings.json` (or `~/.config/zed/settings.json` on macOS):
{
  "context_servers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Zed Editor"
      }
    }
  }
}
```

---

## ⚡ 7. Cline / Roo Code (VS Code Extensions)

**Copy and paste this prompt to Cline or Roo Code:**

```text
Please set up Aethos Memory for Cline / Roo Code:

1. Add `aethos-memory` to your MCP settings file using `uvx aethos-memory`.
2. Create `.clinerules` (or `.roorules`):
   ## Aethos Memory System Rules
   - Automatically and silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals.
```

---

## ⚡ 8. Continue.dev

**Copy and paste this prompt to Continue Assistant:**

```text
Please add Aethos Memory to my `.continue/config.json`:

1. Add to `mcpServers`:
{
  "mcpServers": [
    {
      "name": "aethos-memory",
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Continue.dev"
      }
    }
  ],
  "customInstructions": "Automatically call remember() on every turn whenever user preferences or decisions are mentioned."
}
```

---

## ⚡ 9. Aider CLI

**Copy and paste this prompt to Aider:**

```text
Configure Aethos Memory for Aider:

Add to `.aider.conf.yml`:
read: [CONVENTIONS.md]

Create `CONVENTIONS.md`:
- Automatically call aethos-memory_remember when user preferences or decisions are stated.
```

---

## ⚡ 10. Goose CLI

**Copy and paste this prompt to Goose:**

```text
Add Aethos Memory extension to my Goose configuration at `%USERPROFILE%\.config\goose\config.yaml` using `uvx aethos-memory` with environment variable `AETHOS_SOURCE_TOOL: "Goose CLI"`.
```
