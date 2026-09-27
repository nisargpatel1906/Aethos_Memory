"""Cross-Harness Activity Telemetry & Execution Tracing for Aethos Memory.

Captures agent session execution steps (commands, tool calls, diffs, approvals,
errors, and agent thinking thoughts) across any harness (Cursor, Claude Code,
OpenCode, Codex, Antigravity, etc.) into Supabase with automatic secret scrubbing.
"""

import logging
from typing import Any
from aethos_memory import db
from aethos_memory.threat_rules import scrub_secrets

logger = logging.getLogger("aethos_memory.activity")


def record_activity_event(
    event_type: str,
    harness: str = "mcp_client",
    session_id: str | None = None,
    title: str = "",
    command: str | None = None,
    tool_name: str | None = None,
    tool_input: Any | None = None,
    tool_output: Any | None = None,
    diff: str | None = None,
    error: str | None = None,
    agent_thought: str | None = None,
    exit_code: int | None = None,
    status: str = "success",
    project: str = "global",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Record an agent execution event with automatic credential scrubbing.

    Event types supported:
    - 'command': Shell command execution with stdout/stderr & exit code
    - 'tool_call': AI tool invocation with arguments and tool name
    - 'tool_result': Result returned by a tool or API
    - 'user_message': User prompt submitted
    - 'approval': Human operator approval or rejection decision
    - 'agent_thought': Internal reasoning / thinking tokens (e.g. afterAgentThought)
    - 'error': Command or harness execution failure
    - 'metric': Token usage or runtime metric
    """
    payload: dict[str, Any] = metadata.copy() if metadata else {}

    # Scrub sensitive strings from all fields
    if command:
        clean_cmd, _ = scrub_secrets(command)
        payload["command"] = clean_cmd
    if tool_name:
        payload["tool_name"] = tool_name
    if tool_input is not None:
        if isinstance(tool_input, str):
            clean_in, _ = scrub_secrets(tool_input)
            payload["tool_input"] = clean_in
        else:
            payload["tool_input"] = tool_input
    if tool_output is not None:
        if isinstance(tool_output, str):
            clean_out, _ = scrub_secrets(tool_output[:10000]) # Cap payload size
            payload["tool_output"] = clean_out
        else:
            payload["tool_output"] = tool_output
    if diff:
        clean_diff, _ = scrub_secrets(diff[:15000])
        payload["diff"] = clean_diff
    if error:
        clean_err, _ = scrub_secrets(error)
        payload["error"] = clean_err
    if agent_thought:
        clean_thought, _ = scrub_secrets(agent_thought[:10000])
        payload["agent_thought"] = clean_thought
    if exit_code is not None:
        payload["exit_code"] = exit_code

    clean_title, _ = scrub_secrets(title or f"[{harness}] {event_type}")

    return db.insert_activity_event(
        event_type=event_type,
        title=clean_title,
        payload=payload,
        harness=harness,
        session_id=session_id,
        project=project,
        status=status,
    )


def search_activity(
    query: str | None = None,
    harness: str | None = None,
    event_type: str | None = None,
    session_id: str | None = None,
    project: str = "global",
    limit: int = 25,
) -> list[dict[str, Any]]:
    """Search recorded activity events matching criteria."""
    return db.query_activity_events(
        project=project,
        harness=harness,
        event_type=event_type,
        session_id=session_id,
        query_text=query,
        limit=limit,
    )


def get_activity_event(event_id: str) -> dict[str, Any] | None:
    """Fetch complete details of a specific activity event."""
    return db.get_activity_event_by_id(event_id)


def summarize_activity(
    session_id: str | None = None,
    project: str = "global",
    limit: int = 50,
) -> dict[str, Any]:
    """Generate an analytical summary of recent agent activity."""
    events = db.query_activity_events(
        project=project,
        session_id=session_id,
        limit=limit,
    )

    if not events:
        return {
            "total_events": 0,
            "project": project,
            "session_id": session_id,
            "summary": "No activity recorded yet for this project/session.",
            "by_type": {},
            "by_harness": {},
            "failures": 0,
        }

    by_type: dict[str, int] = {}
    by_harness: dict[str, int] = {}
    failures = 0
    commands_run = []

    for ev in events:
        et = ev.get("event_type", "unknown")
        h = ev.get("harness", "unknown")
        by_type[et] = by_type.get(et, 0) + 1
        by_harness[h] = by_harness.get(h, 0) + 1
        if ev.get("status") in {"failed", "blocked"}:
            failures += 1

        payload = ev.get("payload") or {}
        if et == "command" and "command" in payload:
            cmd = payload["command"]
            if cmd not in commands_run:
                commands_run.append(cmd)

    return {
        "total_events": len(events),
        "project": project,
        "session_id": session_id,
        "by_type": by_type,
        "by_harness": by_harness,
        "failures": failures,
        "unique_commands": commands_run[:15],
        "recent_events": [
            {
                "id": ev["id"],
                "type": ev.get("event_type"),
                "harness": ev.get("harness"),
                "title": ev.get("title"),
                "status": ev.get("status"),
                "created_at": ev.get("created_at"),
            }
            for ev in events[:10]
        ],
    }


def list_activity_filters(project: str = "global") -> dict[str, list[str]]:
    """List distinct harnesses and event types available in recorded activity."""
    events = db.query_activity_events(project=project, limit=200)
    harnesses = sorted(list({ev.get("harness") for ev in events if ev.get("harness")}))
    event_types = sorted(list({ev.get("event_type") for ev in events if ev.get("event_type")}))
    sessions = sorted(list({ev.get("session_id") for ev in events if ev.get("session_id")}))

    return {
        "harnesses": harnesses,
        "event_types": event_types,
        "sessions": sessions[:20],
    }
