"""Automated Background Transcript & Conversation Ingestion Daemon for Aethos Memory.

Continuously scans local AI client logs (Claude Code, OpenAI Codex, OpenCode, Cursor)
and automatically extracts & indexes new memories in Supabase without requiring manual user prompts.
"""

import os
import json
import sqlite3
import asyncio
import time
import logging
from typing import Any
from aethos_memory import db, providers, prompts, activity
from aethos_memory.threat_rules import scrub_secrets
from aethos_memory.caching import cache_manager

logger = logging.getLogger("aethos_auto_ingest")
logging.basicConfig(level=logging.INFO)

STATE_FILE = os.path.expanduser("~/.aethos_auto_ingest_state.json")


def load_state() -> dict[str, Any]:
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"processed_files": {}, "last_run": 0}


def save_state(state: dict[str, Any]) -> None:
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save auto-ingest state: {e}")


async def process_transcript_text(text: str, source_tool: str = "Auto-Ingest", project: str = "global") -> int:
    """Extract and insert atomic facts from conversation text asynchronously with secret scrubbing and activity tracing."""
    if not text or len(text.strip()) < 20:
        return 0

    # 1. Scrub secrets before processing
    clean_text, detected_secrets = scrub_secrets(text)
    if detected_secrets:
        logger.info(f"Auto-Ingest: Scrubbed {len(detected_secrets)} secrets from conversation turn ({', '.join(set(detected_secrets))})")

    # 2. Record telemetry activity event
    try:
        activity.record_activity_event(
            event_type="user_message",
            harness=source_tool,
            title=f"Turn from {source_tool}: {clean_text[:60].strip()}...",
            tool_output=clean_text[:2000],
            project=project,
            status="success",
        )
    except Exception as e:
        logger.debug(f"Failed to record activity event during auto-ingest: {e}")

    try:
        prompt = prompts.SESSION_SUMMARY_PROMPT.format(session_transcript=clean_text[-8000:], project=project)
        res = await providers.call_extraction(prompt)
        facts = res.get("facts", [])

        if not facts:
            return 0


        inserted_count = 0
        for fact in facts:
            content = fact.get("content", "").strip()
            if not content:
                continue

            emb = await providers.call_embedding(content)
            
            # Prevent duplicate inserts if the MCP tool already saved this exact fact
            existing = db.similarity_search(emb, project=project, threshold=0.92, limit=1)
            if existing:
                logger.info(f"Auto-Ingest: Skipping duplicate fact '{content[:30]}...'")
                continue

            cat = fact.get("category", "other")
            imp = int(fact.get("importance", 3)) if isinstance(fact.get("importance"), (int, float)) else 3

            tags = fact.get("tags", [])
            if not isinstance(tags, list):
                tags = []

            if "ai" in cat.lower() or "ai generated" in content.lower() or "ai recommendation" in content.lower():
                if "ai-generated" not in tags:
                    tags.append("ai-generated")
            else:
                if "user-generated" not in tags:
                    tags.append("user-generated")

            if "auto-ingested" not in tags:
                tags.append("auto-ingested")

            entities = fact.get("entities", [])
            if not isinstance(entities, list):
                entities = []

            db.insert_memory(
                content=content,
                embedding=emb,
                project=project,
                category=cat,
                importance=imp,
                source_tool=source_tool,
                tags=tags,
                entities=entities,
            )
            inserted_count += 1

        if inserted_count > 0:
            cache_manager.invalidate()
            logger.info(f"Auto-Ingest: Successfully auto-saved {inserted_count} memories from {source_tool} ({project})")

        return inserted_count
    except Exception as e:
        logger.error(f"Error processing transcript in Auto-Ingest: {e}")
        return 0


def find_transcript_files() -> list[tuple[str, str, str]]:
    """Locate local AI tool transcript logs across system, ignoring node_modules & cache folders."""
    user = os.path.expanduser("~")
    found = []

    # 1. Claude Code (~/.claude/history.jsonl)
    claude_history = os.path.join(user, ".claude", "history.jsonl")
    if os.path.exists(claude_history):
        found.append((claude_history, "Claude Code", "global"))

    # 2. Codex logs — ONLY scan actual session transcripts in ~/.codex/sessions/
    codex_sessions_dir = os.path.join(user, ".codex", "sessions")
    if os.path.exists(codex_sessions_dir):
        for root, _, files in os.walk(codex_sessions_dir):
            for file in files:
                if file.endswith(".jsonl") or file.endswith(".json"):
                    found.append((os.path.join(root, file), "Codex CLI", "global"))
                    
    # 3. Antigravity IDE logs
    antigravity_dir = os.path.join(user, ".gemini", "antigravity-ide", "brain")
    if os.path.exists(antigravity_dir):
        for root, _, files in os.walk(antigravity_dir):
            if ".system_generated" in root and "logs" in root:
                for file in files:
                    if file == "transcript.jsonl":
                        found.append((os.path.join(root, file), "Antigravity", "global"))

    return found


