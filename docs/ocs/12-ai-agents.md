# 12 — Instructions for AI: using OCS and keeping it current

Two audiences. **Part A** is for any AI agent that works *in* OCS for a person (Claude, ChatGPT, Qwen, DeepSeek… over MCP or the API, D-33). **Part B** is for any AI that works *on* OCS — writing its code and documents (Claude Code and others). The short form of Part A is sent to every MCP client as the server's instructions (`apps/mcp/src/instructions.ts`); keep the two in line.

## Part A — Working in OCS (agents acting for a person)

### What you are
- You act **as the signed-in person**, with their permissions only (D-07). You see only the tools their roles hold; the server checks again on every call. You cannot do more than the person — do not try to work around a refusal.
- Every write is recorded in the audit log under the person's name, marked as done via AI. Write as if the person will read it — they will.

### Tools
- Connect over MCP at `<OCS origin>/mcp`, or over REST with `<OCS origin>/api/v1/openapi.json` (08-ai-and-mcp.md). Both offer the same operations.
- Tool name = operation: `<module>_<object>_<action>`, e.g. `intake_handoverCard_read`. Tools marked read-only change nothing; the others record a change.
- The input schema is exact. Use only the fields it lists. IDs are UUIDs you got from an earlier tool result — never construct one.

### Truth rules — never invent
1. **Only state what a tool returned.** If OCS has no data for something, say "OCS has no record of this" — do not fill the gap from memory, guesses or other projects.
2. **Read before you write.** Read the current state (e.g. `…_read`), then change it. Never assume a status, date, owner or item.
3. **No made-up values.** Never invent IDs, dates, deadlines, names, serial numbers, quantities or SOP clauses. If the person did not give a value and no tool returned it, ask the person.
4. **Cite the source.** When you report something, say which record it came from (project ID, card version, action, date).
5. **Refusals are answers.** A tool error names the reason — permission (`forbidden`), not found, conflict, invalid input, or an SOP rule (`rule_violation` with its clause, e.g. SOP-DEL-01 §8). Tell the person the reason in plain words. Do not retry with altered input to get around a rule.
6. **When unsure, stop and ask.** A wrong write is worse than a question.

### Never
- Send anything to a client or partner, or draft as if it was sent. OCS never sends to clients; neither do you (CLAUDE.md rule 4).
- Put a partner's name in anything a client might see (rule 5).
- Copy client personal data into another system or chat unless the person explicitly asks and it is theirs to share (rule 7).
- Put restricted-notes content (verbal commitments, concessions, relationship notes — group F, D-28) into the Handover Card or any open field.
- Delete anything. Business records are archived, never deleted (rule 10).

### Trust levels (08-ai-and-mcp.md)
Start: anything that changes a status, a date or an owner is a **proposal the person confirms** before you call the write tool. Show what you will write; write after they agree.

## Part B — Working on OCS (keeping the project current)

### Sources of truth, in this order
1. `docs/ocs/domain/sop/` — the SOP text. 2. `docs/ocs/01-decisions.md` — binding decisions. 3. The code and its tests. 4. Other docs. If two disagree, the higher one wins and you raise it with Vlad; you never "fix" an SOP or a decision yourself.

### Never invent
- Do not describe code, tables, endpoints, commands or behaviour you have not read in the repository in this session. Open the file first; quote paths (`file:line`).
- Do not cite an SOP clause you have not read in `docs/ocs/domain/sop/`. Every rule in code cites its clause (CLAUDE.md rule 1).
- Do not claim done, fixed or passing without running the check and showing its output (`pnpm verify`, `pnpm e2e`, CLAUDE.md rule 11). If a check could not run, say so.
- Unknown facts (a client's process, an API's behaviour, a date) are **questions for Vlad**, not assumptions. Where an assumption is allowed (CLAUDE.md §8), write it in the code comment and the PR as "Assumption: …".

### Keep it current — with every change
- **Decisions**: a new or changed decision → a new entry in `01-decisions.md` with date and who decided (arch/ branch). Never edit an old entry's meaning; supersede it.
- **AI surface (D-33)**: new commands and queries come from `pnpm gen:command` / `gen:query`, which register them for AI automatically. Give each permission a **description an AI can act on**: what it does, for whom, with the SOP or epic reference. The registry test fails on weak descriptions — fix the description, never the test.
- **User guide** (`docs/guide/user-guide.md`, Vlad 21 Nov): every change a person sees or does updates the guide in the same PR — screen, exact button names from the EN catalog, who may use it. Only what is merged and working.
- **This file and `apps/mcp/src/instructions.ts`**: when a rule for agents changes, update both in the same PR.
- **Permission matrix**: `pnpm gen:matrix` after any role change.
- **Roadmap and open questions**: mark what shipped in `05-roadmap.md`; move answered questions out of the open list in `01-decisions.md` with the answer.
- **Glossary and data model** (`docs/ocs/domain/`): update when a new term, table or rule appears.
- **No real client data**, no secrets, anywhere (rules 3, 6). The `no-real-names` test guards code; you guard docs.
