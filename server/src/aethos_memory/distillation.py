"""Aethos Distill: Knowledge Distillation & Skill Promotion Engine.

Turns recorded agent activity and session execution traces into reviewed, reusable project memory
and installs approved lessons directly into standard Agent Skills (.agents/skills/<slug>/SKILL.md).
"""

import os
import re
import logging
from typing import Any
from aethos_memory import db, providers, prompts
from aethos_memory.caching import cache_manager

logger = logging.getLogger("aethos_memory.distillation")


def slugify(text: str) -> str:
    """Generate a clean, filesystem-safe skill slug from a title."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")[:64] or "custom-skill"


async def distill_lesson(
    session_trace: str,
    project: str = "global",
    session_id: str | None = None,
) -> list[dict[str, Any]]:
    """Distill structured lesson candidates from an agent session trace.

    Analyzes commands, tool calls, errors, and resolutions using an LLM rubric.
    Creates candidates in 'candidate' state in Supabase awaiting user confirmation.
    """
    if not session_trace or len(session_trace.strip()) < 30:
        return []

    try:
        prompt = prompts.DISTILLATION_PROMPT.format(
            session_trace=session_trace[-12000:], # Keep within prompt bounds
            project=project,
        )
        res = await providers.call_extraction(prompt)
        candidates_data = res.get("candidates", [])

        created = []
        for c in candidates_data:
            title = c.get("title", "").strip()
            body = c.get("body", "").strip()
            kind = c.get("kind", "workflow").strip()
            applicability = c.get("applicability", "").strip()
            tags = c.get("tags", [])
            evidence_summary = c.get("evidence_summary", "")

            if not title or not body:
                continue

            evidence = {
                "session_id": session_id,
                "summary": evidence_summary,
                "trace_preview": session_trace[:300],
            }

            candidate = db.insert_memory_candidate(
                title=title,
                body=body,
                kind=kind,
                applicability=applicability,
                project=project,
                tags=tags if isinstance(tags, list) else [],
                evidence=evidence,
            )
            created.append(candidate)

        return created
    except Exception as e:
        logger.error(f"Error distilling lesson: {e}")
        return []


def list_candidates(
    project: str = "global",
    state: str | None = None,
    kind: str | None = None,
    limit: int = 25,
) -> list[dict[str, Any]]:
    """List memory candidates filtered by state and kind."""
    return db.query_memory_candidates(
        project=project,
        state=state,
        kind=kind,
        limit=limit,
    )


def get_candidate(candidate_id: str) -> dict[str, Any] | None:
    """Fetch complete details of a memory candidate."""
    return db.get_memory_candidate_by_id(candidate_id)


async def approve_candidate(
    candidate_id: str,
    title: str | None = None,
    kind: str | None = None,
    applicability: str | None = None,
    body: str | None = None,
    tags: list[str] | None = None,
    reason: str = "Approved by user review",
    project: str = "global",
) -> dict[str, Any]:
    """Approve a memory candidate and promote it into active vector memory.

    Generates embedding for the approved lesson and saves it in the memories table.
    """
    candidate = db.get_memory_candidate_by_id(candidate_id)
    if not candidate:
        raise ValueError(f"Candidate {candidate_id} not found")

    final_title = title or candidate.get("title", "")
    final_kind = kind or candidate.get("kind", "workflow")
    final_app = applicability if applicability is not None else candidate.get("applicability", "")
    final_body = body or candidate.get("body", "")
    final_tags = tags if tags is not None else candidate.get("tags", [])
    if isinstance(final_tags, list) and final_kind not in final_tags:
        final_tags.append(final_kind)

    # Construct unified lesson content for semantic retrieval
    lesson_content = f"[{final_kind.upper()}] {final_title}\nApplicability: {final_app}\n\n{final_body}".strip()

    # Generate vector embedding for semantic search
    embedding = await providers.call_embedding(lesson_content)

    # Insert into memories table
    inserted_memory = db.insert_memory(
        content=lesson_content,
        embedding=embedding,
        category="decision",
        project=project or candidate.get("project", "global"),
        source_tool=f"Aethos-Distill ({final_kind})",
        importance=5, # Approved project lessons have maximum importance
        tags=final_tags,
    )

    # Mark candidate approved in database
    updated_candidate = db.update_candidate_state(
        candidate_id=candidate_id,
        state="approved",
        review_reason=reason,
        memory_id=inserted_memory.get("id"),
        title=final_title,
        body=final_body,
        kind=final_kind,
        applicability=final_app,
        tags=final_tags,
    )

    cache_manager.invalidate()
    return {
        "candidate": updated_candidate,
        "memory": inserted_memory,
        "message": f"Candidate '{final_title}' successfully approved and indexed in Aethos Memory.",
    }


def reject_candidate(candidate_id: str, reason: str = "Rejected by user review") -> dict[str, Any]:
    """Reject a memory candidate."""
    updated = db.update_candidate_state(
        candidate_id=candidate_id,
        state="rejected",
        review_reason=reason,
    )
    return {
        "candidate": updated,
        "message": f"Candidate {candidate_id} marked as rejected.",
    }


def supersede_candidate(candidate_id: str, replacement_id: str, reason: str = "Superseded by newer memory") -> dict[str, Any]:
    """Mark a memory candidate as superseded by another memory or candidate."""
    updated = db.update_candidate_state(
        candidate_id=candidate_id,
        state="superseded",
        review_reason=reason,
        superseded_by=replacement_id,
    )
    return {
        "candidate": updated,
        "message": f"Candidate {candidate_id} superseded by {replacement_id}.",
    }


def promote_to_skill(
    candidate_id: str,
    project_root: str | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """Install an approved memory candidate as an Agent Skill in the project.

    Writes standard .agents/skills/<slug>/SKILL.md with YAML frontmatter so all
    skill-capable harnesses (Claude Code, Cursor, Codex, OpenCode, Antigravity)
    automatically discover and load the lesson.
    """
    candidate = db.get_memory_candidate_by_id(candidate_id)
    if not candidate:
        raise ValueError(f"Candidate {candidate_id} not found")

    title = candidate.get("title", "custom-skill")
    kind = candidate.get("kind", "workflow")
    applicability = candidate.get("applicability", "")
    body = candidate.get("body", "")
    slug = slugify(title)

    # Determine project root: use explicit path or current working directory
    base_dir = os.path.abspath(project_root or os.getcwd())
    skill_dir = os.path.join(base_dir, ".agents", "skills", slug)
    skill_file = os.path.join(skill_dir, "SKILL.md")

    if os.path.exists(skill_file) and not force:
        return {
            "success": False,
            "error": f"Skill file already exists at {skill_file}. Pass force=True to overwrite.",
            "path": skill_file,
            "slug": slug,
        }

    os.makedirs(skill_dir, exist_ok=True)

    description = applicability or title
    skill_content = f"""---
name: {slug}
description: {description}
license: MIT
metadata:
  author: Aethos Memory
  source_candidate_id: {candidate_id}
  kind: {kind}
---

# {title}

**Applicability:** {applicability if applicability else 'General project convention'}

## Grounded Lesson

{body}
"""

    with open(skill_file, "w", encoding="utf-8") as f:
        f.write(skill_content)

    return {
        "success": True,
        "path": skill_file,
        "slug": slug,
        "title": title,
        "message": f"Successfully promoted lesson to Agent Skill at .agents/skills/{slug}/SKILL.md",
    }
