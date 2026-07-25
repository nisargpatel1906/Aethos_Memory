# 🤖 Zero-Touch AI Setup Prompts for All 22+ Supported AI Tools

> **How to use this file:**  
> Simply copy the prompt for your AI tool below and paste it directly into your AI assistant (Claude Code, OpenCode, Cursor, Windsurf, Antigravity, Zed, Cline, etc.).  
> **Your AI assistant will automatically read your config paths, configure the MCP server, write the auto-save rules, and verify the connection for you with zero manual work!**

---

## ⚡ 1. OpenCode (CLI)

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
      "command": ["uvx", "aethos-memory"],
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

## ⚡ 5. Google Antigravity IDE

```text
Please set up Aethos Memory MCP server for Antigravity IDE:

1. Add the `aethos-memory` entry to my Antigravity MCP config file at `%USERPROFILE%\.gemini\config\mcp_config.json` (or `~/.gemini/config/mcp_config.json` on macOS):
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

## ⚡ 6. Claude Desktop

```text
Please configure Aethos Memory for Claude Desktop:

Update my Claude Desktop config file at `%APPDATA%\Claude\claude_desktop_config.json` (or `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Claude Desktop"
      }
    }
  }
}
```

---

## ⚡ 7. Zed Editor

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

## ⚡ 8. OpenAI Codex CLI

```text
Configure Aethos Memory in my Codex CLI config file at `%USERPROFILE%\.codex\config.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "OpenAI Codex CLI"
      }
    }
  }
}
```

---

## ⚡ 9. Gemini CLI

```text
Configure Aethos Memory in my Gemini CLI config at `%USERPROFILE%\.gemini\config.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Gemini CLI"
      }
    }
  }
}
```

---

## ⚡ 10. Cline (VS Code Extension)

```text
Please set up Aethos Memory for Cline:

1. Add `aethos-memory` to my Cline MCP settings file at `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Cline"
      }
    }
  }
}

2. Create `.clinerules` in my workspace root:
   ## Aethos Memory System Rules
   - Automatically and silently call remember() on EVERY turn whenever the user mentions identity facts, preferences, stack choices, decisions, or project goals.
```

---

## ⚡ 11. Continue.dev

```text
Please add Aethos Memory to my `.continue/config.json`:

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

## ⚡ 12. Roo Code

```text
Configure Aethos Memory for Roo Code:

1. Add to `%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Roo Code"
      }
    }
  }
}
2. Create `.roorules` in workspace root.
```

---

## ⚡ 13. Kilo Code

```text
Configure Aethos Memory in `%USERPROFILE%\.kilo\mcp.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Kilo Code"
      }
    }
  }
}
```

---

## ⚡ 14. Aider CLI

```text
Configure Aethos Memory for Aider:

1. Add to `.aider.conf.yml`:
   read: [CONVENTIONS.md]

2. Create `CONVENTIONS.md`:
   - Automatically call aethos-memory_remember when user preferences or decisions are stated.
```

---

## ⚡ 15. Goose CLI

```text
Add Aethos Memory extension to my Goose configuration at `%USERPROFILE%\.config\goose\config.yaml` using `uvx aethos-memory` with environment variable `AETHOS_SOURCE_TOOL: "Goose CLI"`.
```

---

## ⚡ 16. OpenHands

```text
Configure Aethos Memory in my OpenHands config at `%USERPROFILE%\.openhands\config.toml`:
[mcp.aethos-memory]
command = "uvx"
args = ["aethos-memory"]
env = { AETHOS_SOURCE_TOOL = "OpenHands" }
```

---

## ⚡ 17. Replit Agent

```text
Add Aethos Memory to `.replit` file:
[mcpServers.aethos-memory]
command = "uvx"
args = ["aethos-memory"]
env = { AETHOS_SOURCE_TOOL = "Replit Agent" }
```

---

## ⚡ 18. Lovable

```text
Add Aethos Memory to `.lovable/mcp.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Lovable"
      }
    }
  }
}
```

---

## ⚡ 19. Bolt.new / Bolt.diy

```text
Add Aethos Memory to `.bolt/mcp.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Bolt.new"
      }
    }
  }
}
```

---

## ⚡ 20. v0 (Vercel)

```text
Add Aethos Memory to `v0.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "v0"
      }
    }
  }
}
```

---

## ⚡ 21. Devin

```text
Add Aethos Memory to `.devin/mcp.json`:
{
  "mcpServers": {
    "aethos-memory": {
      "command": "uvx",
      "args": ["aethos-memory"],
      "env": {
        "AETHOS_SOURCE_TOOL": "Devin"
      }
    }
  }
}
```

---

## ⚡ 22. LibreChat

```text
Configure Aethos Memory in `librechat.yaml`:
mcpServers:
  aethos-memory:
    type: stdio
    command: uvx
    args:
      - aethos-memory
    env:
      AETHOS_SOURCE_TOOL: "LibreChat"
```
