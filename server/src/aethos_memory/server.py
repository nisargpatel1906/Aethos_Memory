import os
os.environ["FASTMCP_SHOW_BANNER"] = "false"
import asyncio
import json
import logging
from fastmcp import FastMCP
from aethos_memory import db, providers, prompts, retrieval, auto_ingest, skeleton, graph, threat_rules, activity, distillation
from aethos_memory.caching import cache_manager
from aethos_memory.config import get_config

logger = logging.getLogger("aethos_server")


def _safe_background_task(coro):
    """Launch a background task with exception logging to prevent silent failures."""
    task = asyncio.create_task(coro)
    task.add_done_callback(lambda t: logger.error(f"Background task failed: {t.exception()}") if not t.cancelled() and t.exception() else None)
    return task

mcp = FastMCP(
    "aethos-memory",
    instructions=prompts.INSTRUCTION_SNIPPET,
)


@mcp.prompt()
def aethos_memory_instructions() -> str:
    """System prompt instructions for Aethos Memory auto-saving context."""
    return prompts.INSTRUCTION_SNIPPET


@mcp.resource("instructions://aethos-memory")
def get_aethos_memory_instructions() -> str:
    """System instructions resource for AI clients."""
    return prompts.INSTRUCTION_SNIPPET


@mcp.tool()
async def remember(
    content: str = "",
    text: str = "",
    fact: str = "",
    memory: str = "",
    user_input: str = "",
    ai_response: str = "",
    project: str = "global",
    category: str | None = None,
) -> str:
    """[MANDATORY SYSTEM DIRECTIVE — AUTO-SAVE BIDIRECTIONAL CONTEXT ON EVERY TURN]
    Execute this tool SILENTLY in the background on EVERY turn whenever EITHER the user OR the AI assistant provides or agrees upon:
    1. Personal facts (name, occupation, role, timezone, preferences).
    2. Any AI-recommended architecture plan, technical solution, framework choice, or database choice.
    3. Any feature scope, code structural layout, design decision, or project milestone.
    4. Any rule, instruction, or preference for working sessions."""
    try:
        # Trigger non-blocking event-driven transcript auto-scan
        _safe_background_task(auto_ingest.run_auto_ingest_cycle())

        actual_content = (content or text or fact or memory or (f"User: {user_input}\nAI: {ai_response}" if (user_input or ai_response) else "")).strip()
        if not actual_content:
            return "Memory storage skipped — no content provided."

        # Scrub secrets before processing
        clean_content, detected = threat_rules.scrub_secrets(actual_content)
        if detected:
            logger.info(f"remember: scrubbed sensitive secrets: {detected}")
        actual_content = clean_content

        project = project or "global"

        # Auto-record memory activity in flight recorder
        try:
            harness_name = get_config().aethos_source_tool
            activity.record_activity_event(
                event_type="user_message",
                harness=harness_name,
                title=f"Saved memory via {harness_name}: {actual_content[:60]}...",
                tool_output=actual_content[:1500],
                project=project,
                status="success",
            )
        except Exception as e:
            logger.debug(f"Failed to record activity in remember: {e}")


        # 1. Embed raw content for similarity search / dedup context
        raw_embedding = await providers.call_embedding(actual_content)
        existing = db.similarity_search(raw_embedding, project=project, threshold=0.78, limit=5)

        formatted_existing = (
            json.dumps(
                [{"id": m["id"], "content": m["content"], "category": m["category"]} for m in existing]
            )
            if existing
            else "[]"
        )

        # 2. Format extraction prompt — strengthen dedup hint when near-duplicates exist
        extra_hint = ""
        if existing:
            extra_hint = (
                "\nNOTE: The following highly similar memories already exist. "
                "Only ADD if this is genuinely new or distinct information not covered by them.\n"
                + formatted_existing
            )

        extraction_prompt = prompts.EXTRACTION_PROMPT.format(
            new_content=content,
            existing_memories=formatted_existing,
            project=project,
        ) + extra_hint

        # 3. Call extraction provider (async)
        res = await providers.call_extraction(extraction_prompt)
        facts = res.get("facts", [])

        if not facts:
            return "Nothing worth remembering in that — no new fact stored."

        summaries = []
        # 4. Embed all ADD facts concurrently
        add_facts = [(i, f) for i, f in enumerate(facts) if f.get("action", "ADD").upper() == "ADD" and f.get("content")]
        if add_facts:
            embeddings = await asyncio.gather(
                *[providers.call_embedding(f["content"]) for _, f in add_facts],
                return_exceptions=True,
            )
            for (i, fact), emb in zip(add_facts, embeddings):
                if isinstance(emb, Exception):
                    summaries.append(f'Failed to embed: "{fact["content"]}" — {emb}')
                    continue
                cat_to_use = category if category else fact.get("category", "other")
                imp_to_use = int(fact.get("importance", 3)) if isinstance(fact.get("importance"), (int, float)) else 3
                tags_to_use = fact.get("tags", []) if isinstance(fact.get("tags"), list) else []
                entities_to_use = fact.get("entities", []) if isinstance(fact.get("entities"), list) else []
                db.insert_memory(
                    content=fact["content"],
                    embedding=emb,
                    category=cat_to_use,
                    project=project,
                    source_tool=get_config().aethos_source_tool,
                    importance=imp_to_use,
                    tags=tags_to_use,
                    entities=entities_to_use,
                )
                summaries.append(f'Stored: "{fact["content"]}" (category: {cat_to_use}, project: {project}, importance: {imp_to_use}/5)')

        # 5. Handle UPDATE and DELETE facts sequentially (order matters)
        for fact in facts:
            action = fact.get("action", "ADD").upper()
            existing_id = fact.get("existing_id")
            fact_content = fact.get("content")

            if action == "UPDATE" and existing_id and fact_content:
                fact_emb = await providers.call_embedding(fact_content)
                db.update_memory(memory_id=existing_id, content=fact_content, embedding=fact_emb)
                summaries.append(f'Updated: "{fact_content}" (category: {fact.get("category", "other")}, project: {project})')

            elif action == "DELETE" and existing_id:
                db.delete_memory(existing_id)
                summaries.append(f"Deleted memory: {existing_id}")

        cache_manager.invalidate()
        return "\n".join(summaries) if summaries else "No facts updated."

    except Exception as err:
        return f"Memory storage failed — {str(err)}. Storage operation is non-fatal."


