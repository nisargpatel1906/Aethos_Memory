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
    threshold: float = 0.65,
    limit: int = 5,
    query_text: str = "",
) -> list[dict[str, Any]]:
    """Perform hybrid vector + keyword similarity search via match_memories_hybrid RPC.

    Scoped to AETHOS_USER_ID and target project, with automatic cross-project vector search fallback.
    """
    client = get_supabase_client()
    cfg = get_config()

    matches = []
    # 1. Try match_memories_hybrid RPC
    try:
        res = client.rpc(
            "match_memories_hybrid",
            {
                "p_user_id": cfg.aethos_user_id,
                "p_project": project,
                "query_text": query_text,
                "query_embedding": embedding,
                "match_threshold": threshold,
                "match_count": limit,
            },
        ).execute()
        matches = res.data or []
    except Exception:
        # Fallback to standard match_memories RPC if hybrid not yet applied
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

    # 2. Cross-project fallback: search ALL stored memories for this user if no matches found
    if not matches:
        try:
            rows = (
                client.table("memories")
                .select("id, content, category, project, created_at, embedding, importance, tags, access_count, expires_at, source_tool")
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
                    sim = round(_cosine_similarity(embedding, emb), 4)
                    if sim >= min_thresh:
                        r["similarity"] = sim
                        scored.append((sim, r))
            scored.sort(key=lambda x: x[0], reverse=True)
            matches = [item[1] for item in scored[:limit]]
        except Exception:
            pass

    # 3. Increment hit count asynchronously / silently for returned matches
    if matches:
        increment_access_count([m["id"] for m in matches if "id" in m])

    return matches


ALLOWED_CATEGORIES = {"preference", "decision", "project_detail", "identity", "goal", "other"}


def normalize_category(category: str | None) -> str:
    """Ensure category strictly matches allowed DB categories.
    Guarantees 100% compatibility with Supabase DB check constraint.
    """
    if not category:
        return "other"
    cat = str(category).strip().lower().replace(" ", "_")
    if cat in ALLOWED_CATEGORIES:
        return cat
    if "pref" in cat or "user" in cat or "name" in cat:
        return "preference"
    if "decis" in cat or "arch" in cat or "plan" in cat or "commit" in cat:
        return "decision"
    if "proj" in cat or "detail" in cat or "stack" in cat or "tech" in cat:
        return "project_detail"
    if "ident" in cat or "who" in cat:
        return "identity"
    if "goal" in cat or "target" in cat:
        return "goal"
    return "other"


def insert_memory(
    content: str,
    embedding: list[float],
    category: str,
    project: str = "global",
    source_tool: str | None = "MCP Client",
    importance: int = 3,
    expires_at: str | None = None,
    tags: list[str] | None = None,
    team_id: str | None = None,
    author_id: str | None = None,
) -> dict[str, Any]:
    """Insert a new atomic memory record into Supabase with extended metadata and graceful schema fallback."""
    client = get_supabase_client()
    cfg = get_config()

    row = {
        "user_id": cfg.aethos_user_id,
        "project": project,
        "content": content,
        "embedding": embedding,
        "category": normalize_category(category),
        "source_tool": source_tool,
        "importance": max(1, min(5, importance)),
        "expires_at": expires_at,
        "tags": tags or [],
        "team_id": team_id,
        "author_id": author_id or cfg.aethos_user_id,
    }

    try:
        res = client.table("memories").insert(row).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass

    # Fallback for standard core columns if extended columns schema cache is reloading
    fallback_row = {
        "user_id": cfg.aethos_user_id,
        "project": project,
        "content": content,
        "embedding": embedding,
        "category": normalize_category(category),
        "source_tool": source_tool,
    }
    res = client.table("memories").insert(fallback_row).execute()
    if not res.data:
        raise RuntimeError("Failed to insert memory record into Supabase")
    return res.data[0]


def increment_access_count(memory_ids: list[str]) -> None:
    """Increment access_count for recalled memory IDs."""
    if not memory_ids:
        return
    client = get_supabase_client()
    try:
        for mid in memory_ids:
            client.rpc("increment_access_count_by_id", {"m_id": mid}).execute()
    except Exception:
        # Fallback to direct update
        try:
            for mid in memory_ids:
                client.table("memories").update({"access_count": 1}).eq("id", mid).execute()
        except Exception:
            pass


def get_memory_versions(memory_id: str) -> list[dict[str, Any]]:
    """Fetch revision audit history for a specific memory."""
    client = get_supabase_client()
    try:
        res = (
            client.table("memory_versions")
            .select("id, memory_id, old_content, old_category, updated_by, changed_at")
            .eq("memory_id", memory_id)
            .order("changed_at", desc=True)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


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

    try:
        res = (
            client.table("memories")
            .select("id, user_id, project, content, category, source_tool, importance, expires_at, access_count, tags, created_at, updated_at")
            .eq("user_id", cfg.aethos_user_id)
            .eq("project", project)
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        return res.data or []
    except Exception:
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
