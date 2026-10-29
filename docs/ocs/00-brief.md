# 00 — Product brief

Status: binding context as of 29 Oct 2026. Owner: Vlad (Delivery Director, Overseas Delivery).

## Why OCS exists

Vionvision delivers people-counting and retail-analytics sensors (G6 / G6S, G6 WiFi, B1, CBox edge terminals, V-store platform + OpenAPI) to retail clients in Europe, the Middle East and Asia. Delivery today runs on Excel trackers, DingTalk chats, WhatsApp, mail and a ticket system nobody reads. An analysis of the delivery knowledge base (2,440 records, 13 project registers, 28 Oct) showed the same failures again and again:

| Failure | Real examples (anonymise in code) |
|---|---|
| Requirement → ticket has no owner | Nobody translates client requirements into R&D tickets; one PM is the single point of contact; the ticket system is unread |
| Device data disagrees across sources | Device counts differ across AIoT, platform, packing lists and as-built; a batch push failed on 108 devices; devices shipped unbound |
| Different answers to "can we do X?" | One team says "cannot", another "next release"; a model works only on one client's hardware; passer-by counting banned in Germany |
| Replies owed to clients go missing | Written answers promised and never sent; status questions unanswered for days |
| Changes to live devices without notice | Firmware update locked a client's device for weeks; client not told about a DST change; client changed camera resolution without telling us |
| Owners disappear | PMs left; projects without a PM; hand-overs lost in chats |

OCS fixes this by making every problem a **case** with an owner, ETA and source trail, every project an object governed by the **SOPs**, and every team (delivery, platform, algorithm, firmware, finance, partners, clients) work from the same record.

## Users

| User | Main jobs in OCS | Interface |
|---|---|---|
| Delivery Director (Vlad) | Intake review, portfolio, escalations, acceptance | Web |
| Project managers | Projects, sites, devices, actions, cases, client updates | Web; MCP from their own AI later |
| Sales | Handover Card, project ID, client pack | Web (forms) |
| Platform / algorithm / firmware teams | Accept work items, set ETA, comment | **DingTalk cards** (no second login), web read |
| Finance | PO / invoice readiness (data mostly in Kingdee) | Web read, exports |
| Partners / installers | Jobs, checklists, photos | Phone web app (V1.1) |
| Clients | Client-visible case status, committed dates, CIP forms, approvals | Client portal (V1.1), own OCS account + MFA |
| Management | Portfolio, health, metrics | Web read |

## Scope by phase (summary — details in 05-roadmap.md)

- **Phase 0 (now → 10 Nov):** skeleton, guardrails, CI, identity + permissions + RLS, audit, design system, generators, decisions signed.
- **V1 pilot (10 Nov → 7 Dec, feature-complete 10 Dec):** clients / projects / sites with Project ID and L/S standard (SOP-DEL-02); intake: Handover Card, intake review, Intake Register (SOP-DEL-01); site lifecycle steps (SOP-DEL-04) with client gate templates; device registry (import + edit); actions, comments, feed; cases + work items with mail intake by tag/thread; alert subset; one-way DingTalk notifications; imports; Monday pack export; audit; EN/中文.
- **Pilot 7–22 Dec** on three projects of different shape: NEINVER (Standard L, network-heavy), Gebr. Heinemann (platform/algorithm-heavy), PMI Transition (Standard S, many sites). Excel runs in parallel.
- **Jan 2027:** interactive DingTalk cards, central AI agent (proposals only), device-platform read sync, DingTalk Drive index, MCP read-only for 3 users; onboarding of all projects; **internal go-live 20 Jan 2027**.
- **V1.1 (mid-Feb → Mar 2027):** client portal, partner app, calibration, quote generator, file field extraction, MCP write for R&D, change calendar.
- **V2 (Q2 2027):** full lifecycle incl. hypercare monitors, monthly service reports, decommissioning, margin, Kingdee link, more client portals.

## Product principles

1. SOP first, tool second — OCS executes SOP-DEL-01…04, the change-management SOP and the communication norms.
2. Zero extra effort for contributors — mail in CC, DingTalk card, link-based forms. If it costs a person more than the old way, it will not be used.
3. Internal by default — the delivery owner opens items to the client one by one.
4. AI proposes, people approve — three trust levels (08-ai-and-mcp.md).
5. One source of truth per data type, with a named owner.
6. Client specifics are templates (e.g. PMI gates G1–G5, D−2 check), never hard-coded.
7. Don't rebuild what lives elsewhere: Kingdee (stock, invoices), DingTalk OA (approval with Project ID), DingTalk Minutes (Action Record template).

## Constraints

- EU hosting for all client data; developers may sit in China → development environments in the EU cloud.
- Claude and some AI tools are not officially available in mainland China — personal AI clients may differ (Qwen, DeepSeek); MCP must be model-agnostic.
- Company mail: Aliyun enterprise mail (DingTalk-hosted).
- Chinese New Year 2027: 6 Feb (holiday ≈ 5–13 Feb) — freeze. EU Christmas 23 Dec – 3 Jan — no rollouts.
- Free internal project; no client pays for OCS.

## Success measures (tracked from pilot)

Cases with owner within SLA; work items with ETA within 2 working days; on-time rate; client updates on rhythm; share of updates made in OCS vs Excel; Intake Register: days to acceptance, returns; AI proposal acceptance rate without edits.