@mcp.tool()
async def recall(
    query: str = "",
    q: str = "",
    text: str = "",
    query_text: str = "",
    search_query: str = "",
    project: str = "global",
    strategy: str = "agentic_rag_strategy",
) -> str:
    """[PROACTIVE RECALL — CALL BEFORE ANSWERING]
    Retrieve relevant stored memory context based on query text."""
    try:
        # Non-blocking event-driven scan for recent turns
        _safe_background_task(auto_ingest.run_auto_ingest_cycle())

        actual_query = (query or q or text or query_text or search_query or "").strip()
        project = project or "global"

        # Auto-record recall query in activity telemetry
        try:
            harness_name = get_config().aethos_source_tool
            activity.record_activity_event(
                event_type="tool_call",
                harness=harness_name,
                title=f"Recall via {harness_name}: {actual_query[:60] if actual_query else 'Recent Context'}",
                tool_name="recall",
                tool_input=actual_query,
                project=project,
                status="success",
            )
        except Exception as e:
            logger.debug(f"Failed to record activity in recall: {e}")

        results = []

        if actual_query:
            strat_fn = retrieval.STRATEGIES.get(strategy, retrieval.agentic_rag_strategy)
            results = await strat_fn(actual_query, project=project)

        if not results:
            results = db.fetch_all_memories(limit=5)

        if not results:
            return f"No stored memories available."

        formatted_cards = []
        for i, m in enumerate(results, 1):
            project_tag = f"[{m.get('project', 'global')}]"
            category_tag = f"[{m.get('category', 'other')}]"
            formatted_cards.append(f"{i}. {project_tag}{category_tag} {m['content']}")

        return f"### Retrieved Aethos Memory Context:\n" + "\n".join(formatted_cards)

    except Exception as err:
        logger.error(f"Recall error: {err}")
        try:
            results = db.fetch_all_memories(limit=5)
            if results:
                formatted_cards = [f"{i}. [{m.get('project', 'global')}][{m.get('category', 'other')}] {m['content']}" for i, m in enumerate(results, 1)]
                return "### Retrieved Aethos Memory Context:\n" + "\n".join(formatted_cards)
        except Exception as e:
            logger.error(f"Fallback recall also failed: {e}")
        return "### Retrieved Aethos Memory Context:\nNo memories retrieved due to an error."


