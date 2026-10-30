# 11 — Session kickoff and Phase 0 plan

## First session — do this in order

1. **Read**: CLAUDE.md, then 00 → 10 in `docs/ocs/`, then `domain/sop-index.md`, `domain/glossary.md`, `domain/case-rules.md`, `domain/rules.md`. Open 2–3 mockups in `reference/mockups/` (Main, Cases, Case) to absorb the visual language. Do not read every SOP in full now; read the relevant one when a task touches it.
2. **Check the environment**: Node ≥ 20, pnpm, git branch. Run `node .claude/hooks/selftest.mjs` — all hook cases must pass. Report the result.
3. **Confirm with Vlad (in Russian, one message)**:
   - ADR-001: table of P-01…P-10 from `01-decisions.md` with a one-line reason each; ask for "OK" or changes line by line.
   - Max two open questions: Q1 (which PMs, hours/week) and Q2 (human architect-reviewer) — answered 30 Oct 2026 as D-23 and D-24. Everything else: note owner, continue.
4. **Install vetted skills/plugins** per `10-skills.md`; record versions.
5. **Branch** `arch/phase-0-skeleton` and execute Phase 0 (05-roadmap.md F0.2 → F0.12) in this order:
   1. F0.2 skeleton → `pnpm verify` green on empty modules
   2. F0.3 lint rules, each proven by a failing fixture
   3. F0.6 db + RLS helpers + audit + outbox; F0.7 `defineCommand` / `defineQuery`
   4. F0.11 testing package (factories, seed, fake clock, calendars)
   5. F0.5 CI with required checks + CODEOWNERS (architect role placeholder until Q2 is answered — Vlad as interim)
   6. F0.8 identity with MFA
   7. F0.9 ui tokens + app shell + EN/中文
   8. F0.10 generators (each output passes verify unchanged)
   9. F0.12 preview + staging (needs hosting decision Q4; until then local docker compose)
6. **Report** at the end of each working block: what is green, evidence, next step, blockers.

## Definition of done for Phase 0 (before 10 Nov sign-off)
- `pnpm verify`, `pnpm test:matrix`, `pnpm e2e` (smoke: login with MFA, app shell, seed visible) green in CI.
- A deliberately bad PR (raw colour, cross-module import, missing permission key, delete call, literal string) fails with clear messages — demonstrate to Vlad.
- Generators produce a module/command/screen/rule that pass verify unchanged.
- ADR-001 and the hooks self-test committed.
- A one-page "How to contribute" for PM-developers (EN + 中文) in `docs/ocs/contributing.md`.

## Parallel track for Vlad (external dependencies — remind weekly)
Q4 hosting + AI provider · Q5 DingTalk app · Q6 case mailbox · Q7 platform OpenAPI key · Q8 Kingdee · Q9 SOP approval · Q10 old ticket export · SOP-DEL-05 draft (Claude drafts, Vlad agrees with R&D leads + Hai Tao before 7 Dec) · Handover Card backfill for active projects (SOP-DEL-01 §11) during 10–21 Nov = pilot data.

## After Phase 0
Sprint 1 (10–21 Nov): E1, E2, E4, E5 core. Sprint 2 (24 Nov – 5 Dec): E3, E6, E7, E8, E9, E10, E11. UAT 3–5 Dec with Vlad, Xavier, Steve. Pilot 7 Dec.
