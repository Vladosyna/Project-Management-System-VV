# ADR-001 — Technology stack

- Status: **Accepted** (P-01…P-09); P-10 **deferred** to Q4
- Date: 29 Oct 2026
- Decided by: Vlad (decisions log D-21)
- Context: `docs/ocs/00-brief.md`, `docs/ocs/02-architecture.md`, `docs/ocs/03-engineering-rules.md`

## Context

OCS is built mostly by Vionvision PMs who are not professional engineers, working with Claude. The stack therefore has to make the dangerous mistakes (cross-client data leaks, writes without permission or audit, broken module boundaries) structurally hard, run on EU infrastructure without exotic services, and stay in one language end to end.

## Decision

| # | Decision | Reason | Implementation notes |
|---|---|---|---|
| P-01 | TypeScript monorepo: pnpm workspaces + Turborepo | One language for UI, API, workers, MCP; types are a guardrail | Node ≥ 20 (CI on 22 LTS); `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| P-02 | `apps/web`: React + Vite + TanStack Router/Query; `packages/ui` on Vionvision tokens | Simple SPA, no SSR complexity | Raw colours/fonts banned outside `packages/ui` by lint |
| P-03 | `apps/api`: Hono + zod-openapi | Contracts first; one set of zod schemas for UI, API, MCP | API is thin: session → core → error mapping |
| P-04 | PostgreSQL + Drizzle ORM + row-level security | Typed queries, readable migrations, tenant isolation in the database | PostgreSQL 16. The application connects as a dedicated non-owner role without `BYPASSRLS`, otherwise policies do not apply. Actor context via `set_config(..., true)` per transaction |
| P-05 | Jobs: pg-boss | Postgres-backed queue, no extra infrastructure | Outbox relay publishes domain events to pg-boss |
| P-06 | Auth: better-auth (email invite, password/passkey, TOTP MFA) | Own accounts for internal and external users (D-10) | Young library: independent human security review of identity, permissions and RLS before any external user gets access (03 §7) |
| P-07 | Tests: Vitest, Playwright, Testcontainers (Postgres) | Standard, fast, works in CI | Integration tests run against a real Postgres with RLS on |
| P-08 | ESLint flat config + typescript-eslint strict + eslint-plugin-boundaries; Prettier | Module boundaries and house rules enforced mechanically | OCS-specific rules (raw colour, literal strings, `.delete(`, db imports) as a local plugin, each proven by a failing fixture |
| P-09 | MCP server: official TypeScript MCP SDK over `packages/core` | Same write path and permissions as the API | January 2027 |
| P-10 | Hosting: Aliyun International Frankfurt vs AWS/Azure EU; containers + managed Postgres | — | **Deferred** to Q4 (Hai Tao). Until decided: local docker compose; F0.12 preview/staging blocked |

## Consequences

- Every dependency added later goes through an `arch/` branch and the architect role (package.json is protected).
- Exact library versions live in the `package.json` files (no ranges, `savePrefix: ''`) and `pnpm-lock.yaml` — that is the single source of truth. pnpm refuses any version younger than 7 days (`minimumReleaseAge`), and install scripts run only for allow-listed packages (`onlyBuiltDependencies`).
- TypeScript is held at 6.0.x: typescript-eslint supports `<6.1`. TypeScript 7 (native compiler) is re-evaluated when typescript-eslint supports it.
- Node ≥ 22.12 (Vitest 5 requirement; CI and dev on Node 22 LTS) — stricter than the "Node ≥ 20" in 11-kickoff.
- Implementation notes (Phase 0, within P-01…P-08):
  - **Migrations are hand-written SQL** (`packages/db/migrations/NNNN_name.up.sql` + `.down.sql`) applied by a small runner in `@ocs/db`. drizzle-kit generates no down migrations, and 04-testing §3 requires up → down → up; RLS policies and grants are clearer in SQL. Drizzle is used for typed queries; a schema-drift test keeps the Drizzle definitions equal to the migrated tables.
  - **Every transaction runs `SET LOCAL ROLE ocs_app`** (non-owner, `NOBYPASSRLS`) before setting the actor context, so RLS applies even if the service logs in with a privileged role.
  - **Relative imports carry `.ts`** and TypeScript is limited to erasable syntax (`erasableSyntaxOnly`: no enums, no constructor parameter properties). Node 22 runs the sources directly; no build step for internal packages.
- Changing any line of this ADR requires a new decisions-log entry with Vlad's OK.
