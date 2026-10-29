# 02 — Architecture

Goal: an architecture in which a non-professional developer *cannot* make the dangerous mistakes — leaking one client's data to another, writing without permission or audit, breaking module boundaries — because the structure does not allow it.

## 1. Shape: modular monolith

```
apps/
  web/        React SPA (internal UI, later client portal and partner app as routes)
  api/        HTTP API (Hono + zod-openapi). Thin: auth session → call core → map errors
  worker/     Background jobs (pg-boss): mail intake, DingTalk, device platform, alerts, AI agent
  mcp/        MCP server for personal AI agents (OAuth as the user) — Jan 2027
packages/
  core/       ALL business logic, one folder per module (see §3)
  contracts/  zod schemas + inferred types shared by web, api, mcp, worker   [protected]
  db/         Drizzle schema, migrations, RLS policies, repositories base     [protected]
  ui/         Components on Vionvision design tokens (no raw colours/fonts elsewhere)
  i18n/       EN / 中文 message catalogues
  testing/    Factories, anonymised seed, test helpers
tools/
  generators/ pnpm gen:module | gen:command | gen:query | gen:screen | gen:rule | gen:migration
docs/ocs/     This documentation
infra/        IaC, deployment                                              [protected]
.claude/      Hooks, project skills, settings                              [protected]
```

## 2. Dependency rules (enforced by eslint-plugin-boundaries + CI)

| From | May import | May not import |
|---|---|---|
| apps/web | contracts, ui, i18n | core, db |
| apps/api, apps/mcp, apps/worker | core (public `index.ts` only), contracts | db directly, another module's internals |
| core/<module> | contracts, db (via own repository), other modules' **public** `index.ts` | other modules' internal files, apps |
| ui | i18n | everything else |
| db | — | core, apps |

Circular module dependencies fail CI. A module exposes only what is in its `index.ts`.

## 3. A core module

```
packages/core/<module>/
  index.ts            public API: commands, queries, types — nothing else is importable
  commands/<verb-noun>.ts     one file per write operation
  queries/<noun>.ts           read operations
  rules/              SOP rules as config + evaluators (each cites its clause)
  events.ts           domain events this module emits
  repository.ts       the only place that touches db tables of this module
  permissions.ts      permission entries for this module (registered centrally)
  __tests__/          unit + integration tests
```

### The one write path

```
command(actor, input)
  → permissions.require(actor, 'cases.workItem.setEta', resource)   // deny by default
  → contracts schema.parse(input)                                    // zod
  → rules.evaluate(...)                                              // SOP rules, cited
  → db.transaction:
       repository.write(...)
       audit.record(actor, command, before, after, source)           // automatic
       outbox.enqueue(domainEvent)                                   // integrations react later
  → return result
```

`defineCommand()` in core wraps this sequence. A command cannot be registered without a permission key, an input schema and an audit description — the type system refuses it. Integrations (mail, DingTalk, platform) never write tables; they call commands as a system actor or as the user they act for.

## 4. Tenancy and visibility

- Every business row carries `client_id` (nullable only for internal-only records) and `visibility` (`internal` | `client`) where relevant.
- PostgreSQL **row-level security** on all business tables. The API sets `app.actor_id`, `app.actor_kind` (`staff` | `client` | `partner` | `system`) and `app.client_ids` per transaction.
  - staff: all rows except restricted notes unless permission `notes.restricted.read`.
  - client: rows with `client_id = ANY(app.client_ids)` AND `visibility = 'client'`.
  - partner: only rows linked to their assigned jobs/sites.
- Partner identity is stored once; client-facing projections always use the label (Partner A/B/C). A test asserts no client-facing query returns a partner's real name.
- Restricted internal notes (SOP-DEL-02 `11_Internal Notes`, Standard S `_Internal Notes`) are a separate table with their own RLS policy.

## 5. Modules (V1 unless noted)

| Module | Owns | SOP |
|---|---|---|
| identity | users, roles, invitations, MFA, sessions | — |
| permissions | permission registry, role → permission map, checks | — |
| org | clients, programmes, countries, cities, partners (with labels) | SOP-DEL-02 §3 |
| projects | projects/sites with Project ID, standard L/S, team, phase, S→L upgrade | SOP-DEL-02 |
| intake | Handover Card, mandatory items Full/Light, intake review decisions, conditions with deadlines, Intake Register, Conditional Start | SOP-DEL-01 + Annex B |
| sites | site lifecycle steps, client gate templates (e.g. PMI G1–G5, D−2), readiness, go/no-go, acceptance | SOP-DEL-04 |
| devices | registry: SN, MAC, model, firmware, site, switch/port/IP, status, source records for reconciliation | SOP-DEL-02 §4 (05/06) |
| visits | site visits: type, coverage X of Y, agreed vs discussed, actions, record link | SOP-DEL-03 |
| actions | actions with owner, due, source, status | SOP-DEL-03 §4 |
| feed | updates and comments with source, @mentions | — |
| cases | cases, work items, messages, ETA history, client-visible projection, triage | SOP-DEL-05 (to write) |
| alerts | rule engine R1–R23, owner, level, handling log | domain/rules.md |
| files | document references (DingTalk dentry, hash, version, type by folder number 00–11 / slot prefix) | SOP-DEL-02 §4–5 |
| notifications | DingTalk work notices (one-way in V1), email digests to staff | Communication norms |
| imports | Excel trackers, KB open items, old tickets — idempotent, dry-run first | — |
| reports | Monday pack export, Intake Register monthly report | SOP-DEL-01 §11 |
| audit | append-only audit log, read API | — |
| changes (V1.1) | change calendar, client-notice gate, batches, rollback | Change-management SOP |
| capability (Jan) | capability matrix: feature × hardware × firmware × algorithm × market law | — |

## 6. Integrations pattern (details in 07-integrations.md)

Adapter per external system in `apps/worker/adapters/<system>`; each adapter: idempotency key (Message-ID, DingTalk message id, dentry id + version), retries with backoff, dead-letter table, sandbox/fake implementation for tests, rate limits, no client-facing sends. Inbound data becomes commands; outbound only to staff (DingTalk notices, digests) or to the user's own Drafts folder.

## 7. Time, money, language

- Timestamps stored UTC; each site has an IANA time zone; plan dates are date-only.
- Money as integer minor units + ISO currency; reports at ECB rate on invoice date.
- All UI text through i18n keys (EN, 中文). Client-facing generated text in English unless the client's language is configured.

## 8. Environments

| Env | Data | Who deploys |
|---|---|---|
| local / EU dev box | anonymised seed only | anyone |
| preview per PR | anonymised seed | CI |
| staging (EU) | anonymised copy | CI on merge to main |
| production (EU) | real | architect role, manual approval |

PM-developers have no production database access. Production data fixes happen through commands with audit, never through SQL.
