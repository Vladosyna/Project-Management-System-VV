# 05 — Roadmap, epics and acceptance criteria

Dates from D-17. Each epic lists acceptance criteria (AC). An epic is done when every AC has a passing test and Vlad has seen it on staging.

## Phase 0 — Foundation (now → 10 Nov), all on `arch/` branches

| # | Task | Done when |
|---|---|---|
| F0.1 | Kickoff: confirm P-01…P-10 (ADR-001), answer Q1–Q3 | ADR-001 committed; decisions log updated |
| F0.2 | Monorepo skeleton per 02-architecture.md; pnpm, Turborepo, TS strict | `pnpm verify` green on empty modules |
| F0.3 | Lint: boundaries, no-any, no raw colours, no literal strings, no delete, no db import outside repositories | Deliberate violation in a test fixture fails lint |
| F0.4 | Hooks installed and tested (`.claude/hooks`) | Each hook has a scripted test; blocked edit demonstrated |
| F0.5 | CI: verify, matrix, e2e smoke, Semgrep, secret scan, dependency audit, diff coverage, PR size, migration check | Required checks on `main`; CODEOWNERS active |
| F0.6 | `packages/db`: Postgres, Drizzle, RLS helpers, audit table, outbox table | RLS suite skeleton passes |
| F0.7 | `defineCommand()` / `defineQuery()` with permission, schema, audit, outbox | A sample command cannot compile without permission key and schema |
| F0.8 | identity: invitation, password/passkey, TOTP MFA, sessions; staff roles | Login with MFA on preview |
| F0.9 | `packages/ui` from Vionvision tokens; app shell (sidebar nav as in mockups), EN/中文 switch | Shell matches Main mockup layout |
| F0.10 | Generators: module, command, screen, rule, migration | Each generator output passes verify unchanged |
| F0.11 | Testing package: factories, anonymised seed, fake clock, CN/EU working calendars | Seed loads; e2e smoke logs in and sees seed |
| F0.12 | Preview deployments + staging in EU | Every PR has a preview URL |

## V1 — Sprint 1 (10–21 Nov) and Sprint 2 (24 Nov – 5 Dec)

### E1 Org and projects (SOP-DEL-02)
- AC1 Client → (programme) → country → (city, L only) → project/site hierarchy, matching SOP-DEL-02 §3.
- AC2 Project ID `CLIENT-CC-CITY-NNN` generated, unique, immutable; running number per client+city.
- AC3 Standard L/S stored per site; staff change it both ways (S→L, L→S, D-25), Project ID and documents kept.
- AC4 Partners stored with real name (staff only) and label Partner A/B/C (client-facing).

### E2 Intake (SOP-DEL-01 + Annex B)
- AC1 Handover Card form with sections 1–11 of Annex B; Full vs Light package logic (§3); N/A requires a reason; blanks not accepted.
- AC2 Intake review decision: Accepted / Accepted with conditions / Returned; blocking items A1, A4, A6, C2, D1, F1 can never be conditions.
- AC3 Conditions get deadlines ≤ 5 working days; expiry fires an alert to Sales owner and Delivery Director.
- AC4 Conditional Start only by a user with permission `intake.conditionalStart` (Hai Tao), with missing items and deadline recorded.
- AC5 Disputes: escalation record with 2-working-day timer.
- AC6 Intake Register: Project ID, submitted, decision, days to acceptance, number of returns; monthly report export.
- AC7 Restricted items (group F) stored in restricted notes, never in the open card.

### E3 Site lifecycle (SOP-DEL-04) and gate templates
- AC1 Base steps: card received → card complete → readiness confirmed → go/no-go → installed → accepted; each with date, actor, evidence link.
- AC2 Installation date cannot be set before "card complete" (rule cites SOP-DEL-04 §1).
- AC3 Gate templates attachable to a client/programme (seed: PMI G1–G5 incl. D−2 check); evaluated per site.
- AC4 Acceptance evidence: S = Installation Acceptance Form, L = Acceptance Certificate (file reference).

