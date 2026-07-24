import os
import sys
from pathlib import Path

# ── CRITICAL: suppress banner BEFORE FastMCP is imported (it prints on import)
os.environ["FASTMCP_SHOW_BANNER"] = "false"

# ── Load .env file using ABSOLUTE path relative to this script's directory
#    (Ensures credentials load even if OpenCode is launched from C:\Users\Nisarg Patel or elsewhere)
_script_dir = Path(__file__).resolve().parent
_env_file = _script_dir / ".env"
if _env_file.exists():
    for _line in _env_file.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _, _val = _line.partition("=")
            _key = _key.strip()
            _val = _val.strip()
            if not os.environ.get(_key):
                os.environ[_key] = _val

os.environ.setdefault("AETHOS_PROJECT", "global")

sys.path.insert(0, str(_script_dir / "src"))

from aethos_memory.server import mcp

if __name__ == "__main__":
    mcp.run()
