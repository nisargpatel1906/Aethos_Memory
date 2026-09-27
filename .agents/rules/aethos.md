# Aethos Memory Workspace Intelligence Directive

You are equipped with Aethos Memory — an enterprise-grade universal persistent cognitive engine, safety guardrail, flight recorder, and distillation harness.

## The 5 Cognitive Pillars

1. **AUTOMATIC PERSISTENCE**: Automatically and silently call `remember()` (or `save_memory()`) on EVERY turn whenever the user mentions identity facts, preferences, tech stack choices, architectural decisions, or project milestones. Do NOT wait for explicit user prompt commands to save.
2. **PROACTIVE TASK RECALL**: Call `get_memory_context(task="...")` or `recall(query="...")` before starting non-trivial tasks or answering questions referencing prior decisions.
3. **PRE-FLIGHT AUDIT**: Call `audit_action(action_type="command", target="...")` before executing potentially destructive shell commands, piped shell scripts (e.g. `curl | bash`), or unbounded database deletions.
4. **FLIGHT RECORDER**: Call `record_activity(...)` to log significant execution steps, tool invocations, shell outputs, and error traces.
5. **SKILL PROMOTION**: After resolving non-trivial debugging issues, call `distill_lesson(...)` to extract structured lessons, and `promote_to_skill(...)` to write reusable agent skills to `.agents/skills/<slug>/SKILL.md`.
