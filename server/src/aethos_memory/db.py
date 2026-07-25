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


import math
import json

def _cosine_similarity(v1: list[float], v2: list[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


def similarity_search(
    embedding: list[float],
    project: str,
    threshold: float = 0.75,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Perform vector similarity search via Supabase Postgres RPC match_memories.

    Scoped to AETHOS_USER_ID and target project, with automatic cross-project vector search fallback when 0 matches found.
    """
    client = get_supabase_client()
    cfg = get_config()

    matches = []
    # 1. Search specified project via RPC if project is specified and != "ALL"
    if project != "ALL":
        try:
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
            matches = res.data or []
        except Exception:
            pass

    # 2. Cross-project fallback: search ALL stored memories for this user
    if not matches:
        try:
            rows = (
                client.table("memories")
                .select("id, content, category, project, created_at, embedding")
                .eq("user_id", cfg.aethos_user_id)
                .execute()
                .data or []
            )
            scored = []
            min_thresh = max(0.35, threshold - 0.15)
            for r in rows:
                emb = r.get("embedding")
                if isinstance(emb, str):
                    emb = json.loads(emb)
                if emb:
                    sim = _cosine_similarity(embedding, emb)
                    if sim >= min_thresh:
                        scored.append((sim, r))
            scored.sort(key=lambda x: x[0], reverse=True)
            matches = [item[1] for item in scored[:limit]]
        except Exception:
            pass

    return matches


ALLOWED_CATEGORIES = {"preference", "decision", "project_detail", "other"}


def normalize_category(category: str | None) -> str:
    """Ensure category strictly matches allowed DB categories ('preference', 'decision', 'project_detail', 'other').
    Guarantees 100% compatibility with Supabase DB check constraint.
    """
    if not category:
        return "other"
    cat = str(category).strip().lower().replace(" ", "_")
    if cat in ALLOWED_CATEGORIES:
        return cat
    if "pref" in cat or "ident" in cat or "user" in cat or "name" in cat:
        return "preference"
    if "decis" in cat or "arch" in cat or "goal" in cat or "plan" in cat or "commit" in cat:
        return "decision"
    if "proj" in cat or "detail" in cat or "stack" in cat or "tech" in cat:
        return "project_detail"
    return "other"


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
        "category": normalize_category(category),
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


def list_by_project(project: str, limit: int = 50, offset: int = 0) -> list[dict[str, Any]]:
    """Return stored memories for a project, ordered by created_at descending, with pagination."""
    client = get_supabase_client()
    cfg = get_config()

    res = (
        client.table("memories")
        .select("id, user_id, project, content, category, source_tool, created_at, updated_at")
        .eq("user_id", cfg.aethos_user_id)
        .eq("project", project)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return res.data or []
