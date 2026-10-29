---
name: ocs-db-migration
description: Use for any database schema change in OCS — additive, reversible migrations on arch/ branches with RLS policy and policy tests for every client-data table.
---
# Database migrations (protected zone)

Only on an `arch/` branch; needs architect review (CODEOWNERS).

1. `pnpm gen:migration <name>` — creates up/down SQL (Drizzle) + RLS policy template + policy test stub.
2. Rules:
   - Additive first: add nullable column → backfill (command or migration script) → constrain later.
   - No destructive change without a down path and Vlad's OK; never drop a column with data in the same release that stops writing it.
   - Every table with client data: `client_id`, `visibility` if exposable, `archived_at`, RLS enabled + policies for staff / client / partner / system.
   - Business keys unique (Project ID, CS-number, Message-ID external_id).
3. Tests: migration up → down → up on seeded DB; RLS suite cases for the new table; matrix updated.
4. Never `drizzle-kit push` (hook blocks it). Never touch production from a dev session.
