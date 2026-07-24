# Aethos Memory — PRD

## Quick reference
A portable memory layer for AI tools. It lets facts, decisions, and preferences a person shares with one AI tool (Claude Code, Cursor, Antigravity, etc.) become available to every other AI tool they use, instead of being trapped in that one tool's own siloed memory. Built first for personal use by a solo developer; designed from day one to also work as a product for other people. Current stage: architecture and data model fully specified, implementation not yet started (build happening in Antigravity).

## Problem & audience
- **Problem**: a person who uses several AI tools (Claude, Claude Code, ChatGPT, Codex, Gemini/Antigravity, Cursor, etc.) gets no shared context between them. Each tool's own memory feature, where it has one, only remembers within itself — nothing carries over when the person switches tools mid-project.
- **Primary user**: initially the builder themself, a solo developer working across many AI coding tools daily. Secondary/future: other developers with the same multi-tool workflow, once this becomes a distributable product.
- **Why this approach**: MCP (Model Context Protocol) has become the common standard nearly every serious AI tool now speaks, which is what makes a single external memory server, rather than a plugin per tool, actually workable.

## Core features

**Cross-tool memory (core)** — A local MCP server exposes four tools — `remember`, `recall`, `forget`, `list_memories` — that any MCP-capable AI tool can call mid-conversation. Facts stored via one tool (e.g. Claude Code) are retrievable from any other (e.g. Cursor, Antigravity) because both read/write the same backing store. See `api-spec.md` for exact tool definitions and `data-model.md` for storage.

**Automatic fact extraction** — Raw content passed to `remember` is distilled into atomic, self-contained facts (not stored as raw chat transcript), and checked against existing similar memories so the same fact doesn't get stored multiple times with slightly different wording. See `prompts.md` for the extraction logic.

**Project scoping** — Memories are tagged to a project (e.g. one developer's two different apps don't bleed into each other's context) via a per-project MCP config entry, not by relying on the AI to state which project it's in each time.

**Dashboard** — A separate, occasionally-opened web app for a human to see what's being remembered, and to edit, delete, or manually add memories. Not required for the core product to function — remembering and recalling happen invisibly during normal AI conversations regardless of whether the dashboard is ever opened. Pages: Login, first-time setup/onboarding, Memory Feed (live-updating list with filters and search), memory detail/edit, add memory, Projects, Settings & Connections. See `data-model.md` and `tech-stack.md` for how the dashboard talks to storage.

**Bring-your-own-everything** — Each user (starting with the builder) supplies their own Supabase project and their own API keys (Groq, OpenRouter, Gemini). No centrally hosted, shared backend. Keeps cost at $0 regardless of how many people eventually use it, and means no user's data or API usage is ever held by anyone but themselves.

## User flows

**Remembering, mid-conversation** — Person tells an AI tool something (a decision, a preference, a correction). The AI, guided by its custom instructions and the `remember` tool's own description, calls `remember` with that content and the current project. The server extracts an atomic fact, checks it against similar existing memories, and adds/updates/skips/deletes accordingly. **[TODO: inferred from features, not explicitly walked through turn-by-turn in the conversation — confirm this matches intent]**

**Recalling, mid-conversation** — Person asks an AI tool something that depends on earlier context, possibly from a different tool or session. The AI calls `recall` with a query (and the current project). The server embeds the query, searches stored memories, and returns matches, which the AI folds into its answer without the person seeing the mechanism.

**Checking memory in the dashboard** — Person opens the dashboard occasionally, signs in via magic link, and sees a live feed of what's been remembered, tagged by which tool wrote it and which project it belongs to. They can search, filter by project or source tool, edit an entry (which re-embeds it), delete one that's wrong, or add one manually.

**Setting up a new machine or tool** — Person signs into the dashboard, enters their Supabase project details and their own API keys once, and the dashboard generates a ready-to-paste MCP config snippet (with the right environment variables already filled in, including their own user id) for whichever client they're adding.

## Non-goals / out of scope
- Not a chat interface — there is no page in the dashboard where the person talks to an AI. All AI conversations happen in the person's existing tools.
- Not passive or automatic capture — `remember` and `recall` only fire when the calling AI actively decides to call them; nothing is watched or logged in the background.
- ChatGPT's and Gemini's own consumer chat web apps (chatgpt.com, gemini.google.com) are explicitly out of scope for v1 — they run server-side and would need a publicly reachable endpoint rather than the local stdio process this version relies on. Revisit later; the same server code can serve that mode without a rewrite.
- No centrally hosted, multi-tenant backend for now — everyone (including the builder) runs their own Supabase project and supplies their own API keys. **[TODO: whether/when to build a centralized hosted version with pooled keys is an open, deliberately parked question]**

## Success criteria
**[TODO: not discussed — no explicit success metrics were defined for this product yet]**

## Open questions
- Whether Gemini's own consumer chat web app supports custom MCP connectors the way ChatGPT's Developer Mode does — unconfirmed, worth checking directly before deciding if/when to extend coverage there.
- Whether to eventually build a centralized, hosted, multi-tenant version (pooled API keys via a server-side function) instead of staying bring-your-own-everything indefinitely — explicitly parked, not a near-term decision.
- Whether "New Project Tag" and "Create Cluster" (two differently-labeled buttons in the reviewed dashboard mockups) are meant to be the same action or two different ones — flagged during mockup review, never resolved.
