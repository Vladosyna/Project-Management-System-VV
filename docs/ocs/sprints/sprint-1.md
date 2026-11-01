# Sprint 1 plan — 10–21 Nov 2026 (E1, E4, E2, E5 core)

For the scope and UI sign-off on 10 Nov (D-17). Every slice is one PR of ≤ 400 changed lines with an acceptance criterion (AC) from `05-roadmap.md`, the SOP clause it serves and an owner. Owners per D-23: Xavier, Leon, Vlad; Claude builds protected-zone slices, coaches and reviews every PR (`ocs-review`), Vlad approves.

Order follows dependencies: E1 is the base every other epic links to (client, site, Project ID).

## E1 Org and projects — SOP-DEL-02 — owner: Claude + Vlad (`arch/`, schema and RLS)

| Slice | What | AC | Clause |
|---|---|---|---|
| E1.1 | `org` module; **client** table + RLS (a client user sees only its own client); `org.client.create` (short code ≤ 8 letters, unique), `org.client.list` | AC1 (top level) | SOP-DEL-02 §3 |
| E1.2 | **site** (project/site) table + RLS; `org.site.create` generates the Project ID `CLIENT-CC-CITY-NNN` — running number per client + city, unique, immutable; country = ISO 3166 alpha-2, city = 3-letter code (IATA where one exists) | AC1, AC2 | SOP-DEL-02 §3, D-18 |
| E1.3 | Standard L/S per site; `org.site.upgradeToL` keeps Project ID and documents; L → S refused | AC3 | SOP-DEL-02 §2.1 |
| E1.4 | Optional **programme** under a client; **partner** with real name (staff only) and per-client label Partner A/B/C; client projection never carries the real name (test) | AC1, AC4 | SOP-DEL-02 §3; CLAUDE.md §3 rule 5 |
| E1.5 | `pnpm seed` loads the anonymised seed world through the org commands; Portfolio screen (mockup *Portfolio*); e2e signs in and sees Client A/B/C — closes the Phase 0 "e2e sees seed" item | AC1 + F0.11 | — |

Assumption to confirm at sign-off: country and city are codes on the site row (no separate country/city tables in V1); the hierarchy client → programme → country → city → site is derived from them. City level appears for Standard L only, as in the SOP folder tree.

## E4 Devices registry — owner: Xavier (`feat/`)

| Slice | What | AC | Clause / rule |
|---|---|---|---|
| E4.1 | `gen:module devices` (Claude, `arch/`: module + table with RLS through the site's client); `devices.device.register` with SN, MAC, model, firmware, site, switch/port/IP, status | AC1 | data-model.md *Device* |
| E4.2 | Duplicate SN or MAC among active devices blocks at save | AC1 | R6 (`gen:rule devices duplicate-sn-mac`) |
| E4.3 | Device list per site (screen from mockup *Site*), EN + 中文 | AC1 | — |
| E4.4 | Excel/CSV import with dry-run diff; re-running the same file changes nothing | AC2 | — |
| E4.5 | Source records per device (packing list, as-built, platform, AIoT) | AC3 | — |

## E2 Intake — SOP-DEL-01 + Annex B — owner: Leon (`feat/`)

| Slice | What | AC | Clause |
|---|---|---|---|
| E2.1 | `intake` module (Claude, `arch/`); Handover Card sections 1–11 of Annex B as zod schema; Full vs Light package | AC1 | SOP-DEL-01 §3, §6, Annex B |
| E2.2 | N/A needs a reason; blanks are not accepted | AC1 | SOP-DEL-01 §6, §11 |
| E2.3 | Intake review: Accepted / Accepted with conditions / Returned; blocking items A1, A4, A6, C2, D1, F1 can never be conditions | AC2 | SOP-DEL-01 §8 |
| E2.4 | Conditions with deadlines ≤ 5 working days (CN/EU calendars already in core) | AC3 | SOP-DEL-01 §8 |
| E2.5 | Conditional Start only with `intake.conditionalStart` (Hai Tao); missing items and deadline recorded | AC4 | SOP-DEL-01 §9 |
| E2.6 | Restricted items (group F) stored in restricted notes, separate RLS | AC7 | SOP-DEL-01 §6; SOP-DEL-02 restricted notes |

Moved to Sprint 2 if time runs out: AC5 disputes (2-working-day timer), AC6 Intake Register and monthly export.

## E5 Actions, feed, comments, visits — SOP-DEL-03 — owner: Vlad / whoever is free first

| Slice | What | AC | Clause |
|---|---|---|---|
| E5.1 | `work` module (Claude, `arch/`); action with owner, due, status, source, linked object | AC1 | — |
| E5.2 | Comment with @mention; "turn into action" | AC2 | — |
| E5.3 | Visit record: 5 visit types, coverage X of Y, agreed vs discussed, attendees VV / client / third party, minutes link | AC3 | SOP-DEL-03 §2, §5 |
| E5.4 | Feed per project/site with the source on every item | AC4 | — |

## Definition of done for every slice
`pnpm verify`, `pnpm test:matrix` and, for screens, `pnpm e2e` green, evidence pasted in the PR; permission matrix regenerated; RLS cases for new client data (own client / other client / internal / partner); EN + 中文 for every string; `ocs-review` run by Claude; Vlad approves.

## Risks
- Leon and Xavier start on generated code in Sprint 1; the first PR of each is pair-built with Claude, step by step (`ocs-pm-coach`).
- E2 has the most SOP rules; Leon confirms each clause reading before code (`ocs-sop-rule` §5: ambiguous → question to Vlad, stricter reading behind a flag).
- Q3 (Leon as product owner) affects who signs off E2.
- Staging (F0.12) is blocked on Q4: until then the demo on 10 Nov runs locally or from the CI e2e screenshots.
