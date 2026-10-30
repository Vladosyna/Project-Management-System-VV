---
name: ocs-new-module
description: Use when adding a new OCS core module or a new command/query to an existing module — generator-first steps, permission entries, audit, tests and i18n.
---
# Adding a module, command or query

1. Confirm the epic/AC (`docs/ocs/05-roadmap.md`) and the SOP clause it serves. No AC → ask.
2. Generate, never hand-build:
   - module: `pnpm gen:module <name> "<one-line purpose>"` (touches protected `permissions/all.ts` → `arch/` branch)
   - command: `pnpm gen:command <module> <verb-noun> [--roles pm,director]` (e.g. `set-eta` → key `<module>.eta.set`)
   - query: `pnpm gen:query <module> <noun> [--roles …]` (key `<module>.<noun>.read`)
   - each adds the permission (no roles unless `--roles`), the export, the file and a guard test (`*.int.test.ts`), and refreshes the permission matrix.
3. Fill the generated parts:
   - input schema in `packages/contracts` (if new shared shape → `arch/` branch) or module-local schema;
   - permission key `<module>.<object>.<action>` in `permissions.ts`, with roles that get it;
   - audit description (human-readable, EN);
   - domain event if other modules or integrations must react.
4. Write tests first (generated stubs): behaviour test named after the AC, permission-matrix entries (own client / other client / internal), RLS case if new data is exposed.
5. Implement the smallest logic that passes. Rules via `ocs-sop-rule`.
6. Wire the API route / UI only after the core tests are green.
7. `pnpm verify` and paste evidence. Then `ocs-review` on your diff.