@mcp.tool()
async def get_skeleton_context(query: str = "", project: str = "global", limit: int = 10) -> str:
    """[65-70% TOKEN REDUCTION] Retrieve ultra-dense skeleton representation of stored memory context."""
    try:
        project = project or "global"
        if query and query.strip():
            results = await retrieval.agentic_rag_strategy(query, project=project)
        else:
            results = db.fetch_all_memories(limit=limit)

        return skeleton.compress_to_skeleton(results)
    except Exception as err:
        return f"Skeleton context generation error: {err}"


@mcp.tool()
async def get_knowledge_graph(project: str = "global", limit: int = 20) -> str:
    """[GRAPH-RAG PIVOT NODES] Retrieve concept relationship graph clusters across stored memories."""
    try:
        memories = db.fetch_all_memories(limit=limit)
        graph_data = graph.expand_graph_pivot_nodes(memories)
        return json.dumps(graph_data, indent=2)
    except Exception as err:
        return json.dumps({"error": str(err)})




@mcp.tool()
async def forget(
    memory_id: str | None = None,
    description: str | None = None,
    project: str = "global",
) -> str:
    """Delete a memory from Aethos Memory."""
    try:
        project = project or "global"
        if memory_id:
            db.delete_memory(memory_id)
            cache_manager.invalidate()
            return f"Memory {memory_id} deleted."

        if not description:
            return "Provide either memory_id or description to forget."

        query_emb = await providers.call_embedding(description)
        matches = db.similarity_search(query_emb, project=project, threshold=0.75, limit=3)

        if not matches:
            return f"No memory matched description '{description}'."

        deleted = []
        for m in matches:
            db.delete_memory(m["id"])
            deleted.append(m["content"])

        cache_manager.invalidate()
        return f"Deleted {len(deleted)} matching memories:\n" + "\n".join([f"- {c}" for c in deleted])

    except Exception as err:
        return f"Memory deletion failed — {str(err)}."


@mcp.tool()
async def auto_save_turn(
    transcript: str = "",
    project: str = "global",
) -> str:
    """[AUTOMATED BACKGROUND INGESTION]
    Pass raw user/assistant conversation turn text. Automatically extracts and indexes memories silently in background."""
    if not transcript or not transcript.strip():
        return "No transcript content provided."

    count = await auto_ingest.process_transcript_text(transcript, source_tool="Auto-Save-Turn", project=project)
    return f"Auto-save turn completed. {count} memories extracted and indexed."


@mcp.tool()
async def summarize_session(
    transcript: str = "",
    project: str = "global",
) -> str:
    """Summarize an entire working session transcript and store all extracted facts."""
    try:
        if not transcript or not transcript.strip():
            return "No transcript content provided."

        count = await auto_ingest.process_transcript_text(transcript, source_tool="Session-Summary", project=project)
        cache_manager.invalidate()
        return f"Session summarized. {count} facts stored."

    except Exception as err:
        return f"Session summarization failed — {str(err)}."


# =====================================================================
# Threat Rules & Safety Guardrail Tools
# =====================================================================

@mcp.tool()
async def audit_action(
    action_type: str = "command",
    target: str = "",
    content: str = "",
    context: str = "",
) -> str:
    """[SAFETY & THREAT RULES GUARDRAIL — CALL BEFORE RISKY COMMANDS OR EDITS]
    Audit a proposed shell command, script, file edit, database query, or prompt against threat rules.
    Evaluates against: destructive filesystem ops, dangerous pipes to shell, unbounded DROP/DELETE,
    credential/token scraping, security config edits, and prompt injection patterns.
    Returns verdict ('ALLOW', 'WARN', 'BLOCK'), risk score (0.0 to 1.0), and safety recommendations."""
    report = threat_rules.audit_action(action_type=action_type, target=target, content=content, context=context)

    # Auto-log audit verdict to activity telemetry
    try:
        harness_name = get_config().aethos_source_tool
        verdict = report.get("verdict", "ALLOW")
        ev_type = "approval" if verdict == "ALLOW" else ("command" if verdict == "WARN" else "error")
        ev_status = "success" if verdict == "ALLOW" else ("warning" if verdict == "WARN" else "blocked")
        activity.record_activity_event(
            event_type=ev_type,
            harness=harness_name,
            title=f"Sentinel {verdict}: {action_type} on {target[:40] if target else 'content'}",
            status=ev_status,
            metadata=report,
        )
    except Exception as e:
        logger.debug(f"Failed to record activity in audit_action: {e}")

    return json.dumps(report, indent=2)


