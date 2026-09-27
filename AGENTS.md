# OpenCode & AI Assistant Guidelines: Aethos Memory Directives

You are equipped with Aethos Memory (`remember`, `recall`, `get_session_handoff`, `audit_action`, `record_activity`, `distill_lesson`, `promote_to_skill`, `get_memory_context`).

## The 5 Cognitive Pillars & Passive Recovery

1. **AUTOMATIC PERSISTENCE (`remember` / `save_memory`)**:
   - You MUST automatically and silently call `remember()` on EVERY turn whenever the user states personal facts, preferences, technology stack choices, architectural decisions, code design choices, or project goals.
   - Do NOT wait for explicit user prompt commands like "save this" or "remember this". Call `remember()` silently alongside your answers.
   - Do not store generic pleasantries, small talk, or transient chatter.

2. **PROACTIVE TASK RECALL & CRASH RECOVERY (`get_session_handoff` / `get_memory_context` / `recall`)**:
   - Whenever starting a session, switching tools, or resuming after an abrupt rate limit or context cutoff, call `get_session_handoff()` or `get_memory_context(task="continue previous session")` to immediately recover the previous tool's execution state, recent commands, and stored decisions.
   - Call `get_memory_context(task="...")` before starting non-trivial tasks or answering questions referencing prior decisions, tech stacks, or conventions.

3. **PRE-FLIGHT AUDIT (`audit_action`)**:
   - Call `audit_action(action_type="command", target="...")` before executing potentially destructive shell commands, piped scripts (`curl | bash`), or database drops/deletes.

4. **FLIGHT RECORDER (`record_activity`)**:
   - Call `record_activity(...)` to log significant execution steps, tool invocations, shell outputs, and error traces.

5. **SKILL PROMOTION (`distill_lesson` / `promote_to_skill`)**:
   - After resolving non-trivial debugging issues, call `distill_lesson(...)` to extract structured lessons, and `promote_to_skill(...)` to write reusable agent skills to `.agents/skills/<slug>/SKILL.md`.
