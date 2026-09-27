from datetime import datetime, timezone
from typing import Any
from supabase import Client, create_client
from aethos_memory.config import get_config
import logging

logger = logging.getLogger("aethos_memory.db")

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
    except Exception as e:
        logger.error(f"Hybrid match failed: {e}. Falling back to standard match.")
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

    # 2. Cross-project fallback: search recent memories for this user if no matches found
    if not matches:
        try:
            rows = (
                client.table("memories")
                .select("id, content, category, project, created_at, embedding, source_tool")
                .eq("user_id", cfg.aethos_user_id)
                .order("created_at", desc=True)
                .limit(5000)
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


import socket

_cached_ip_info: tuple[str, str] | None = None

def get_client_network_info() -> tuple[str, str]:
    global _cached_ip_info
    if _cached_ip_info is None:
        try:
            hostname = socket.gethostname()
            local_ip = socket.gethostbyname(hostname)
            _cached_ip_info = (local_ip, hostname)
        except Exception as e:
            logger.error(f"Failed to get host IP/name: {e}. Using default.")
            _cached_ip_info = ("127.0.0.1", "localhost")
    return _cached_ip_info


def insert_memory(
    content: str,
    embedding: list[float],
    category: str,
    project: str = "global",
    source_tool: str | None = "MCP Client",
    importance: int = 3,
    expires_at: str | None = None,
    tags: list[str] | None = None,
    entities: list[str] | None = None,
    team_id: str | None = None,
    author_id: str | None = None,
) -> dict[str, Any]:
    """Insert a new atomic memory record into Supabase with IP address origin embedded in source_tool."""
    client = get_supabase_client()
    cfg = get_config()

    local_ip, hostname = get_client_network_info()
    raw_tool = source_tool or "MCP Client"
    tool_label = raw_tool if f"({local_ip})" in raw_tool else f"{raw_tool} ({local_ip})"

    row = {
        "user_id": cfg.aethos_user_id,
        "project": project,
        "content": content,
        "embedding": embedding,
        "category": normalize_category(category),
        "source_tool": tool_label,
    }
    if tags is not None:
        row["tags"] = tags
    if entities is not None:
        row["entities"] = entities

    res = client.table("memories").insert(row).execute()
    if not res.data:
        raise RuntimeError("Failed to insert memory record into Supabase")
    return res.data[0]


def increment_access_count(memory_ids: list[str]) -> None:
    """Increment access_count for recalled memory IDs safely without raising HTTP errors."""
    if not memory_ids:
        return
    try:
        client = get_supabase_client()
        for mid in memory_ids:
            try:
                client.rpc("increment_access_count_by_id", {"m_id": mid}).execute()
            except Exception as e:
                logger.error(f"Failed to increment access count for memory {mid}: {e}")
                # Continue with other IDs
    except Exception as e:
        logger.error(f"Unexpected error in increment_access_count: {e}")


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
    except Exception as e:
        logger.error(f"Failed to get memory versions for {memory_id}: {e}")
        return []


def fetch_all_memories(limit: int = 10) -> list[dict[str, Any]]:
    """Fetch recent memories for current user."""
    client = get_supabase_client()
    cfg = get_config()
    try:
        res = (
            client.table("memories")
            .select("id, content, category, project, source_tool, created_at")
            .eq("user_id", cfg.aethos_user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to fetch all memories: {e}")
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


# =====================================================================
# Cross-Harness Activity Telemetry Methods (Activity Events)
# =====================================================================

def insert_activity_event(
    event_type: str,
    title: str = "",
    payload: dict[str, Any] | None = None,
    harness: str = "mcp_client",
    session_id: str | None = None,
    project: str = "global",
    status: str = "success",
) -> dict[str, Any]:
    """Insert a raw or normalized agent execution activity event into Supabase."""
    client = get_supabase_client()
    cfg = get_config()

    row = {
        "user_id": cfg.aethos_user_id,
        "project": project or "global",
        "session_id": session_id or "default_session",
        "harness": harness or "mcp_client",
        "event_type": event_type,
        "title": title or f"[{harness}] {event_type}",
        "payload": payload or {},
        "status": status,
    }

    try:
        res = client.table("activity_events").insert(row).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.error(f"Failed to insert activity event: {e}")
    return {"id": "local_fallback", **row}


def query_activity_events(
    project: str = "global",
    harness: str | None = None,
    event_type: str | None = None,
    session_id: str | None = None,
    query_text: str | None = None,
    limit: int = 25,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Query activity events with filtering by harness, event_type, and free-text search."""
    client = get_supabase_client()
    cfg = get_config()

    try:
        q = (
            client.table("activity_events")
            .select("id, project, session_id, harness, event_type, title, payload, status, created_at")
            .eq("user_id", cfg.aethos_user_id)
        )
        if project and project != "ALL":
            q = q.eq("project", project)
        if harness:
            q = q.eq("harness", harness)
        if event_type:
            q = q.eq("event_type", event_type)
        if session_id:
            q = q.eq("session_id", session_id)
        if query_text:
            q = q.ilike("title", f"%{query_text}%")

        res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to query activity events: {e}")
        return []


def get_activity_event_by_id(event_id: str) -> dict[str, Any] | None:
    """Fetch a single activity event by ID with complete payload."""
    client = get_supabase_client()
    cfg = get_config()

    try:
        res = (
            client.table("activity_events")
            .select("*")
            .eq("id", event_id)
            .eq("user_id", cfg.aethos_user_id)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Failed to get activity event {event_id}: {e}")
        return None


# =====================================================================
# Memory Distillation & Candidates Lifecycle Methods
# =====================================================================

def insert_memory_candidate(
    title: str,
    body: str,
    kind: str = "workflow",
    applicability: str = "",
    project: str = "global",
    tags: list[str] | None = None,
    evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Insert a new distilled memory candidate awaiting user review."""
    client = get_supabase_client()
    cfg = get_config()

    row = {
        "user_id": cfg.aethos_user_id,
        "project": project or "global",
        "state": "candidate",
        "kind": kind if kind in {"workflow", "correction", "debugging_pattern", "gotcha", "convention", "preference", "decision"} else "workflow",
        "title": title,
        "body": body,
        "applicability": applicability or "",
        "tags": tags or [],
        "evidence": evidence or {},
    }

    try:
        res = client.table("memory_candidates").insert(row).execute()
        if res.data:
            return res.data[0]
    except Exception as e:
        logger.error(f"Failed to insert memory candidate: {e}")
    return {"id": "candidate_fallback", **row}


def query_memory_candidates(
    project: str = "global",
    state: str | None = None,
    kind: str | None = None,
    limit: int = 25,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List memory candidates filtered by state and kind."""
    client = get_supabase_client()
    cfg = get_config()

    try:
        q = (
            client.table("memory_candidates")
            .select("id, project, memory_id, state, kind, title, body, applicability, tags, evidence, review_reason, created_at, updated_at, approved_at")
            .eq("user_id", cfg.aethos_user_id)
        )
        if project and project != "ALL":
            q = q.eq("project", project)
        if state:
            q = q.eq("state", state)
        if kind:
            q = q.eq("kind", kind)

        res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Failed to query memory candidates: {e}")
        return []


def get_memory_candidate_by_id(candidate_id: str) -> dict[str, Any] | None:
    """Fetch a single candidate item by ID."""
    client = get_supabase_client()
    cfg = get_config()

    try:
        res = (
            client.table("memory_candidates")
            .select("*")
            .eq("id", candidate_id)
            .eq("user_id", cfg.aethos_user_id)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Failed to get memory candidate {candidate_id}: {e}")
        return None


def update_candidate_state(
    candidate_id: str,
    state: str,
    review_reason: str = "",
    memory_id: str | None = None,
    superseded_by: str | None = None,
    title: str | None = None,
    body: str | None = None,
    kind: str | None = None,
    applicability: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Update review state (approved, rejected, superseded) and attributes of a candidate."""
    client = get_supabase_client()
    cfg = get_config()

    now_iso = datetime.now(timezone.utc).isoformat()
    updates: dict[str, Any] = {
        "state": state,
        "review_reason": review_reason,
        "updated_at": now_iso,
    }
    if state == "approved":
        updates["approved_at"] = now_iso
    if memory_id:
        updates["memory_id"] = memory_id
    if superseded_by:
        updates["superseded_by"] = superseded_by
    if title:
        updates["title"] = title
    if body:
        updates["body"] = body
    if kind:
        updates["kind"] = kind
    if applicability is not None:
        updates["applicability"] = applicability
    if tags is not None:
        updates["tags"] = tags

    try:
        res = (
            client.table("memory_candidates")
            .update(updates)
            .eq("id", candidate_id)
            .eq("user_id", cfg.aethos_user_id)
            .execute()
        )
        return res.data[0] if res.data else updates
    except Exception as e:
        logger.error(f"Failed to update candidate state: {e}")
        return updates

