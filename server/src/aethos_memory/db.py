from datetime import datetime, timezone
from typing import Any
from supabase import Client, create_client
from aethos_memory.config import get_config

_supabase_client: Client | None = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        cfg = get_config()
        _supabase_client = create_client(cfg.supabase_url, cfg.supabase_service_role_key)
    return _supabase_client


def similarity_search(
    embedding: list[float],
    project: str,
    threshold: float = 0.75,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Perform vector similarity search via Supabase Postgres RPC match_memories.

    Scoped to AETHOS_USER_ID and the target project.
    """
    client = get_supabase_client()
    cfg = get_config()

    res = client.rpc(
        "match_memories",
        {
            "p_user_id": cfg.aethos_user_id,
            "p_project": project,
            "query_embedding": embedding,
            "match_threshold": threshold,
            "match_count": limit,
        },
    ).execute()

    return res.data or []


def insert_memory(
    content: str,
    embedding: list[float],
    category: str,
    project: str = "global",
    source_tool: str | None = "MCP Client",
) -> dict[str, Any]:
    """Insert a new atomic memory record into Supabase."""
    client = get_supabase_client()
    cfg = get_config()

    row = {
        "user_id": cfg.aethos_user_id,
        "project": project,
        "content": content,
        "embedding": embedding,
        "category": category,
        "source_tool": source_tool,
    }

    res = client.table("memories").insert(row).execute()
    if not res.data:
        raise RuntimeError("Failed to insert memory record into Supabase")
    return res.data[0]


def update_memory(
    memory_id: str,
    content: str,
    embedding: list[float],
) -> dict[str, Any]:
    """Update content and embedding together for an existing memory.

    Content and embedding MUST be updated together to avoid out-of-sync vector states.
    """
    client = get_supabase_client()
    cfg = get_config()

    updates = {
        "content": content,
        "embedding": embedding,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    res = (
        client.table("memories")
        .update(updates)
        .eq("id", memory_id)
        .eq("user_id", cfg.aethos_user_id)
        .execute()
    )
    if not res.data:
        raise RuntimeError(f"Failed to update memory record {memory_id} in Supabase")
    return res.data[0]


def delete_memory(memory_id: str) -> dict[str, Any]:
    """Delete a memory record by ID."""
    client = get_supabase_client()
    cfg = get_config()

    res = (
        client.table("memories")
        .delete()
        .eq("id", memory_id)
        .eq("user_id", cfg.aethos_user_id)
        .execute()
    )
    if not res.data:
        raise RuntimeError(f"Failed to delete memory record {memory_id} in Supabase")
    return res.data[0]


def list_by_project(project: str) -> list[dict[str, Any]]:
    """Return all stored memories for a project, unfiltered, ordered by created_at descending."""
    client = get_supabase_client()
    cfg = get_config()

    res = (
        client.table("memories")
        .select("id, user_id, project, content, category, source_tool, created_at, updated_at")
        .eq("user_id", cfg.aethos_user_id)
        .eq("project", project)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []
