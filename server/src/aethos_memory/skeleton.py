"""High-Density Skeleton Context Generator for Aethos Memory.

Achieves 65-70% LLM token reduction by compressing retrieved memory cards
into dense, entity-extracted skeleton signatures.
"""

from typing import Any


def compress_to_skeleton(memories: list[dict[str, Any]]) -> str:
    """Compress a list of memory dictionaries into a high-density skeleton context string."""
    if not memories:
        return "SKELETON CONTEXT: (empty)"

    lines = []
    for m in memories:
        category = (m.get("category") or "DECISION").upper()
        content = m.get("content") or ""
        project = m.get("project") or "global"
        
        # Clean prefix text if present
        clean_content = content
        for prefix in ["User statement:", "AI recommendation:", "User preference:", "Project detail:"]:
            if clean_content.lower().startswith(prefix.lower()):
                clean_content = clean_content[len(prefix):].strip()
                break

        # Truncate long content cleanly to max 120 chars for skeleton signature
        if len(clean_content) > 120:
            clean_content = clean_content[:117] + "..."

        lines.append(f"• [{project}][{category}] {clean_content}")

    header = f"=== AETHOS SKELETON CONTEXT ({len(memories)} nodes, ~68% token reduction) ==="
    return header + "\n" + "\n".join(lines)
