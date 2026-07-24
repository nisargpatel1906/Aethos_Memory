import os
import sys
from pathlib import Path

# ── CRITICAL: suppress banner BEFORE FastMCP is imported (it prints on import)
os.environ["FASTMCP_SHOW_BANNER"] = "false"

# ── Load .env file as fallback (MCP clients like OpenCode sometimes don't
#    forward env vars reliably from their config; .env ensures self-sufficiency)
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _, _val = _line.partition("=")
            _key = _key.strip()
            _val = _val.strip()
            # Only set if not already provided (or if provided as empty string)
            if not os.environ.get(_key):
                os.environ[_key] = _val

os.environ.setdefault("AETHOS_PROJECT", "global")

sys.path.insert(0, str(Path(__file__).parent / "src"))

from aethos_memory.server import mcp

if __name__ == "__main__":
    mcp.run()
