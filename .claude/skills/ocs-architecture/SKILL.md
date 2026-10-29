---
name: ocs-architecture
description: Use before writing or moving any OCS code — tells where code belongs (apps vs packages/core modules), the one write path, boundaries, tenancy/RLS and protected zones.
---
# OCS architecture — where code goes

Source of truth: `docs/ocs/02-architecture.md`. This skill is the quick decision guide.

## Decide the home of a change
| The change is… | Put it in |
|---|---|
| A business rule, a write, a read with permissions | `packages/core/<module>/` (commands/, queries/, rules/) |
| A shape shared by UI/API/MCP | `packages/contracts/` — protected, `arch/` branch |
| A table, column, index, RLS policy | `packages/db/` — protected, use `ocs-db-migration` |
| A screen or component | `apps/web/src/routes/...` using `packages/ui` (see `ocs-ui-screen`) |
| HTTP endpoint | `apps/api/` — thin: session → core → error mapping. No logic |
| Mail / DingTalk / platform / import job | `apps/worker/adapters/<system>/` (see `ocs-integration`) |
| A reusable visual element | `packages/ui/` |
| A UI string | `packages/i18n/` EN + 中文 |

## Never
- Write to the database outside a `defineCommand` in `packages/core`.
- Import another module's internals — only its `index.ts`.
- Query tables outside the module's `repository.ts`.
- Put a rule number (5 working days, 20 sensors, D−2) in logic — rules are config citing the SOP clause (`ocs-sop-rule`).
- Delete business rows — archive.
- Return partner real names, internal comments or internal ETA in a client projection.

## Before you finish
Run `pnpm lint` — boundary violations fail there. If a protected-zone change seems necessary, stop and explain why to the person; it goes to an `arch/` branch with architect review.
