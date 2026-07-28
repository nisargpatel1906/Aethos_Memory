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
from aethos_memory import db, providers, prompts
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
    """Extract and insert atomic facts from conversation text asynchronously."""
    if not text or len(text.strip()) < 20:
        return 0

    try:
        prompt = prompts.SESSION_SUMMARY_PROMPT.format(session_transcript=text[:8000], project=project)
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

            db.insert_memory(
                content=content,
                embedding=emb,
                project=project,
                category=cat,
                importance=imp,
                source_tool=source_tool,
                tags=tags,
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

    # 1. Claude Code (.claude.json)
    claude_json = os.path.join(user, ".claude.json")
    if os.path.exists(claude_json):
        found.append((claude_json, "Claude Code", "global"))

    # 2. Codex logs — ONLY scan actual session transcripts in ~/.codex/sessions/
    codex_sessions_dir = os.path.join(user, ".codex", "sessions")
    if os.path.exists(codex_sessions_dir):
        for root, _, files in os.walk(codex_sessions_dir):
            for file in files:
                if file.endswith(".jsonl") or file.endswith(".json"):
                    found.append((os.path.join(root, file), "Codex CLI", "global"))

    # 3. OpenCode logs — scan ~/.local/share/opencode/ and ~/.config/opencode/
    opencode_paths = [
        os.path.join(user, ".local", "share", "opencode"),
        os.path.join(user, ".config", "opencode"),
    ]
    for op_path in opencode_paths:
        if os.path.exists(op_path):
            for root, _, files in os.walk(op_path):
                if "node_modules" in root or "cache" in root or "plugins" in root:
                    continue
                for file in files:
                    if file.endswith(".json") or file.endswith(".jsonl"):
                        found.append((os.path.join(root, file), "OpenCode", "global"))

    return found


async def ingest_opencode_sqlite_db() -> int:
    """Read un-ingested conversation turns directly from OpenCode's SQLite database."""
    db_path = os.path.expanduser("~/.local/share/opencode/opencode.db")
    if not os.path.exists(db_path):
        return 0

    state = load_state()
    processed = set(state.get("processed_opencode_part_ids", []))
    new_inserted = 0

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("""
            SELECT p.id, p.session_id, m.data, p.data
            FROM part p
            JOIN message m ON p.message_id = m.id
            ORDER BY p.time_created ASC
        """)
        rows = cur.fetchall()

        current_turn = []
        for part_id, session_id, msg_data_raw, part_data_raw in rows:
            if part_id in processed:
                continue

            try:
                m_json = json.loads(msg_data_raw)
                p_json = json.loads(part_data_raw)
                role = m_json.get("role", "unknown")
                text = p_json.get("text", "").strip()

                if text and len(text) > 15:
                    current_turn.append(f"{role.upper()}: {text}")
                    processed.add(part_id)
            except Exception:
                pass

            if len(current_turn) >= 2:
                turn_text = "\n\n".join(current_turn)
                count = await process_transcript_text(turn_text, source_tool="OpenCode", project="global")
                new_inserted += count
                current_turn = []

        state["processed_opencode_part_ids"] = list(processed)[-5000:]
        save_state(state)

    except Exception as e:
        logger.error(f"Error reading OpenCode SQLite DB: {e}")

    return new_inserted


async def run_auto_ingest_cycle() -> int:
    """Run a single pass scanning local transcript files for new conversation turns."""
    state = load_state()
    processed_files = state.get("processed_files", {})
    total_new_memories = 0

    # 1. File-based transcripts
    transcripts = find_transcript_files()
    for file_path, tool_name, project in transcripts:
        try:
            mtime = os.path.getmtime(file_path)
            last_mtime = processed_files.get(file_path, 0)
            if mtime > last_mtime:
                # File was modified! Read new content
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                if len(content) > 50:
                    count = await process_transcript_text(content, source_tool=tool_name, project=project)
                    total_new_memories += count

                processed_files[file_path] = mtime
        except Exception as e:
            logger.debug(f"Skipping file {file_path}: {e}")

    # 2. OpenCode SQLite DB ingestion
    opencode_count = await ingest_opencode_sqlite_db()
    total_new_memories += opencode_count

    state["processed_files"] = processed_files
    state["last_run"] = time.time()
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
    asyncio.run(run_auto_ingest_cycle())
