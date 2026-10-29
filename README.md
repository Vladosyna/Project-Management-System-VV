# OCS — Vionvision Operations & Collaboration System

Internal delivery platform for all Vionvision projects. This repository starts as a **bootstrap pack**: instructions, decisions, domain knowledge, guardrails and skills for building OCS with Claude Code. No application code yet — Phase 0 creates it.

- Start here: `CLAUDE.md` (for Claude) and `KICKOFF_PROMPT.md` (for people starting a session).
- Product and plan: `docs/ocs/00-brief.md`, `docs/ocs/05-roadmap.md`.
- Binding decisions: `docs/ocs/01-decisions.md`.
- Rules for writing code: `docs/ocs/03-engineering-rules.md`, `docs/ocs/04-testing.md`.
- SOPs (law): `docs/ocs/domain/sop/`.
- Guardrails: `.claude/settings.json` + `.claude/hooks/` (self-test: `node .claude/hooks/selftest.mjs`).
- Project skills: `.claude/skills/ocs-*`.

Confidential — internal use. Mockups and SOP texts contain real business names; never copy them into code, seeds or tests.