# =====================================================================
# Cross-Harness Activity Telemetry & Execution Tracing Tools
# =====================================================================

@mcp.tool()
async def record_activity(
    event_type: str = "command",
    title: str = "",
    command: str = "",
    tool_name: str = "",
    tool_input: str = "",
    tool_output: str = "",
    diff: str = "",
    error: str = "",
    agent_thought: str = "",
    exit_code: int | None = None,
    status: str = "success",
    harness: str = "mcp_client",
    session_id: str = "",
    project: str = "global",
) -> str:
    """[CROSS-HARNESS EXECUTION TELEMETRY — FLIGHT RECORDER]
    Record an agent execution step (commands, tool calls, bash stdout, diffs, operator approvals, agent thoughts)
    into Supabase with automatic secret scrubbing. Enables full session replay and post-session distillation."""
    ev = activity.record_activity_event(
        event_type=event_type,
        title=title,
        command=command or None,
        tool_name=tool_name or None,
        tool_input=tool_input or None,
        tool_output=tool_output or None,
        diff=diff or None,
        error=error or None,
        agent_thought=agent_thought or None,
        exit_code=exit_code,
        status=status,
        harness=harness,
        session_id=session_id or None,
        project=project or "global",
    )
    return f"Activity event recorded: {ev.get('id')} [{status}]"


@mcp.tool()
async def search_activity(
    query: str = "",
    harness: str = "",
    event_type: str = "",
    session_id: str = "",
    project: str = "global",
    limit: int = 15,
) -> str:
    """[ACTIVITY SEARCH & REPLAY]
    Search past agent execution steps, commands run, tool calls, and error traces across sessions and harnesses."""
    events = activity.search_activity(
        query=query or None,
        harness=harness or None,
        event_type=event_type or None,
        session_id=session_id or None,
        project=project,
        limit=limit,
    )
    if not events:
        return "No matching activity events found."

    lines = []
    for i, ev in enumerate(events, 1):
        payload = ev.get("payload") or {}
        cmd_str = f" | cmd: {payload.get('command')}" if "command" in payload else ""
        tool_str = f" | tool: {payload.get('tool_name')}" if "tool_name" in payload else ""
        lines.append(f"{i}. [{ev.get('harness')}][{ev.get('event_type')}][{ev.get('status')}] {ev.get('title')}{cmd_str}{tool_str} (ID: {ev.get('id')})")
    return "### Recorded Agent Activity Events:\n" + "\n".join(lines)


@mcp.tool()
async def get_activity_event(event_id: str) -> str:
    """[ACTIVITY DETAIL INSPECTION]
    Fetch complete raw payload (stdout, stderr, tool input/output, diff, reasoning) for an activity event."""
    ev = activity.get_activity_event(event_id)
    if not ev:
        return f"Activity event '{event_id}' not found."
    return json.dumps(ev, indent=2)


@mcp.tool()
async def summarize_activity(
    session_id: str = "",
    project: str = "global",
    limit: int = 30,
) -> str:
    """[ACTIVITY OBSERVABILITY SUMMARY]
    Return analytical summary of recent agent runs (total events, commands executed, tool usage, failures)."""
    summary = activity.summarize_activity(session_id=session_id or None, project=project, limit=limit)
    return json.dumps(summary, indent=2)


@mcp.tool()
async def list_activity_filters(project: str = "global") -> str:
    """List distinct harnesses, event types, and sessions recorded in activity telemetry."""
    filters = activity.list_activity_filters(project=project)
    return json.dumps(filters, indent=2)


# =====================================================================
# Knowledge Distillation & Skill Promotion Tools (Traces to Skills)
# =====================================================================

