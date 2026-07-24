import json
from fastmcp import FastMCP
from aethos_memory import db, providers, prompts, retrieval

mcp = FastMCP("aethos-memory")

# Active retrieval strategy (selected empirically via eval/run_eval.py benchmark: 83.3% Hit@1, 0.875 MRR)
ACTIVE_RETRIEVAL_STRATEGY = retrieval.STRATEGIES["retry_and_rerank_search"]


@mcp.tool()
def remember(content: str = "", project: str = "global") -> str:
    """Store a fact, decision, or preference that should be available in future
    sessions and to other AI tools, not just this conversation. Call this whenever
    the user states a preference, makes a decision about how something should be
    built or done, or shares information that would matter in a later, unrelated
    conversation. Do not call this for details that only matter for the current
    task and won't be useful again."""
    try:
        if not content or not content.strip():
            return "Memory storage skipped — no content provided."

        project = project or "global"

        # 1. Embed raw content for similarity search / dedup context
        raw_embedding = providers.call_embedding(content)
        existing = db.similarity_search(raw_embedding, project=project, threshold=0.65, limit=5)

        formatted_existing = (
            json.dumps(
                [{"id": m["id"], "content": m["content"], "category": m["category"]} for m in existing]
            )
            if existing
            else "[]"
        )

        # 2. Format extraction prompt
        extraction_prompt = prompts.EXTRACTION_PROMPT.format(
            new_content=content,
            existing_memories=formatted_existing,
            project=project,
        )

        # 3. Call extraction provider
        res = providers.call_extraction(extraction_prompt)
        facts = res.get("facts", [])

        if not facts:
            return "Nothing worth remembering in that — no new fact stored."

        summaries = []
        for fact in facts:
            fact_content = fact.get("content")
            category = fact.get("category", "other")
            action = fact.get("action", "ADD").upper()
            existing_id = fact.get("existing_id")

            if action == "ADD" and fact_content:
                fact_emb = providers.call_embedding(fact_content)
                db.insert_memory(
                    content=fact_content,
                    embedding=fact_emb,
                    category=category,
                    project=project,
                    source_tool="MCP Client",
                )
                summaries.append(f'Stored: "{fact_content}" (category: {category}, project: {project})')

            elif action == "UPDATE" and existing_id and fact_content:
                fact_emb = providers.call_embedding(fact_content)
                db.update_memory(memory_id=existing_id, content=fact_content, embedding=fact_emb)
                summaries.append(f'Updated: "{fact_content}" (category: {category}, project: {project})')

            elif action == "DELETE" and existing_id:
                deleted = db.delete_memory(memory_id=existing_id)
                summaries.append(f'Deleted outdated memory id: {existing_id}')

            elif action == "SKIP":
                continue

        if not summaries:
            return "Nothing worth remembering in that — no new fact stored."

        return "\n".join(summaries)

    except Exception as err:
        return f"Memory storage failed — {str(err)}. Try again shortly."


@mcp.tool()
def recall(query: str = "", project: str = "global") -> str:
    """Search stored memory for facts relevant to the current conversation. Call
    this before answering anything that references past decisions, preferences,
    or project history, and at the start of a session to load relevant context
    before doing other work."""
    try:
        project = project or "global"
        if not query or not query.strip():
            return list_memories(project=project)

        matches = ACTIVE_RETRIEVAL_STRATEGY(query, project)
        if not matches:
            return f"No stored memories match '{query}' in project '{project}'."

        lines = [f"Found {len(matches)} relevant memories:"]
        for idx, m in enumerate(matches, 1):
            lines.append(f"{idx}. {m['content']} ({m['category']})")
        return "\n".join(lines)

    except Exception as err:
        return f"Memory recall failed — {str(err)}."


@mcp.tool()
def forget(memory_id: str = None, description: str = None) -> str:
    """Delete a previously stored memory, by its id if known, otherwise by a
    description of what it was. Call this when the user corrects or retracts
    something that was previously remembered."""
    try:
        if not memory_id and not description:
            return "Memory deletion failed — please provide either a memory_id or a description of what to delete."

        target_id = memory_id
        target_content = description

        if not target_id and description:
            from aethos_memory.config import get_config as _get_config
            _cfg = _get_config()
            search_project = _cfg.aethos_project or "global"
            emb = providers.call_embedding(description)
            matches = db.similarity_search(emb, project=search_project, threshold=0.7, limit=1)
            if not matches:
                # Broaden to global if not found in the configured project
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
def list_memories(project: str = "global") -> str:
    """Return every stored memory for a given project, unfiltered. Use this for
    a full context load at the start of a session rather than recall's targeted
    search."""
    try:
        project = project or "global"
        memories = db.list_by_project(project)
        if not memories:
            return f"No memories stored for project '{project}'."

        lines = [f"Stored memories for project '{project}' ({len(memories)} total):"]
        for idx, m in enumerate(memories, 1):
            lines.append(f"{idx}. [{m['id']}] {m['content']} ({m['category']}, source: {m.get('source_tool', 'unknown')})")
        return "\n".join(lines)

    except Exception as err:
        return f"Memory listing failed — {str(err)}."


# Alias registrations for cross-client compatibility
@mcp.tool()
def save_memory(content: str = "", project: str = "global") -> str:
    """Alias for remember. Store a fact, decision, or preference."""
    return remember(content=content, project=project)


@mcp.tool()
def search_memories(query: str = "", project: str = "global") -> str:
    """Alias for recall. Search stored memory for relevant facts."""
    return recall(query=query, project=project)


@mcp.tool()
def delete_memory(memory_id: str = None, description: str = None) -> str:
    """Alias for forget. Delete a previously stored memory."""
    return forget(memory_id=memory_id, description=description)


def main():
    mcp.run()


if __name__ == "__main__":
    main()
