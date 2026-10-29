# @ocs/eslint-plugin — OCS guardrail lint rules (F0.3)

Where each rule applies is configured in the root `eslint.config.js` (`ocsRules`, protected). Every rule is proven by a deliberate violation in `fixtures/bad/` and must not fire on `fixtures/good/` — `pnpm --filter @ocs/eslint-plugin test`.

| Rule | Forbids | Source | Fixture(s) |
|---|---|---|---|
| `boundaries/dependencies` (eslint-plugin-boundaries) | Forbidden layer imports, e.g. web → db/core, ui → contracts | 02-architecture §2 | `web-imports-db`, `web-imports-core`, `ui-imports-contracts` |
| `ocs/public-api-only` | Importing another module's or package's internals instead of its `index.ts` | 02-architecture §2–3 | `core-module-imports-other-module-internals`, `api-imports-kernel-internals` |
| `@typescript-eslint/no-explicit-any` | `any` | 03 §3 | `explicit-any` |
| `@typescript-eslint/ban-ts-comment` | `@ts-ignore` (`@ts-expect-error` only with a description) | 03 §3 | `ts-ignore` |
| `@typescript-eslint/no-non-null-assertion` | `x!` | 03 §3 | `non-null-assertion` |
| `ocs/no-raw-colour` | Hex / rgb / hsl / oklch colours and font names outside `packages/ui` | 03 §4, §9 | `raw-hex-colour`, `raw-font` |
| `ocs/no-inline-style` | `style={...}` outside `packages/ui` | 03 §4 | `inline-style` |
| `ocs/no-literal-string` | Hard-coded user-visible text in JSX (text, `title`, `alt`, `placeholder`, `label`, `aria-*`) | 03 §8 | `literal-jsx-text`, `literal-aria-label` |
| `ocs/no-business-delete` | `db.delete(...)`, any `.delete(` in `repository.ts`, `DELETE FROM` / `TRUNCATE` SQL | 03 §6, SOP-DEL-02 | `repository-delete-call`, `sql-delete` |
| `ocs/no-db-import` | `@ocs/db`, `drizzle-orm`, `pg`, `pg-boss` outside `repository.ts`, `packages/db`, `core/kernel`, `packages/testing` | 03 §4 | `db-import-outside-repository` |
| `ocs/no-dangerous-html` | `dangerouslySetInnerHTML`, `innerHTML =` | 03 §7 | `dangerous-html` |

Known gaps (tracked for F0.5 CI): circular module dependencies (02 §2) and raw colours in `.css` files outside `packages/ui`.
