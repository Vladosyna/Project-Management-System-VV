# Requirements update — 23 Nov 2026

Review of the OCS requirements (00-brief, 05-roadmap, PRD v0.3) against delivery operations 29 Oct – 20 Nov 2026 (knowledge base: company and PMI open items, supplier rules, calls and mails). Dates and phases are unchanged; this file changes **what** the existing epics must do and adds what operations now need. Owner: Vlad. To be recorded as D-34 when accepted.

## 1. What is confirmed

The six failures of 00-brief are all still live and still the core: requirement → R&D ticket without owner (CVA / Age Alert feature tracker delays, PMI weekly 10 Nov), device data disagreeing (Neinver 11 of 14 faulty devices; Getafe counts), different answers on capability (G5 incompatibility lists disagree), replies owed (unanswered-mail register), changes without notice, owners disappearing (Aaron, Steve → Ethan, Watsons TW → Anthony without the weekly meeting). **E6 Cases stays the centre of V1.** E1–E5 as built remain valid.

## 2. What changes in existing requirements

| # | Area | Was | Now | Why (source) |
|---|---|---|---|---|
| C1 | Finance (00-brief Users) | PO / invoice "mostly in Kingdee", web read, Kingdee link in V2 | **PO, DPIA and invoice status are delivery data in V1**, entered by the PM; Kingdee link stays V2 | Installed PMI stores without PO or DPIA cannot be configured or invoiced; installers paid before revenue; 40+ legacy stores without owner (company A-20, PMI A-06, A-62, A-69) |
| C2 | E3 gates (PMI template) | G1–G5 + D−2 readiness | Add gates **PO received** (before installation booking where the market requires it) and **DPIA approved** (before configuration); per country (D-32) | Italy assessment PO gate (A-62); DPIA status per market differs (11 yes / 11 pending, 2 Nov) |
| C3 | E3 readiness | "readiness confirmed" step with evidence link | Readiness = **New Store Readiness checklist** (VV-SOW-STORE v1.0): each item with photo or written evidence, sent by the market 2 working days before; go/no-go D−1 recorded; installer booking blocked until passed | Malta Mosta attended-not-ready 1 Nov; Estonia Ülemiste failed twice (A-68, A-85); A-97 |
| C4 | Partners (00-brief Users) | Partners = phone app in V1.1 | **Installer jobs are V1 delivery data**; the phone app stays V1.1 | Installer cost and capacity is now the main delivery risk (A-60, A-63, A-79, A-84, supplier rules §1–5) |
| C5 | E11 Reports | Monday pack per project | **Friday weekly report per project** first (Hai Tao, 5 Nov), then Monday pack; plus a **programme tracker export** that replaces Steve's tracker (baseline 9 Nov, A-67) and Ethan's merged lists | Weekly report is now a management rule; PMI tracker lives in Excel |
| C6 | E7 Mail | Case mailbox by tag/thread | Add an **"awaiting our reply" clock** on every client thread (owner, 2-working-day rule of 25 Oct), even when the thread is not a case | Unanswered-mail register kept by hand since 4 Nov; reply rule 25 Oct |
| C7 | E10 Imports | PMI trackers, quotes, device lists, KB open items | Add **Steve's tracker of 9 Nov as the PMI baseline**, the Quotes Register v2 and the KB ledgers (per-project and supplier payments) | A-30, A-67; ledgers exist since 2 Nov |
| C8 | Ownership | Owner per object | **Owner transfer** as one command: all open items, sites, cases and threads of a person to a new owner, with a handover note and a leaver flag; nothing may keep a departed owner | Aaron (23 Oct), Steve → Ethan PMI contacts (A-81), Watsons TW (A-19); 3 items still on departed owners |
| C9 | Capability matrix (Jan) | Manual content, January | Unchanged date; first content = **device × firmware × feature** answers already given (G5/CVA, Age Alert, Product Engagement, heatmap vs zones) and PMI's inventory/roadmap request | A-40, A-41, A-75; company/15 feasibility answers |
| C10 | Client view (V1.1 portal) | Client-visible case status | Add a **programme tracker view for PMI** (stores, dates, status, gates) — PMI asked for it and approved the Airtable prototype in October | Monthly alignment Oct; PMI pain points: transparency, timeline reliability |

## 3. New requirements

