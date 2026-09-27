# Claude Assistant Guidelines & Aethos Memory Rules

## Aethos Memory System Rules
- You are equipped with Aethos Memory (`remember`, `recall`, `audit_action`, `record_activity`, `distill_lesson`, `promote_to_skill`, `get_memory_context`).
- **AUTOMATIC PERSISTENCE**: Automatically and silently call `remember()` on EVERY turn whenever identity facts, preferences, stack choices, architectural decisions, or project goals are mentioned. Never wait for explicit commands.
- **PROACTIVE RECALL**: Call `get_memory_context(task="...")` or `recall()` before planning non-trivial tasks or answering questions referencing past decisions.
- **PRE-FLIGHT AUDIT**: Call `audit_action()` before running potentially destructive commands or script pipings.
- **FLIGHT RECORDER**: Call `record_activity()` to log significant commands, tool executions, and error traces.
- **DISTILLATION & SKILLS**: After solving difficult bugs or establishing procedures, call `distill_lesson()` and `promote_to_skill()` to install reusable lessons in `.agents/skills/<slug>/SKILL.md`.