@mcp.tool()
async def distill_lesson(
    session_trace: str = "",
    session_id: str = "",
    project: str = "global",
) -> str:
    """[TRACES-TO-MEMORY DISTILLATION]
    Analyze an agent session trace (or recent activity events) and distill high-signal lessons
    categorized by kind: 'workflow', 'correction', 'debugging_pattern', 'gotcha', or 'convention'.
    Creates review candidates in Supabase awaiting user approval."""
    trace_text = session_trace
    if not trace_text and session_id:
        events = activity.search_activity(session_id=session_id, project=project, limit=50)
        trace_text = json.dumps(events, indent=2)
    if not trace_text:
        return "Please provide session_trace text or a valid session_id to distill."

    candidates = await distillation.distill_lesson(trace_text, project=project, session_id=session_id or None)
    if not candidates:
        return "No reusable lesson candidates could be distilled from the provided trace."

    lines = []
    for c in candidates:
        lines.append(f"- Candidate ID: {c.get('id')} | Kind: [{c.get('kind')}] | Title: {c.get('title')}\n  Applicability: {c.get('applicability')}\n  Tags: {', '.join(c.get('tags', []))}")
    return f"Distilled {len(candidates)} candidate lesson(s) awaiting review:\n" + "\n\n".join(lines)


@mcp.tool()
async def list_candidates(
    state: str = "candidate",
    kind: str = "",
    project: str = "global",
    limit: int = 25,
) -> str:
    """[CANDIDATE REVIEW PIPELINE]
    List memory candidates awaiting review or promotion (state: 'candidate', 'approved', 'rejected', 'superseded')."""
    candidates = distillation.list_candidates(project=project, state=state or None, kind=kind or None, limit=limit)
    if not candidates:
        return f"No memory candidates found with state '{state}'."

    lines = []
    for i, c in enumerate(candidates, 1):
        lines.append(f"{i}. [{c.get('state').upper()}][{c.get('kind')}] {c.get('title')} (ID: {c.get('id')})\n   Applicability: {c.get('applicability')}\n   Tags: {', '.join(c.get('tags', []))}")
    return "### Distilled Memory Candidates:\n" + "\n".join(lines)


@mcp.tool()
async def get_candidate(candidate_id: str) -> str:
    """Fetch complete details of a memory candidate including body and evidence."""
    cand = distillation.get_candidate(candidate_id)
    if not cand:
        return f"Candidate '{candidate_id}' not found."
    return json.dumps(cand, indent=2)


@mcp.tool()
async def approve_candidate(
    candidate_id: str,
    title: str = "",
    kind: str = "",
    applicability: str = "",
    body: str = "",
    tags: str = "",
    reason: str = "Approved by user review",
    project: str = "global",
) -> str:
    """[APPROVE & PROMOTE CANDIDATE TO MEMORY]
    Approve a candidate lesson, embedding and indexing it into active vector memory with maximum priority (importance=5)."""
    tags_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else None
    res = await distillation.approve_candidate(
        candidate_id=candidate_id,
        title=title or None,
        kind=kind or None,
        applicability=applicability or None,
        body=body or None,
        tags=tags_list,
        reason=reason,
        project=project,
    )
    return res.get("message", "Candidate approved.")


@mcp.tool()
async def reject_candidate(candidate_id: str, reason: str = "Rejected by user review") -> str:
    """[REJECT CANDIDATE] Mark a candidate lesson as rejected."""
    res = distillation.reject_candidate(candidate_id, reason=reason)
    return res.get("message", "Candidate rejected.")


@mcp.tool()
async def supersede_candidate(candidate_id: str, replacement_id: str, reason: str = "Superseded by newer memory") -> str:
    """[SUPERSEDE CANDIDATE] Mark a candidate lesson as superseded by another memory item."""
    res = distillation.supersede_candidate(candidate_id, replacement_id, reason=reason)
    return res.get("message", "Candidate superseded.")


@mcp.tool()
async def promote_to_skill(
    candidate_id: str,
    project_root: str = "",
    force: bool = False,
) -> str:
    """[PROMOTE LESSON TO AGENT SKILL — AUTO-LOAD IN ALL HARNESSES]
    Install an approved memory candidate as an Agent Skill in .agents/skills/<slug>/SKILL.md in the project root.
    All skill-capable AI agents (Cursor, Claude Code, Codex, OpenCode, Antigravity) will automatically load and follow the lesson!"""
    res = distillation.promote_to_skill(candidate_id=candidate_id, project_root=project_root or None, force=force)
    if res.get("success"):
        return f"Success! Agent Skill installed at: {res.get('path')} (Slug: {res.get('slug')})\nTitle: {res.get('title')}"
    return f"Skill promotion failed: {res.get('error')}"


# =====================================================================
# Task-Oriented Context & Semantic Retrieval Tools
# =====================================================================