### E4 Devices registry
- AC1 Device: SN, MAC, model, firmware, site, switch/port/IP, status; SN and MAC unique among active records (R6 blocks at save).
- AC2 Import from Excel/CSV with dry-run diff; idempotent re-run.
- AC3 Source records kept per device (packing list, as-built, platform, AIoT) to support reconciliation in Jan.

### E5 Actions, feed, comments, visits (SOP-DEL-03)
- AC1 Action: owner, due, status, source (mail / DingTalk / meeting / visit / alert / comment), linked object.
- AC2 Comment with @mention; "turn into action".
- AC3 Visit record: type (5 types of SOP-DEL-03 §2), coverage X of Y, agreed vs discussed, attendees marked VV/client/third party, link to DingTalk Action Record minutes.
- AC4 Feed per project/site with source on every item.

### E6 Cases and work items (SOP-DEL-05 draft — see domain/case-rules.md)
- AC1 Case: number `CS-nnnn`, client, site/devices, type, priority, accountable owner, status, internal ETA, committed client date, client-facing title, visibility.
- AC2 Work item: one team, one owner, ETA with mandatory reason on change, history kept; case ETA = latest blocking work item ETA.
- AC3 Timeline merges messages, comments, ETA changes, status changes, system events; filters all / mail / internal / client-visible.
- AC4 Client projection shows only client-visible items, team names instead of R&D names, committed date instead of internal ETA.
- AC5 Close requires root cause, category and fix type.
- AC6 Triage: new case needs required fields (client, site, device SN, firmware/algorithm version, time window, evidence) before it can be assigned to R&D.

### E7 Mail intake (Aliyun case mailbox)
- AC1 Poll case mailbox (IMAP); idempotent by Message-ID.
- AC2 Auto-attach when subject has `[CS-nnnn]` or the thread is known; otherwise create an inbox item with suggested match.
- AC3 Staff confirms: attach / new case / action / not a case.
- AC4 Draft client update placed in the user's own Drafts folder (or .eml download) with tag and CC; OCS never sends.

### E8 Alerts (subset)
- AC1 Engine runs hourly; each hit has owner, level, due, handling log.
- AC2 V1 rules: R5, R6 (save-block), R7, R8, R9, R12, R13, R14, R17, R18, R19, R20, R23 (domain/rules.md).

### E9 DingTalk notifications (one-way)
- AC1 Work notice to the assignee for new work item, ETA due, alert; deep link to OCS.
- AC2 Respect communication norms: no client-facing sends; staff notices only.

### E10 Imports
- AC1 PMI trackers, quote register, NEINVER/Heinemann device lists, KB open items → actions/cases with source; dry-run diff report; PM confirmation step.
- AC2 Credentials in sources are detected and dropped (D-20).

### E11 Reports
- AC1 Monday pack export (per project) from OCS data.
- AC2 Intake Register monthly report.

## Pilot (7–22 Dec)
Go/no-go 7 Dec: pilot data confirmed by PMs; three pilot users working daily; restore from backup tested; no P0 defects. Review 22 Dec: ≥ 80% of updates on pilot projects made in OCS; Monday pack from OCS matches Excel; top-10 feedback fixed or planned.

## January 2027 (behind feature flags)
Interactive DingTalk cards (accept / ask / reassign / ETA) · central AI agent, proposals only · device-platform read sync + registry reconciliation report · DingTalk Drive index (links, no extraction) · capability matrix (manual content) · MCP read-only for 3 users · onboarding all active projects · go-live 20 Jan.

## V1.1 (mid-Feb → Mar 2027)
Client portal (own accounts + MFA, after independent security review) · CIP-S/CIP-L forms by link · partner phone app · calibration queue and accuracy test register · quote generator from design · file field extraction (floor plan, packing list, CIP card, test pack) · MCP write for R&D · change calendar with client-notice gate (R22).

## V2 (Q2 2027)
Hypercare monitors (data gaps, spikes, DST shifts, dashboard vs API) · monthly client service report · decommissioning with data-deletion record · margin per project · Kingdee read link · DingTalk OA approval events · more client portals.
