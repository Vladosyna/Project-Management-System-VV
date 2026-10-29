---
name: ocs-new-module
description: Use when adding a new OCS core module or a new command/query to an existing module — generator-first steps, permission entries, audit, tests and i18n.
---
# Adding a module, command or query

1. Confirm the epic/AC (`docs/ocs/05-roadmap.md`) and the SOP clause it serves. No AC → ask.
2. Generate, never hand-build:
   - module: `pnpm gen:module <name>`
   - command: `pnpm gen:command <module> <verb-noun>` (e.g. `set-eta`)
   - query: `pnpm gen:query <module> <noun>`
3. Fill the generated parts:
   - input schema in `packages/contracts` (if new shared shape → `arch/` branch) or module-local schema;
   - permission key `<module>.<object>.<action>` in `permissions.ts`, with roles that get it;
   - audit description (human-readable, EN);
   - domain event if other modules or integrations must react.
4. Write tests first (generated stubs): behaviour test named after the AC, permission-matrix entries (own client / other client / internal), RLS case if new data is exposed.
5. Implement the smallest logic that passes. Rules via `ocs-sop-rule`.
6. Wire the API route / UI only after the core tests are green.
7. `pnpm verify` and paste evidence. Then `ocs-review` on your diff.