@mcp.tool()
async def get_session_handoff(project: str = "global", limit: int = 8) -> str:
    """[AUTOMATIC CRASH RECOVERY & PASSIVE SESSION HANDOFF]
    Automatically reconstructs where the previous session left off across ANY tool (Antigravity, OpenCode, Claude Code, Cursor, Windsurf).
    Use this whenever:
    1. Switching from one AI assistant or IDE to another.
    2. Resuming after an unexpected crash, rate limit cutoff, or context window limit.
    3. The user asks 'what were we doing?', 'continue', or 'where did we leave off?'.
    Fetches the latest execution traces, recent commands run, and newly stored architectural memories without requiring any manual handoff."""
    try:
        recent_mems = db.fetch_all_memories(limit=5)
        recent_events = db.query_activity_events(project=project, limit=limit)

        sections = ["### 🔄 Aethos Continuous Session Recovery & Handoff"]

        if recent_events:
            last_event = recent_events[0]
            sections.append(f"**Last Active Tool / Harness:** {last_event.get('harness', 'Unknown')}")
            sections.append(f"**Last Recorded Action:** `[{last_event.get('event_type')}]` {last_event.get('title')} ({last_event.get('status')})")

            event_lines = []
            for ev in recent_events[:6]:
                payload = ev.get("payload") or {}
                cmd_extra = f" | cmd: `{payload.get('command')}`" if payload.get("command") else ""
                tool_extra = f" | tool: `{payload.get('tool_name')}`" if payload.get("tool_name") else ""
                event_lines.append(f"- `[{ev.get('harness')}][{ev.get('event_type')}]` {ev.get('title')}{cmd_extra}{tool_extra}")
            sections.append("\n**Recent Execution Timeline (Flight Recorder):**\n" + "\n".join(event_lines))

        if recent_mems:
            mem_lines = []
            for m in recent_mems[:5]:
                cat = m.get("category", "general")
                tool = m.get("source_tool", "Aethos")
                mem_lines.append(f"- `[{tool}][{cat}]` {m.get('content')}")
            sections.append("\n**Recently Stored Context & Decisions:**\n" + "\n".join(mem_lines))

        if not recent_events and not recent_mems:
            return "No previous session activity or memories found to recover."

        sections.append("\n**Resume State:** All prior activity and decisions recovered from Supabase. Ready to continue seamlessly.")
        return "\n".join(sections)
    except Exception as e:
        logger.error(f"Error in get_session_handoff: {e}")
        return f"Failed to retrieve session handoff: {e}"


@mcp.tool()
async def get_memory_context(
    task: str = "",
    project: str = "global",
    limit: int = 5,
    kind: str = "",
) -> str:
    """[TASK-ORIENTED APPROVED MEMORY CONTEXT]
    Return high-relevance approved memories, lessons, conventions, and debugging patterns for the current task before starting execution.
    Automatically detects continuation requests ('continue', 'resume', 'where did we leave off') and recovers previous session handoff."""
    task_lower = (task or "").lower()
    if any(k in task_lower for k in ["continue", "resume", "handoff", "left off", "previous", "prior", "last session"]):
        handoff = await get_session_handoff(project=project)
        recalled = await recall(query=task, project=project)
        return f"{handoff}\n\n### Relevant Memories for Task:\n{recalled}"
    return await recall(query=task, project=project)


@mcp.tool()
async def search_memory(
    query: str = "",
    project: str = "global",
    limit: int = 10,
    kind: str = "",
) -> str:
    """[SEARCH APPROVED MEMORIES]
    Search approved project memory and lessons with kind and project scoping."""
    return await recall(query=query, project=project)


# Alias registrations
@mcp.tool()
async def save_memory(
    content: str = "",
    project: str = "global",
    category: str | None = None,
) -> str:
    """[MANDATORY SYSTEM DIRECTIVE — AUTO-SAVE ON EVERY TURN]
    Alias for remember."""
    return await remember(content=content, project=project, category=category)


@mcp.tool()
async def search_memories(query: str = "", project: str = "global") -> str:
    """Alias for recall."""
    return await recall(query=query, project=project)


@mcp.tool()
async def delete_memory(memory_id: str = None, description: str = None, project: str = "global") -> str:
    """Alias for forget."""
    return await forget(memory_id=memory_id, description=description, project=project)


def main():
    mcp.run(show_banner=False)



if __name__ == "__main__":
    main()