async def ingest_opencode_sqlite_db(state: dict, is_first_run: bool = False) -> int:
    """Read un-ingested conversation turns directly from OpenCode's SQLite database."""
    db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
    if not os.path.exists(db_path):
        return 0

    last_time = state.get("opencode_last_time", 0)
    new_inserted = 0
    max_time_seen = last_time

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT p.id, p.session_id, m.data, p.data, p.time_updated
            FROM part p
            JOIN message m ON p.message_id = m.id
            WHERE p.time_updated > ? AND p.time_updated < ?
            ORDER BY p.time_updated ASC
        """, (last_time, int(time.time() * 1000) - 15000))
        rows = cur.fetchall()

        if is_first_run:
            if rows:
                state["opencode_last_time"] = max(r[4] for r in rows)
            return 0

        sessions = {}
        for part_id, session_id, msg_data_raw, part_data_raw, time_updated in rows:
            max_time_seen = max(max_time_seen, time_updated)

            try:
                m_json = json.loads(msg_data_raw)
                p_json = json.loads(part_data_raw)
                role = m_json.get("role", "unknown")
                p_type = p_json.get("type", "")
                text = p_json.get("text", "").strip()

                # Record agent internal reasoning tokens into Flight Recorder
                if p_type == "reasoning" and text:
                    try:
                        activity.record_activity_event(
                            event_type="agent_thought",
                            harness="OpenCode",
                            title=f"OpenCode Thought: {text[:60].strip()}...",
                            agent_thought=text,
                            session_id=session_id,
                            project="global",
                        )
                    except Exception:
                        pass

                # Record tool invocations into Flight Recorder
                elif p_type in ["tool-call", "tool_call"]:
                    tool_name = p_json.get("toolName") or p_json.get("name", "tool")
                    args = p_json.get("args") or p_json.get("input", {})
                    try:
                        activity.record_activity_event(
                            event_type="tool_call",
                            harness="OpenCode",
                            title=f"OpenCode Call: {tool_name}",
                            tool_name=tool_name,
                            tool_input=args,
                            session_id=session_id,
                            project="global",
                        )
                    except Exception:
                        pass

                if text and len(text) > 15:
                    if session_id not in sessions:
                        sessions[session_id] = []
                    sessions[session_id].append(f"{role.upper()}: {text}")
            except Exception:
                pass

        for session_id, messages in sessions.items():
            turn_text = "\n\n".join(messages)
            count = await process_transcript_text(turn_text, source_tool="OpenCode", project="global")
            new_inserted += count

        if max_time_seen > last_time:
            state["opencode_last_time"] = max_time_seen

    except Exception as e:
        logger.error(f"Error reading OpenCode SQLite DB: {e}")

    return new_inserted


async def run_auto_ingest_cycle() -> int:
    """Run a single pass scanning local transcript files for new conversation turns."""
    state = load_state()
    is_first_run = state.get("last_run", 0) == 0
    processed_files = state.get("processed_files", {})
    file_positions = state.get("file_positions", {})
    total_new_memories = 0
    now = time.time()
    cutoff = now - 600  # Only scan files touched in the last 10 minutes for sub-second performance

    # 1. File-based transcripts
    transcripts = find_transcript_files()
    for file_path, tool_name, project in transcripts:
        try:
            mtime = os.path.getmtime(file_path)
            
            if is_first_run:
                processed_files[file_path] = mtime
                file_positions[file_path] = os.path.getsize(file_path)
                continue

            if mtime < cutoff:
                continue
            last_mtime = processed_files.get(file_path, 0)
            if mtime > last_mtime:
                # File was modified! Read new content
                last_pos = file_positions.get(file_path, 0)
                current_size = os.path.getsize(file_path)
                
                # If file shrank, it was truncated/recreated
                if current_size < last_pos:
                    last_pos = 0
                
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    f.seek(last_pos)
                    content = f.read()
                    new_pos = f.tell()

                extracted_text = []
                for line in content.split("\n"):
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                        # Antigravity format
                        if "step_index" in obj and "content" in obj:
                            if obj.get("type") in ["USER_INPUT", "PLANNER_RESPONSE", "MODEL_RESPONSE"]:
                                text_val = obj["content"].strip()
                                if text_val:
                                    extracted_text.append(f"{obj.get('source', 'UNKNOWN')}: {text_val}")
                        # Codex format
                        elif "payload" in obj and isinstance(obj["payload"], dict):
                            payload = obj["payload"]
                            if payload.get("type") == "message" and "content" in payload:
                                for c in payload["content"]:
                                    if isinstance(c, dict) and "text" in c:
                                        extracted_text.append(f"{payload.get('role', 'unknown')}: {c['text']}")
                            elif payload.get("type") == "user_message" and "message" in payload:
                                extracted_text.append(f"user: {payload['message']}")
                        # Claude Code history.jsonl
                        elif "display" in obj and "timestamp" in obj:
                            extracted_text.append(f"USER: {obj['display']}")
                    except Exception:
                        pass
                
                parsed_content = "\n\n".join(extracted_text)

                if len(parsed_content) > 15:
                    count = await process_transcript_text(parsed_content, source_tool=tool_name, project=project)
                    total_new_memories += count

                processed_files[file_path] = mtime
                file_positions[file_path] = new_pos
        except Exception as e:
            logger.debug(f"Skipping file {file_path}: {e}")

    # 2. OpenCode SQLite DB ingestion
    opencode_count = await ingest_opencode_sqlite_db(state=state, is_first_run=is_first_run)
    if not is_first_run:
        total_new_memories += opencode_count

    state["processed_files"] = processed_files
    state["file_positions"] = file_positions
    state["last_run"] = now
    save_state(state)
    return total_new_memories


async def start_auto_ingest_loop(interval_seconds: int = 30):
    """Background daemon loop running continuous ingestion scans."""
    logger.info("Starting Aethos Memory Auto-Ingestion Daemon Loop...")
    while True:
        try:
            await run_auto_ingest_cycle()
        except Exception as e:
            logger.error(f"Error in auto-ingest loop: {e}")
        await asyncio.sleep(interval_seconds)


if __name__ == "__main__":
    asyncio.run(start_auto_ingest_loop())
