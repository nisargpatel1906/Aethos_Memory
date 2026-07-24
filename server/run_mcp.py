import os
import sys
from pathlib import Path

# Suppress FastMCP ASCII banner & log output for clean stdio JSON-RPC protocol handling
os.environ["FASTMCP_SHOW_BANNER"] = "false"
os.environ.setdefault("AETHOS_PROJECT", "global")

sys.path.insert(0, str(Path(__file__).parent / "src"))

from aethos_memory.server import mcp

if __name__ == "__main__":
    mcp.run()
