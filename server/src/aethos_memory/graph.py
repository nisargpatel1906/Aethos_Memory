"""Knowledge Graph & Pivot Nodes Traversal for Aethos Memory.

Links memories across entity nodes (depends_on, relates_to, supersedes)
to enable multi-hop context retrieval.
"""

from typing import Any


def expand_graph_pivot_nodes(memories: list[dict[str, Any]]) -> dict[str, Any]:
    """Build pivot node graph clusters connecting related memories."""
    nodes: dict[str, list[dict[str, Any]]] = {}
    edges: set[tuple[str, str]] = set()

    for m in memories:
        extracted = m.get("entities", [])
        if not isinstance(extracted, list) or len(extracted) == 0:
            extracted = m.get("tags", [])
        if not isinstance(extracted, list):
            extracted = []
            
        for node in extracted:
            node = str(node).title()
            if node not in nodes:
                nodes[node] = []
            nodes[node].append({
                "id": m.get("id"),
                "content": m.get("content", "")[:60] + "...",
                "category": m.get("category", "other"),
            })

    # Create edges between concepts that co-occur in the same memory
    for m in memories:
        extracted = m.get("entities", [])
        if not isinstance(extracted, list) or len(extracted) == 0:
            extracted = m.get("tags", [])
        if not isinstance(extracted, list):
            extracted = []
            
        extracted = [str(node).title() for node in extracted]
        for i in range(len(extracted)):
            for j in range(i + 1, len(extracted)):
                edge = tuple(sorted([extracted[i], extracted[j]]))
                edges.add(edge)

    return {
        "pivot_nodes": nodes,
        "edges": list(edges),
        "total_nodes": len(nodes),
        "total_edges": len(edges),
    }
