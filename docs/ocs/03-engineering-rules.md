# 03 — Engineering rules and guardrails

Audience: you (Claude) and the PM-developers you coach. Rules marked **[enforced]** are checked by a hook, lint rule or CI; the rest you check in review.

## 1. The six layers of protection

| Layer | Mechanism | Bypassable? |
|---|---|---|
| 1 Instructions | CLAUDE.md, docs/ocs, project skills | Yes — advice only |
| 2 Claude Code hooks | `.claude/hooks/`: protected paths, dangerous shell commands, lint after edit, verify before stop | Only by editing `.claude/**`, which is itself protected |
| 3 Repo tooling | TypeScript strict, ESLint boundaries, Prettier, pre-commit | No — repeated in CI |
| 4 CI + branch protection | Required checks, CODEOWNERS on protected zones, PR size limit | No |
| 5 Architecture | One write path, deny-by-default permissions, RLS, archive-only | Mistakes have nowhere to go |
| 6 Generators | `pnpm gen:*` creates structure with tests | — |

## 2. Branches, commits, PRs

- Branches: `feat/<module>-<short>`, `fix/<module>-<short>`, `arch/<short>` (protected zones), `docs/<short>`. **[enforced]** no direct push to `main`, no force push.
- Commits: Conventional Commits (`feat(cases): add ETA history`). One logical change per commit.
- PR: ≤ 400 changed lines excluding generated files and lockfiles **[enforced in CI]**; template filled (what, why, SOP clause / epic, screenshots for UI, verification evidence); preview link; at least one human approval; protected zones need the architect role **[enforced, CODEOWNERS]**.
- AI-authored PRs carry label `ai-assisted`. AI never merges.

## 3. TypeScript

- `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` **[enforced]**.
- No `any`, no `@ts-ignore`, no non-null `!` without a comment explaining why **[enforced: lint]**.
- Types come from `packages/contracts` zod schemas (`z.infer`). Do not redeclare shapes.
- Validate at every boundary: HTTP input, job payload, webhook, file import, MCP tool input.

## 4. Structure

- New module → `pnpm gen:module <name> "<purpose>"` (registers it in the protected `permissions/all.ts`, so `arch/` branch). New command → `pnpm gen:command <module> <verb-noun> [--roles pm,director]`. New query → `pnpm gen:query <module> <noun> [--roles …]`. New SOP rule → `pnpm gen:rule <module> <rule-key> --cite "SOP-DEL-01 §8" --sop-version 1.3`. New screen → `pnpm gen:screen <route>`. New migration → `pnpm gen:migration <name> [--table <table>]` (protected, `arch/` branch). A new permission is reserved (no roles) until `--roles` or an edit gives it some; the generator refreshes the permission matrix. Generators never overwrite; `pnpm gen:selftest` (CI job `generators`) proves their output passes `pnpm verify` unchanged **[enforced: CI]**.
- Business logic only in `packages/core`. API handlers and UI components contain no rules.
- Import other modules only through their `index.ts` **[enforced: boundaries]**.
- Database only through the module's `repository.ts` **[enforced: lint bans db imports elsewhere]**.
- UI only from `packages/ui`; no raw hex colours, font names or inline style objects outside `packages/ui` **[enforced: lint]**.
- No new dependency without the architect role (package.json is protected) **[enforced]**.

## 5. Errors and logging

- Throw typed `DomainError` subclasses (`NotFound`, `Forbidden`, `RuleViolation{clause}`, `Conflict`, `ValidationFailed`); the API maps them to HTTP codes. Never swallow errors.
- `RuleViolation` carries the SOP clause so the UI can show "Blocked by SOP-DEL-01 §8: item A4 missing".
- Logs: structured JSON, request id, actor id. No personal data (names, emails, phones) and no secrets in logs **[CI: log scanner on tests]**.

## 6. Data rules

- Archive, never delete business records **[enforced: lint bans `.delete(` in repositories except audit-free technical tables listed in db/allowlist]**.
- Every table with client data has `client_id`, RLS policy and a policy test (migration template includes both).
- Dates: UTC timestamps; IANA time zone on site; plan dates date-only.
- Money: integer minor units + currency.
- IDs: UUID v7 internally; business keys (Project ID, CS-number) as unique columns.

## 7. Security baseline

- Secrets only from environment / secret manager; `.env*` git-ignored; secret scanning in CI **[enforced]**.
- Dependency audit and Semgrep in CI **[enforced]**.
- Output encoding by the framework; no `dangerouslySetInnerHTML` **[enforced: lint]**.
- File uploads: type and size allow-list, virus scan hook (V1.1), stored outside web root.
- Before any external user (client, partner) gets access: an independent security review of identity, permissions and RLS (human, not only AI).

## 8. Internationalisation and accessibility

- Every user-visible string is an i18n key with EN and 中文 values **[enforced: lint no-literal-string in JSX]**.
- Keyboard reachable, labelled controls, contrast per design tokens; `web-design-guidelines` skill review on new screens.

## 9. Design system

- Tokens from the Vionvision design system (primary #0066ff, ink #0c1b2b, surfaces #f0f1f6 / #ffffff, rule #d9d9d9; Arial / Microsoft YaHei / PingFang SC). The mockups in `docs/ocs/reference/mockups` are the visual reference for layout and density.
- Chips/status colours are semantic tokens (ok, progress, risk, wait, breach), never ad-hoc.

## 10. What PM-developers may and may not do

| May (feat/fix branches) | May not (arch/ only, architect review) |
|---|---|
| Screens, components from packages/ui | Change identity, permissions, RLS, migrations |
| Commands and queries inside an existing module | Change contracts shared across modules |
| SOP rules as config with tests | Add dependencies, change CI, hooks, infra |
| Imports for their projects (dry-run first) | Touch production data or secrets |
| Tests, docs, i18n strings | Edit decisions log or CLAUDE.md |
