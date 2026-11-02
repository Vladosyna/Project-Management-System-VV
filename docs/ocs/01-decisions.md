# 01 — Decisions log (binding)

Rules: a decision here is not re-opened without Vlad's explicit OK. New decisions are appended with the next number, date and who decided. Superseded decisions stay, marked SUPERSEDED with a pointer.

| # | Date | Decision | Decided by |
|---|---|---|---|
| D-01 | 28 Oct 2026 | OCS is the single internal operations platform for **all** Vionvision delivery projects, not a PMI tool. | Vlad |
| D-02 | 28 Oct 2026 | Internal project, free of charge for clients. | Vlad |
| D-03 | 29 Oct 2026 | The **case** is the operating core: one thread per problem from first email to fix. It replaces the existing ticket system (unread). Old open tickets are imported once, then the old system is read-only and retired after go-live. | Vlad |
| D-04 | 29 Oct 2026 | Platform, algorithm and firmware teams work from **DingTalk cards** (accept, ask, reassign, set ETA with reason). No second login required. | Vlad |
| D-05 | 29 Oct 2026 | OCS never sends client mail or messages by itself. Client updates are drafts placed in the user's own mailbox (IMAP Drafts) or opened in their mail client, with the case tag in the subject and the case address in CC. | Vlad (standing rule) |
| D-06 | 29 Oct 2026 | Visibility is internal by default; the delivery owner opens items to the client one by one. Internal ETA (set by R&D) and the date committed to the client (set by the delivery owner) are separate fields. | Vlad |
| D-07 | 29 Oct 2026 | AI writes only through the OCS API with the same permissions as a user. Two channels: a central server-side agent (shared mailbox, DingTalk bot, portal, alerts) and personal agents via an OCS MCP server (OAuth as the user). Three trust levels: automatic / proposal / human-only (08-ai-and-mcp.md). Start with proposals only. | Vlad |
| D-08 | 29 Oct 2026 | Company mail is **Aliyun enterprise mail**. Plus-addressing is unverified, so case matching relies on the subject tag `[CS-nnnn]`, the Project ID and thread headers (Message-ID / In-Reply-To). Plus-addresses are an optional extra if confirmed. | Vlad / Claude |
| D-09 | 29 Oct 2026 | DingTalk Drive and knowledge base are read through an internal DingTalk app (Storage.DownloadInfo.Read). Changes detected by polling (no change events confirmed). Originals stay in DingTalk; OCS keeps link, hash, version and extracted text. OCS does not auto-push client personal data into DingTalk. | Vlad / Claude |
| D-10 | 29 Oct 2026 | **No client SSO adaptation.** PMI is not the main contributor. All external users (clients, partners) use OCS-native accounts: email invitation, password or passkey, MFA. CIP forms work by link without an account. External SSO is not on the roadmap. Supersedes the PMI Entra ID SSO item in PRD v0.2/v0.3. | Vlad |
| D-11 | 29 Oct 2026 | **SOPs are law.** OCS encodes SOP-DEL-01 (intake & handover), SOP-DEL-02 (folder standard, Project ID), SOP-DEL-03 (site visits), SOP-DEL-04 (client information, CIP-L/S), the change-management SOP and the communication norms. Rules are configuration citing the clause; a new SOP version changes configuration, not code. One new SOP is needed: SOP-DEL-05 Cases & Requests. | Vlad |
| D-12 | 29 Oct 2026 | Client specifics are **templates**: PMI gates G1–G5 and the D−2 check are a gate template on the PMI programme. Base site steps come from SOP-DEL-04: card received → card complete → readiness confirmed → go/no-go (working day before) → installed → accepted. PMI "Part A/B" market forms are replaced by CIP-S / CIP-L forms. | Vlad |
| D-13 | 29 Oct 2026 | Pilot projects: NEINVER (Standard L), Gebr. Heinemann (platform/algorithms), PMI Transition (Standard S). Not PMI-centric. | Vlad / Claude |
| D-14 | 29 Oct 2026 | Do not rebuild Kingdee ERP (stock, invoices) or DingTalk OA approvals; integrate read-only later. Do not build a warehouse module in V1. | Vlad / Claude |
| D-15 | 29 Oct 2026 | Developers are Vionvision PMs working with Claude. Claude builds, coaches and reviews. Protection is mechanical: hooks, lint boundaries, CI, CODEOWNERS, RLS, generators. A human architect-reviewer is still required for protected zones (Vlad, D-24). | Vlad |
| D-16 | 28 Oct 2026 | EU hosting (Frankfurt or Amsterdam region); no client data replicated to China; development environments in the EU cloud. | Vlad |
| D-17 | 28 Oct 2026 | Dates (Leon's, kept): 10 Nov scope & UI sign-off · 10 Nov–5 Dec two sprints · 7 Dec pilot · 10 Dec V1 feature-complete · 22 Dec pilot review · 20 Jan 2027 internal go-live · Feb–Mar V1.1. CNY freeze ≈ 5–13 Feb 2027. | Leon / Vlad |
| D-18 | 29 Oct 2026 | Project ID format from SOP-DEL-02: `CLIENT-CC-CITY-NNN` (client short code ≤ 8 letters, ISO country, 3-letter city / IATA, running number). It is the primary business key for projects/sites in OCS, in mail subjects and in DingTalk folder names. | SOP-DEL-02 |
| D-19 | 29 Oct 2026 | Excel trackers are retired per project, not big-bang, when: two weeks of all updates in OCS, Monday pack from OCS matches Excel, PM confirms data. | Vlad / Claude |
| D-20 | 29 Oct 2026 | The knowledge base stores credentials in full; credentials are **never** imported into OCS as text. Only into a secret store, if at all. | Claude |
| D-21 | 29 Oct 2026 | **ADR-001 accepted**: P-01…P-09 below are binding (`docs/ocs/adr/ADR-001-technology-stack.md`). P-10 hosting is deferred to Q4; until then local docker compose only, F0.12 preview/staging waits. | Vlad |
| D-22 | 29 Oct 2026 | Branches: `main` starts at the bootstrap-pack commit and changes only through PRs; Phase 0 work on `arch/phase-0-skeleton`. Until Q2 is answered Vlad is the interim architect role in CODEOWNERS. | Vlad |
| D-23 | 30 Oct 2026 | Answers Q1: the PMs who write code are **Xavier, Vlad and Leon**, hours as available (no fixed weekly allocation). They work on `feat/` and `fix/` branches after Phase 0; protected zones stay `arch/`. | Vlad |
| D-24 | 30 Oct 2026 | Answers Q2: **Vlad is the architect-reviewer** (CODEOWNERS for protected zones), replacing the interim role of D-22. PRs by Xavier or Leon need Vlad's approval. GitHub does not let an author approve their own PR, so Vlad's own `arch/` PRs (including those Claude opens from his account) merge once the required checks are green, with Claude's review in the PR as the second pair of eyes. | Vlad |
| D-25 | 2 Nov 2026 | **A site's standard can change both ways (S → L and L → S)** at staff's discretion. This overrides the SOP-DEL-02 §2.1 sentence "There is no downgrade from L to S"; Vlad updates the official SOP-DEL-02 (v1.5), the repository copy carries a note until then. The Project ID never changes with the standard (D-18). Until the DingTalk Drive integration (V1.1) the PM moves the folders and files by hand when the standard changes. | Vlad |
| D-26 | 2 Nov 2026 | **ADR-002 accepted** (`docs/ocs/adr/ADR-002-identity.md`): invitation-only accounts, mandatory TOTP, roles granted by an audited command with the resume path when the grant fails, credentials walled off in schema `auth`, 12-hour sessions. Its known gaps (TOTP replay, in-memory rate limit) stay open for the security review before any external user (03 §7). | Vlad |
| D-27 | 2 Nov 2026 | **A project is one centre (site)** with its own Project ID and its own Handover Card (e.g. a POC store with a CIP-S card). A client company has many projects, and they differ; each is handed over and reviewed on its own (SOP-DEL-01, E2). | Vlad |
| D-28 | 2 Nov 2026 | **Restricted Internal Notes** (group F: verbal commitments, concessions, relationship map, history) are read and written only by the project's Sales owner, its assigned PM, the Delivery Director (role `director`) and the sponsor (role `sponsor`). No other staff, no system actor (central AI agent), no client or partner. A reader's personal AI agent via MCP has the reader's rights, as everywhere (D-07). Enforced in RLS (migration 0010). Notes are never edited, only archived. | Vlad |

## Proposed at kickoff (ADR-001) — accepted 29 Oct 2026 as D-21 (P-10 deferred)

| # | Proposal | Why |
|---|---|---|
| P-01 | TypeScript monorepo: pnpm + Turborepo | One language for UI, API, workers, MCP; strong typing is a guardrail for non-professional developers |
| P-02 | `apps/web`: React + Vite + TanStack Router/Query; `packages/ui` built on Vionvision design tokens | Simple SPA, no server-rendering complexity |
| P-03 | `apps/api`: Hono with zod-openapi contracts | Contracts first; same zod schemas validate UI, API, MCP |
| P-04 | `packages/db`: PostgreSQL + Drizzle ORM + row-level security | Typed queries, readable migrations, RLS for tenant isolation |
| P-05 | Jobs: pg-boss (Postgres-backed queue) | No extra infrastructure |
| P-06 | Auth: better-auth (email invite, password/passkey, TOTP MFA) | Own accounts for internal and external users (D-10) |
| P-07 | Tests: Vitest, Playwright, Testcontainers (Postgres) | Standard, fast, works in CI |
| P-08 | Lint: ESLint flat config + typescript-eslint strict + eslint-plugin-boundaries; Prettier | Module boundaries enforced mechanically |
| P-09 | MCP server: official TypeScript MCP SDK over `packages/core` | Same write path as the API |
| P-10 | Hosting: decide with Hai Tao (Aliyun International Frankfurt vs AWS/Azure EU). Containers + managed Postgres. | Company relationship with Alibaba vs client expectations |

## Open questions (owner)

| # | Question | Owner |
|---|---|---|
| Q3 | Is Leon the product owner, with allocated time? | Vlad |
| Q4 | Hosting provider and region; AI provider with EU endpoint; budget. Leaning (2 Nov, not decided): Aliyun Frankfurt (EU, D-16). | Hai Tao |
| Q5 | DingTalk internal app approval and permissions (work notices, bot, cards, Drive read, OA events) | Hai Tao / DingTalk admin |
| Q6 | Case mailbox in Aliyun mail; IMAP or open API access; plus-addressing supported? | IT |
| Q7 | Device-platform OpenAPI key: online status, binding, firmware version | Platform team |
| Q8 | Kingdee access (stock, invoices) | IT |
| Q9 | SOP-DEL-01…04 formally approved and effective? (Sales lead finds SOP-DEL-01 long; OA flow pending) | Hai Tao / Sales lead |
| Q10 | Old ticket system: name, export method, open ticket count | Platform team |