### N1 Installer jobs and procurement (V1, extends E3 / E12)
- Installer job per site or per trip: installer (real name staff-only, Partner label to clients), scope (partial / full on-site), sensors, SOW sent, schedule, status.
- **SOW generated from site data**: Standard Installation SOW (VV-SOW-INST) + site page (devices, ceiling height, cabling mode, readiness gate) — the documents produced by hand on 5 and 11 Nov.
- Quotes: ≥ 2 comparable quotes on the same SOW (P-12), per unit / hour / trip (P-08); installer price ≤ price to the client (P-03); approval by the CEO recorded with reference (P-11) — urgent single quote only with a reason.
- Schedule changes go through the Delivery Director; the market receives one final schedule (P-10).
- Visit outcome: done / attended-not-ready (abortive charge rules per supplier, e.g. ES-01) / cancelled before arrival.
- Supplier invoice checked against the supplier's rules and quote before payment request (P-07); payment request reference (DingTalk OA, P-05); credit/payment terms per supplier.
- Internal time standard (installation-time-standard: partial N + 2 h, full 2N + 2 h) used to flag quotes above standard.

### N2 Commercial status per site (V1)
- Client PO (number, amount, currency, date), DPIA status, client invoice (number, status), price-list price (PMI billed by price list only, A-15).
- Alert rules: installed without PO; installed without DPIA; installer invoice without client PO; site without owner; margin negative (installer cost > client price).

### N3 Shipments (V1 minimal)
- Shipment per site or batch: carrier, AWB, declared value (actual sales price rule, 5 Nov), consignee (no departed staff), devices by SN, status, customs issue.
- Alert: no arrival confirmation N days after ETA; parcel held in customs.
- Source: A-53, A-65, A-94, company A-08/A-21 (DHL Spain, Serbia via UPS, Craiova, VIE).

### N4 Security findings as cases (V1, uses E6)
- Client security findings (Cobalt pen-test 30 findings, SSO secret rotation, credential hygiene) tracked as cases of type *security* with owner, ETA and client-visible committed date. No new module. Source: A-43, A-55, A-64, A-82, A-95.

### N5 How the data gets in: AI agents first, hand entry as fallback (applies to N1–N4)
OCS is AI-native (D-33): every command is a tool, so the data above is filled by agents, not typed by PMs. PMs confirm.

| Data | Source | Agent action | Trust level (08-ai-and-mcp) |
|---|---|---|---|
| **Price proposals** tab per site / trip / country: installer, line items (per unit, per hour, travel, extras), currency, validity, SOW version, link to the source | Installer mails and PDF/XLSX quotes, WhatsApp | Extracts every new quote, matches it to the SOW and site, normalises to unit + hour + travel, flags lines above the internal time standard, above the client price (P-03) or outside the supplier's rules | Proposal → PM confirms; approval stays human (CEO, P-11) |
| Quote comparison | Price proposals of the same SOW | Builds the like-for-like table, marks the cheapest compliant quote, prepares the approval request for the CEO group | Proposal |
| Client PO, DPIA, invoice | PMI mails (PO notifications, DPIA status lists), client portals | Extracts PO number, amount, store; DPIA status per market; links to the site | Proposal → PM confirms |
| Supplier invoice | Supplier mails | Matches to quote and visit outcome, checks against supplier rules (P-07), drafts the payment request text | Proposal; payment request is human (OA) |
| Shipment | Carrier mails and tracking pages/APIs | Creates or updates the shipment, status and ETA; alerts on customs holds | Automatic for status; proposal for new shipments |
| Readiness checklist | Market's mail/WhatsApp with photos | Ticks items with the photo as evidence, lists what is missing | Proposal; go/no-go human |

Until the central agent (January) runs on the server, the same tools are used by each PM's own agent through MCP (OAuth as the user, available now). Hand entry exists only as the fallback for every field. What stays out of V1 is a **system-to-system** link to Kingdee and DingTalk OA, not automation.

**Confirmed by Vlad, 23 Nov:** N1–N3 in V1 with agent entry and PM confirmation. System integrations (Kingdee, DingTalk OA, carrier tracking, installer portals) are added as adapters (`apps/worker/adapters/<system>`, 07-integrations.md) as soon as an open API becomes available; each one replaces agent extraction for its data, never the PM confirmation of money data.

## 4. What does not change
Phases and dates; SOPs as law; AI proposes, people approve; no client-facing sends; EU hosting; restricted notes (D-28); devices identified by SN (D-29); gates per scope (D-32); AI-native registry (D-33).

## 5. Out of OCS (stays elsewhere)
Business-trip expenses and per-diem; HR monthly performance scores; credentials (KB / secret store only, D-20).

## 6. Open question for Vlad
1. Who owns the PO/DPIA data entry for PMI — Ethan (Leon's assignment, 11 Nov) for all markets?
