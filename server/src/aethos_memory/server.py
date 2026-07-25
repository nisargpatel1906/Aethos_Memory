import asyncio
import json
from fastmcp import FastMCP
from aethos_memory import db, providers, prompts, retrieval
from aethos_memory.config import get_config

mcp = FastMCP("aethos-memory")


@mcp.tool()
async def remember(
    content: str = "",
    project: str = "global",
    category: str | None = None,
) -> str:
    """CRITICAL INSTRUCTION: Call this tool AUTOMATICALLY and SILENTLY whenever the user:
    1. Mentions personal identity facts (name, birthdate, timezone, role).
    2. States a preference, workflow habit, stack choice, or rule.
    3. Shares a design decision, architecture choice, or project plan/goal.
    4. Explains what they are building or provides project context.
    
    DO NOT wait for the user to explicitly say 'remember this' or 'add this to memory'.
    Call remember() proactively during conversation as soon as meaningful facts are shared."""
    try:
        if not content or not content.strip():
            return "Memory storage skipped — no content provided."

        project = project or "global"

        # 1. Embed raw content for similarity search / dedup context
        raw_embedding = await providers.call_embedding(content)
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
                db.insert_memory(
                    content=fact["content"],
                    embedding=emb,
                    category=cat_to_use,
                    project=project,
                    source_tool=get_config().aethos_source_tool,
                )
                summaries.append(f'Stored: "{fact["content"]}" (category: {cat_to_use}, project: {project})')

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
                db.delete_memory(memory_id=existing_id)
                summaries.append(f'Deleted outdated memory id: {existing_id}')

        if not summaries:
            return "Nothing worth remembering in that — no new fact stored."

        return "\n".join(summaries)

    except Exception as err:
        return f"Memory storage failed — {str(err)}. Try again shortly."


@mcp.tool()
async def recall(query: str = "", project: str = "global") -> str:
    """Search stored memory for facts relevant to the current conversation. Call
    this before answering anything that references past decisions, preferences,
    or project history, and at the start of a session to load relevant context
    before doing other work."""
    try:
        project = project or "global"
        if not query or not query.strip():
            return await list_memories(project=project)

        matches = await retrieval.active_strategy(query, project)
        if not matches:
            return f"No stored memories match '{query}' in project '{project}'."

        lines = [f"Found {len(matches)} relevant memories:"]
        for idx, m in enumerate(matches, 1):
            lines.append(f"{idx}. {m['content']} ({m['category']})")
        return "\n".join(lines)

    except Exception as err:
        return f"Memory recall failed — {str(err)}."


@mcp.tool()
async def forget(memory_id: str = None, description: str = None, project: str = "global") -> str:
    """Delete a previously stored memory, by its id if known, otherwise by a
    description of what it was. Call this when the user corrects or retracts
    something that was previously remembered."""
    try:
        if not memory_id and not description:
            return "Memory deletion failed — please provide either a memory_id or a description of what to delete."

        target_id = memory_id
        target_content = description

        if not target_id and description:
            search_project = project or get_config().aethos_project or "global"
            emb = await providers.call_embedding(description)
            matches = db.similarity_search(emb, project=search_project, threshold=0.7, limit=1)
            if not matches:
                # Broaden to global if not found in the specified project
                matches = db.similarity_search(emb, project="global", threshold=0.7, limit=1)
            if matches:
                target_id = matches[0]["id"]
                target_content = matches[0]["content"]
            else:
                return f"No stored memory found matching description: '{description}'."

        deleted = db.delete_memory(target_id)
        content_name = target_content or deleted.get("content") or target_id
        return f'Deleted memory: "{content_name}"'

    except Exception as err:
        return f"Memory deletion failed — {str(err)}."


@mcp.tool()
async def list_memories(project: str = "global", limit: int = 50, page: int = 1) -> str:
    """Return stored memories for a given project. Use limit and page for pagination.
    Use this for a full context load at the start of a session rather than recall's
    targeted search."""
    try:
        project = project or "global"
        limit = max(1, min(limit, 200))  # clamp between 1 and 200
        offset = (max(1, page) - 1) * limit

        memories = db.list_by_project(project, limit=limit, offset=offset)
        if not memories:
            return f"No memories stored for project '{project}'."

        lines = [f"Stored memories for project '{project}' (page {page}, showing {len(memories)}):"]
        for idx, m in enumerate(memories, offset + 1):
            lines.append(f"{idx}. [{m['id']}] {m['content']} ({m['category']}, source: {m.get('source_tool', 'unknown')})")
        return "\n".join(lines)

    except Exception as err:
        return f"Memory listing failed — {str(err)}."


@mcp.tool()
async def summarize_session(
    session_transcript: str = "",
    transcript: str = "",
    text: str = "",
    project: str = "global",
) -> str:
    """Extract and store all important facts from a complete session transcript.
    Call this at the end of a long working session to auto-remember all key decisions,
    preferences, and architectural choices made during the session. Pass the full
    conversation text as session_transcript or transcript."""
    try:
        raw_text = session_transcript or transcript or text
        if not raw_text or not raw_text.strip():
            return "No session content provided to summarize."

        bulk_prompt = prompts.SESSION_SUMMARY_PROMPT.format(
            session_transcript=raw_text[:12000],  # guard against context overflow
            project=project,
        )
        res = await providers.call_extraction(bulk_prompt)
        facts = res.get("facts", [])

        if not facts:
            return "No memorable facts found in the session transcript."

        add_facts = [f for f in facts if f.get("action", "ADD").upper() == "ADD" and f.get("content")]
        if not add_facts:
            return "No new facts to add from the session transcript."

        # Embed all facts concurrently
        embeddings = await asyncio.gather(
            *[providers.call_embedding(f["content"]) for f in add_facts],
            return_exceptions=True,
        )

        summaries = []
        cfg = get_config()
        for fact, emb in zip(add_facts, embeddings):
            if isinstance(emb, Exception):
                continue
            db.insert_memory(
                content=fact["content"],
                embedding=emb,
                category=fact.get("category", "other"),
                project=project,
                source_tool=cfg.aethos_source_tool,
            )
            summaries.append(f'Stored: "{fact["content"]}"')

        return f"Session summarized. {len(summaries)} facts stored:\n" + "\n".join(summaries)

    except Exception as err:
        return f"Session summarization failed — {str(err)}."


# Alias registrations for cross-client compatibility
@mcp.tool()
async def save_memory(
    content: str = "",
    project: str = "global",
    category: str | None = None,
) -> str:
    """Alias for remember. Store a fact, decision, or preference."""
    return await remember(content=content, project=project, category=category)


@mcp.tool()
async def search_memories(query: str = "", project: str = "global") -> str:
    """Alias for recall. Search stored memory for relevant facts."""
    return await recall(query=query, project=project)


@mcp.tool()
async def delete_memory(memory_id: str = None, description: str = None, project: str = "global") -> str:
    """Alias for forget. Delete a previously stored memory."""
    return await forget(memory_id=memory_id, description=description, project=project)


def main():
    mcp.run()


if __name__ == "__main__":
    main()
