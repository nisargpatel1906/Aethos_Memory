"""Prompts and instruction snippets for Aethos Memory."""

EXTRACTION_PROMPT = """You are a memory extraction engine for a personal AI context system. Read the NEW_CONTENT below and decide what, if anything, is worth remembering long-term about the user or their project.

You will be given:
- NEW_CONTENT: {new_content}
- EXISTING_MEMORIES: {existing_memories}
- PROJECT: {project}

Extract atomic facts only. A fact is atomic if it expresses exactly one idea and remains true and understandable on its own, without needing the rest of the conversation. Do not extract:
- small talk, greetings, pleasantries, or acknowledgments (e.g. "hi", "good morning", "how are you")
- meals, eating, drinking, or food activities (e.g. "eating a sandwich", "drinking coffee", "having lunch", "ordering dinner")
- transient daily activities or trivial state that won't matter next week (e.g. taking a break, feeling tired, current weather, time of day)
- generic facts stating only that the user is working on the project or using a default project tag
- questions on their own (only store the concrete answer, decision, or fact that resulted)
- anything already fully covered by an existing memory with no new information added

For every fact you keep, rewrite it so it stands alone. Resolve pronouns and vague references. "It broke because of that" is not acceptable. "The FastAPI backend crashed due to an unhandled Pydantic validation error on the /debate endpoint" is.

Never store secrets. If NEW_CONTENT contains an API key, password, or token, store only a reference to its existence and purpose, never the value itself.

Compare each candidate fact against EXISTING_MEMORIES:
- No related memory exists: action = "ADD"
- An existing memory already says the same thing, just worded differently: action = "SKIP"
- An existing memory is outdated or contradicted by this new fact: action = "UPDATE", include the existing memory's id
- The user is explicitly correcting or retracting something previously stored: action = "DELETE", include the id

Output strict JSON only. No text before or after it. No markdown code fences.

{{
  "facts": [
    {{
      "content": "string, the atomic self-contained fact",
      "category": "preference | decision | project_detail | other",
      "action": "ADD | UPDATE | SKIP | DELETE",
      "existing_id": "string or null, required when action is UPDATE or DELETE"
    }}
  ]
}}

If nothing in NEW_CONTENT is worth remembering, return exactly: {{"facts": []}}"""


INSTRUCTION_SNIPPET = """Before responding to anything that references past decisions, preferences, or
earlier project work, call recall first. When you learn something worth
keeping, a decision, a stated preference, a correction to something already
stored, call remember before ending your turn, without asking permission
first. This should happen as a normal, silent part of how you work, not a
step you narrate to the user."""
