# OCS PRD v0.3 (English part, 29 Oct 2026)

**Status:** reference. Where this conflicts with docs/ocs/01-decisions.md, the decisions file wins (PMI SSO removed, Part A/B replaced by CIP forms, intake module added, pilot not PMI-centric).

## Document info

|           |                                                                                                                                                                                |
|-----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Document  | OCS unified project platform · PRD and interactive prototype v0.3                                                                                                              |
| Date      | 29 Oct 2026 (v0.2: 28 Oct)                                                                                                                                                     |
| Author    | Vladyslav Yurchyna (Delivery Director), building on Leon's PRD v0.1                                                                                                            |
| Status    | Internal review draft — Leon to turn it into the working PRD and mark questions                                                                                                |
| Prototype | The "Prototype" tab of this file works offline and is clickable; online canvas: [claude.ai/artifact/GxPng34TDVpkzpVfdra7yC](https://claude.ai/artifact/GxPng34TDVpkzpVfdra7yC) |

<div class="note">

**In one line:** OCS is no longer only an overseas chain delivery tool. It is the single workspace for every Vionvision project — delivery, platform and algorithms, commercial, client and partner collaboration, comments, latest updates and actions — and every piece of information keeps its source.  
**New in v0.3:** the Case becomes the operating core — one thread per problem from the first email to the fix. It replaces the ticket system nobody reads; platform, algorithm and firmware teams take work and set ETAs from DingTalk; clients see status and committed dates.

</div>

## 1. Overview and what changes in v0.2

v0.1's structure, data model (Project → Store → Device, PO → Shipment → Device, PO → Invoice), device status machine and alerts R1–R6 all stay. What v0.2 adds:

- **Scope:** every project (PMI, NEINVER, Heinemann, Watsons, Decathlon, Inditex, Logista, SRG, Erajaya, Cainz, MasOrange, Unifree, Aspire), not only overseas chain stores.
- **Platform and algorithms:** per store — hardware, firmware/software versions, algorithms enabled, configuration changes, accuracy results, known issues.
- **Communication:** comments on project, store and device (@mentions, files, photos) and one "latest updates" feed, each item with its source (mail / DingTalk / WhatsApp / meeting / system).
- **Actions:** every action has an owner, a due date and a source; any comment can become an action.
- **Gates G1–G5:** client deployment gates per store with evidence (DPIA, PO, D−2 check, calibration approval).
- **Design and quotation:** quotes generated from designs and checked before sending (counts, duplicate POs, VAT, arithmetic).
- **Network readiness:** switch, port and static IP per device; D−2 final check.
- **Portals:** client portal (PMI read-only + approvals + forms, partners anonymised) and partner phone app (checklist, photos).
- **AI assistant:** proposes status updates from mail and chats, answers project questions, drafts mails — proposes only; people confirm.

## 2. Modules and phases

| Module                                    | Main functions                                                                                                                                   | Phase                 |
|-------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------|
| **Cases and work items (v0.3)**           | Mail / DingTalk / WhatsApp / portal → case; triage; work items per team; ETA and history; internal vs client-visible; SLA; import of old tickets | V1                    |
| **Device registry reconciliation (v0.3)** | AIoT, device platform, packing lists and as-built compared; difference report                                                                    | V1                    |
| **Capability matrix (v0.3)**              | Feature × hardware × firmware × algorithm version × market law: available / beta / roadmap / not possible                                        | V1                    |
| **Change calendar (v0.3)**                | Firmware / configuration changes to live devices: client-notice gate, staged push, rollback; client-side changes logged                          | V1.1                  |
| Foundation                                | Login (company account + MFA, PMI SSO, partner invitation), roles and client separation, audit log, EN / 中文, time zones, currencies            | V1                    |
| Portfolio and project workspace           | All projects with health and phase; project page: markets / stores, gates, updates and comments, documents                                       | V1                    |
| Stores and devices                        | Store records, device SN/MAC, switch / port / IP, online status, shipments, DOA / RMA                                                            | V1                    |
| Updates, comments, actions                | One feed with sources, comments, @mentions, board, due reminders                                                                                 | V1                    |
| Alert engine                              | R1–R16, hourly, owner, time limit, handling log, mail / DingTalk notices                                                                         | V1                    |
| Design and quotation, PO and invoice      | Design versions, quote generation and checks, PO, invoice readiness, payment                                                                     | V1                    |
| Platform and algorithms                   | Configurations, versions, accuracy, known issues; reads the device-platform OpenAPI                                                              | V1 (read-only) → V1.1 |
| Calibration and accuracy                  | DPIA gate, 48-hour calibration access requests, accuracy test and report                                                                         | V1.1                  |
| Client portal, partner app                | PMI read-only and approvals; partner phone checklist, photos                                                                                     | V1.1                  |
| AI assistant                              | Proposals from mail / chats, Q&A, drafts, translation                                                                                            | V1.1                  |

## 3. Roles and permissions

| Role                                  | Sees                                                                                                  | Can do                                                                                                                                           |
|---------------------------------------|-------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Admin                                 | Everything                                                                                            | Users, clients, rate tables, rules                                                                                                               |
| Project manager                       | Own projects and all internal data                                                                    | Plan, update, handle alerts, issue quotes, confirm partner input                                                                                 |
| Delivery engineer / designer          | Assigned projects                                                                                     | Designs, devices, network, calibration, accuracy tests                                                                                           |
| Platform / algorithm / firmware teams | Platform pages of all projects; work items assigned to their team and the parent case (internal view) | Versions, configurations, known issues; accept work, set and change ETA (reason required), comment, change status — mostly from a DingTalk card  |
| Duty triager                          | All new cases                                                                                         | Type, priority, owner, split into work items; rotation of one person each from delivery, platform and algorithms                                 |
| Finance                               | All POs and invoices                                                                                  | PO, invoice, credit note, payment; partner invoices                                                                                              |
| Management                            | Everything, read-only                                                                                 | Dashboards and reports                                                                                                                           |
| Partner                               | Assigned stores only                                                                                  | Checklist, photos, status, issues — confirmed by the PM                                                                                          |
| Client (e.g. PMI)                     | Own markets and stores; partners shown as Partner A/B/C                                               | View, fill market forms, approve calibration, comment, export; raise requests and follow client-visible case status, committed dates and updates |

## 4. Screens (one-to-one with the prototype)

### 4.1 Home · my desk

- Tiles: P0 alerts, actions due this week, installations in 14 days, quotes needing correction.
- My actions (source, due, status); latest updates feed (filter delivery / platform / commercial, source on every item).
- Right: alerts, "Ask OCS" Q&A and "proposed from mail and chats" (approve / edit), next 7 days.
- Top bar: global search (projects, stores, SN/MAC, PO, people), multi-time-zone clock, EN / 中文, notifications.

### 4.2 Portfolio

- Counts by phase (Rollout / Pilot / Integration / PoC / Tender / Pre-PoC / Winding down), click to filter.
- Table: project, phase, countries, stores · devices, health, next milestone, owner, open items, last update.
- Health by rule: a P0 alert or a milestone more than 5 days late = At risk; raised by the client = Escalated.

### 4.3 Project workspace (example: PMI Transition)

- Header: status, size, team, client contacts; buttons: Monday pack, client view, add update.
- Funnel: markets, stores, sensors, installing now, blocked at G1, live.
- Tab · Markets & gates: per market stores / sensors, partner (internal name), G1–G5 state (passed / current / blocked / not started), quote and PO, installation window, next step.
- Tab · Updates & comments: composer (post / post as status update / turn into action), timeline (people, AI proposals, system events), pinned facts.
- Tab · Documents: version, shared with client or not, date.

### 4.4 Site (example: NEINVER SSRR)

- Tiles: online, offline, share with normal network speed, switches to fix, handover due date.
- Tab · Devices & network: switch issues (finding, fix, status); sensors (SN · MAC, switch · port, IP, online from platform, last seen, calibration).
- Tab · Algorithms & calibration: configuration (product, counting lines, firmware, algorithm package, change log); calibration, access request, accuracy test, report, handover pack.
- Tab · Timeline & comments.

### 4.5 Platform & algorithms

- Device families (G6 / G6S, G6 WiFi, B1, CBox, edge container, V-store + OpenAPI).
- Tabs: site configurations (algorithms enabled, notes, status) · releases (component, version, where it runs, date, status) · accuracy (targets vs latest results, fixed formulas) · known issues (affects, owner, target, status).

### 4.6 Actions & alerts

- Board: Open / In progress / Waiting on someone / Done; filter by owner; card shows priority, project, owner, due, source.
- Alert rules with today's hits (rule, level, hits, example).

### 4.7 Commercial (internal only)

- Quote builder: bill-to, tax ID, Incoterm and VAT treatment, rate tier; lines generated from designs; checks before issue.
- Tabs: quote register (issued, corrected, why, VAT treatment, status) · POs and invoices (installed, invoice, paid, blocker).

### 4.8 Client portal (PMI view)

- PMI SSO; tabs: overview, markets, requests, approvals, forms, reports.
- **v0.3:** “Your requests and issues” — number, market, simple status (Received / Investigating / Fix in progress / Waiting on you / Resolved), committed date, latest client-visible update; “Raise a request” button.
- Market progress bars (gates passed), anonymised partners, "waiting on".
- Needs the client's decision: calibration approval, date change, quote acceptance; market forms by link (no account); export to SharePoint.

### 4.9 Partner phone app

- Today's job: store, time window, design (models and count), D−2 check, store contact, progress.
- Checklist step by step (arrival, photo per sensor, cable labels, port and static IP, online check from the platform); report issue, submit for PM confirmation.

### 4.10 Cases list (v0.3)

- Tiles: open cases, waiting on R&D (by team), no owner or no ETA, client update overdue, unlinked messages.
- Table: priority, number, type, title, client · site, owner · team, linked (mails, work items, devices), status, ETA (and whether it moved), visible to client; filter by team.
- Right-hand inbox: mail / WhatsApp / portal requests / old tickets not matched to a case, each with an AI suggestion (attach to case / new case / make an action / not a case) — a person confirms.

### 4.11 Case detail (v0.3)

- Header: priority, type, status, client-visible, client update due; buttons: change ETA, close with root cause, update client.
- Fact cards: client · site, accountable owner, internal ETA, date committed to the client, SLA, capability-matrix status.
- AI summary (with source count); one timeline: mail in, mail out, DingTalk, internal comments, ETA changes, AI contradiction flags, test results, system events; filter all / mail / internal / client-visible.
- Composer with a visibility switch; client updates open as a draft in the user’s own mail client (case address in CC) — OCS never mails clients on its own.
- Right: work items (number, team, owner, ETA, status), “what PMI sees” preview, ETA history (reason on every change), linked objects, people (RACI).

### 4.12 R&D side · DingTalk work card (v0.3)

- New work items are pushed to the owning team: AI case summary in Chinese, device count, client-visible or not, days in triage.
- Buttons: take it / ask delivery / reassign; after taking it, pick an ETA and give a reason (required) — synced back, case ETA recalculated.
- Personal queue digest at 09:30 Beijing (no ETA and overdue highlighted).

## 5. Data objects and states

Added to v0.1's objects (Project, Store, Device, Shipment, PO, Invoice):

| Object                                       | Content                                                                                                                                                                         |
|----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Client, Market                               | Client; market = country + legal entity + tax ID + Incoterm + VAT treatment + rate tier                                                                                         |
| Gate                                         | G1–G5 per store: date, approver, evidence file                                                                                                                                  |
| Design, Quote, QuoteLine                     | Design version (count, G6 / G6S, mounting height, checker); quote generated from designs                                                                                        |
| Config, Release, AccuracyTest                | Algorithm configuration per store and its changes, firmware / software versions, accuracy test and report                                                                       |
| Partner, RateCard, Job                       | Partner (label to clients), internal rates, job per visit, partner invoice                                                                                                      |
| Update, Comment, Action                      | Update (source, linked object), comment (@, files), action (owner, due, source, status)                                                                                         |
| **Case (v0.3)**                              | Client, site / devices, type, priority, accountable owner, status, internal ETA, date committed to the client, client-facing title, root cause and category (required to close) |
| **WorkItem (v0.3)**                          | Parent case, team (platform / algorithm / firmware / delivery / partner / client), owner, ETA and its history (reasons), status, linked release or configuration change         |
| **Message (v0.3)**                           | Mail, DingTalk, WhatsApp, portal, comment; original text, thread ID, sender, visibility (internal / client), match confidence                                                   |
| **Capability, ChangeEvent (v0.3)**           | Capability-matrix entry (status, owner, evidence); change to live devices (type, scope, client notice, batches, rollback)                                                       |
| Alert, CalibrationRequest, Document, Contact | Alerts and handling log; 48-hour calibration access; versioned files; contacts and roles                                                                                        |

**Store states:** Released → Part A received → Quoted → PO → Compliance approved → Date agreed → Equipment on site → Ready (D−2) → Installed → Calibrated → Go-live → Closed; side states On hold / Cancelled.

**Case states:** New → Triaged → In progress → Waiting (client / partner / other team) → Fix ready → Verifying → Resolved → Closed (root cause required). **Work item states:** Open → Accepted → In progress → In review / test → Done; side states Needs info / Rejected (reason required).

**Device states:** Planned → Shipped → Received → Installed → Online → Calibrated; side states Lost / Faulty (DOA / RMA, new SN linked to the old one).

## 5a. Case and work-item rules (v0.3)

<div class="note">

**Why:** the current ticket system is not read; problems sit in mail, DingTalk and WhatsApp with no owner, no ETA and no news for the client. In OCS each problem has one thread, and every team and the client see the same status.

</div>

| Topic                  | Rule                                                                                                                                                                                                                                                                         |
|------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| One problem = one case | A case is the client-facing problem; internal tasks are work items, each with one team and one owner. Case ETA = the latest ETA among blocking work items.                                                                                                                   |
| Mail in                | Each case has a sub-address (e.g. cases+CS-0412@); mail with \[CS-0412\] in the subject, in a known thread or with the case address in CC is attached automatically; the rest goes to the inbox with an AI suggestion, and a person confirms.                                |
| Mail out               | OCS never mails clients on its own. A client update opens as a draft in the user’s own mail client with the case address in CC; once sent it lands back in the timeline.                                                                                                     |
| DingTalk and WhatsApp  | R&D accepts, asks, reassigns and sets ETA from a DingTalk card; messages in named DingTalk groups can be attached to a case in one click. Delivery forwards WhatsApp.                                                                                                        |
| Triage                 | The duty triager acts within 4 working hours (P0) / 1 working day: type, priority, owner, work items. Required: client, site, device SN, firmware / algorithm version, time window, evidence (screenshot, data, test pack). Incomplete cases go back; they do not reach R&D. |
| ETA                    | ETA within 2 working days of accepting a work item; every change needs a reason and is kept in history. Internal ETA and the date committed to the client are separate: the delivery owner sets the committed date.                                                          |
| Visibility             | Internal by default. The delivery owner opens items to the client one by one; the client sees the client-facing title, simple status, committed date, client-visible updates and shared files — never internal comments, internal ETA, R&D names or partner names.           |
| Client update rhythm   | P0 daily, P1 twice a week, P2 weekly; overdue fires R20.                                                                                                                                                                                                                     |
| Closing                | Root cause, category and fix type (release / configuration / on site / client side / no change) are required; linked to the release or configuration change; the result updates the capability matrix.                                                                       |
| Old ticket system      | Open tickets imported once (AI pre-matches them to cases), then read-only, retired after 20 Jan 2027 — no two systems in parallel.                                                                                                                                           |
| Metrics                | Time to first response, time to ETA, on-time rate, ETA slips, reopen rate, complete-information rate, contradictions; weekly per team.                                                                                                                                       |

## 5b. Most frequent cross-team issues in the knowledge base (basis for v0.3)

Keyword classification of 2,440 knowledge-base chunks plus a line-by-line read of 13 project open-item registers (28 Oct). Delivery crosses platform and algorithms most: algorithm + platform 339, platform + hardware 322, network + hardware 319, network + platform 282 (keyword counts, approximate).

| Issue type                            | Examples                                                                                                                                                                  | OCS capability                                                      | Phase   |
|---------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|---------|
| Requirement → ticket has no owner     | NEINVER: nobody translates requirements, Xavier is a single point; Heinemann tickets unread; stand-up “tickets to follow” never confirmed                                 | Cases, duty triage, required fields, SLA                            | V1      |
| Device data disagrees                 | NEINVER counts differ across four sources, batch push failed on 108 devices; Watsons PH unbound; PMI inventory request; Inditex MAC change                                | Device registry reconciliation                                      | V1      |
| Different answers to “can we?”        | Heinemann global filter (“cannot” vs “next release”); continuous-age model only on PMI devices; passer-by counting banned in Germany; Cainz and Erajaya feature questions | Capability matrix + R21 contradiction check                         | V1      |
| Replies owed to clients               | PMI DUAID / heat-map written reply; Erajaya and Logista status questions unanswered; API doc sent to a client without the PM                                              | Client update rhythm, R20, outgoing documents via the PM            | V1      |
| Changes without notice                | Inditex CBox locked by firmware; PMI not told of the DST change; Heinemann asks for a release checklist; Decathlon Amiens changed camera resolution                       | Change calendar, R22 block, client-side change log                  | V1.1    |
| Accuracy and acceptance               | PMI Age Alert 3 of 13 cases, 83.8% duplicates; Heinemann retest; Logista live theft test plan v2                                                                          | Test register (cases, pass marks, results, linked release)          | V1.1    |
| API and data delivery                 | PMI front end vs API, REST test environment HTTP 500, schema docs missing; Heinemann spec gaps; Vstore → Vmall field renames                                              | API contract register (version, consumers, test-environment health) | V1.1    |
| Infrastructure, calibration, security | No EU calibrator, no live video from China; Watsons MY overload; Unifree server unreachable; pen-test scope, IP allowlist, CBox back door to verify                       | Incident board, calibration capacity, security register             | V1.1–V2 |
| Owners missing                        | Aaron and Félix left; no PM on Cainz, Unifree, Erajaya; Platform PM being hired                                                                                           | Owner map, orphan alert, handover checklist                         | V1      |

## 6. Alert rules

| \#  | Rule                                         | Fires when                                                                           | Level |
|-----|----------------------------------------------|--------------------------------------------------------------------------------------|-------|
| R1  | Shipment without SN / MAC                    | Blocked at save (no longer an alert)                                                 | P0    |
| R2  | Not received 3 days after ETA                | In transit and today \> ETA + 3                                                      | P1    |
| R3  | Installed, not calibrated after 7 days       | Installed, no calibration record                                                     | P1    |
| R4  | Store late against plan                      | Actual completion \> planned                                                         | P2    |
| R5  | Invoice-ready, no invoice                    | No invoice 5 working days after G4                                                   | P1    |
| R6  | Duplicate SN / MAC                           | Same SN or MAC in two active records                                                 | P0    |
| R7  | Part A missing                               | Incomplete 10 calendar days after request                                            | P1    |
| R8  | Installation date not agreed                 | PO approved, no date 20 days before planned installation                             | P1    |
| R9  | D−2 final check not passed                   | ≤ 2 working days to installation, IT / static IP / access not confirmed              | P0    |
| R10 | Calibration without written DPIA             | Calibration requested, DPIA evidence missing                                         | P0    |
| R11 | Calibration access about to expire           | \< 6 h of 48-hour access left, not done                                              | P1    |
| R12 | Quote ≠ design                               | Quote count differs from current designs                                             | P0    |
| R13 | Store in two POs                             | Same store in more than one open PO                                                  | P0    |
| R14 | Installed without PO                         | Installation recorded, no PO linked                                                  | P0    |
| R15 | Sensor offline after go-live                 | Offline \> 24 h (device platform)                                                    | P1    |
| R16 | Partner update overdue                       | No partner update 48 h after installation day                                        | P2    |
| R17 | Case not triaged                             | No owner after 4 working hours (P0) / 1 working day (others)                         | P0    |
| R18 | Work item without ETA                        | No ETA 2 working days after acceptance or assignment                                 | P1    |
| R19 | ETA passed                                   | Today \> ETA and not done; delivery owner told on the second slip                    | P1    |
| R20 | Client update overdue                        | Client-visible case with no update: P0 daily, P1 twice a week, P2 weekly             | P1    |
| R21 | Conflicting answers                          | Two different answers to the same question (AI check)                                | P1    |
| R22 | Change to live devices without client notice | Firmware / configuration push to live devices with no client-notice record — blocked | P0    |
| R23 | Message not linked                           | Inbox message untouched for 1 working day                                            | P2    |

P0 same day · P1 within 2 working days · P2 within the week. Every alert has an owner; handling is logged.

## 7. AI functions and guardrails

| Function                                    | What it does                                                                                 | Guardrail                                           |
|---------------------------------------------|----------------------------------------------------------------------------------------------|-----------------------------------------------------|
| Mail / chat extraction                      | Reads project mailboxes and DingTalk groups (read-only), proposes status updates and actions | No data change without approval                     |
| Q&A                                         | "Which Portuguese stores still miss static IPs?" with source links                           | OCS data only, sources shown                        |
| Drafts                                      | Mails to markets / partners, weekly pack text, minutes (EN / 中文 / local)                   | Drafts only; a person sends                         |
| Document intake                             | Floor plans, packing lists, partner reports → proposed fields (count, SN / MAC, dates)       | Low-confidence fields highlighted                   |
| Mail → case matching (v0.3)                 | Matches by thread, case number, client / site / SN mentions; proposes attach or new case     | Low confidence goes to the inbox; a person confirms |
| Case summary and contradiction check (v0.3) | EN / 中文 summary with sources; flags different answers to the same question                 | Sources shown; the owner decides                    |
| Client update drafts (v0.3)                 | English client update from an internal Chinese thread; internal names replaced by team names | Draft only; the user sends from their own mailbox   |
| Check explanations                          | Explains why a quote is blocked and how to fix it; flags odd data                            | Rules decide; AI explains                           |

AI works through the same API and permissions as the user; no access to production databases; EU endpoint, no training on our data; prompts and answers logged.

## 8. Non-functional requirements

| Area                         | Requirement                                                                                                                                                          |
|------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Hosting                      | EU region (Frankfurt or Amsterdam); no client data copied to China; China team via the company network                                                               |
| Security                     | PMI Entra ID SSO, MFA, role and client separation (covered by tests), audit log, penetration test before the PMI portal opens                                        |
| Backup                       | Nightly, 30-day retention, monthly restore test; scheduled client export (Excel / CSV to SharePoint)                                                                 |
| Internationalisation         | EN / 中文; UTC stored, local time shown; plan dates as dates only; store keeps its IANA time zone; amounts in original currency, reports at ECB rate on invoice date |
| Performance and availability | Lists ≤ 2 s, dashboards ≤ 3 s; 99.5% availability; maintenance Sunday 02:00–03:00 UTC                                                                                |
| Not stored                   | Technician names (label or initials only), plain-text passwords, footfall data (stays on the device platform)                                                        |
| Stack (proposed)             | TypeScript (React front end, Node back end), PostgreSQL, object storage, containers; AI coding agents + developer review of every change + CI                        |

## 9. Changes against v0.1

| Topic                   | v0.1                                        | v0.2                                                                                                                          |
|-------------------------|---------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| Demo data               | Generic (40 cameras per store, AIoT-CAM-4K) | Real project data (PMI, NEINVER, Heinemann…), 2–14 G6 / G6S per store                                                         |
| Pilot                   | "Paris 5 stores" (does not exist), 22 Dec   | Parallel pilot on live PMI transition stores from 7 Dec                                                                       |
| Client and partners     | No client role                              | Client portal + partner phone app; partners anonymous to clients                                                              |
| Gates and compliance    | Ends at "acceptance"                        | G1–G5, DPIA, calibration approval                                                                                             |
| Design and quotation    | Not covered                                 | Quotes generated from designs, checked automatically                                                                          |
| Acceptance wording      | Video-stream verification                   | Calibration + accuracy test + accuracy report                                                                                 |
| Device-platform link    | V2                                          | V1 read-only (online, calibration status), full in V1.1                                                                       |
| Communication           | None                                        | Comments, @mentions, one updates feed, actions                                                                                |
| Platform and algorithms | None                                        | Configurations, versions, accuracy, known issues                                                                              |
| Open questions 2–5      | Open                                        | Two-step review; dates without time + store time zone; original currency + ECB rate; e-mail invitation, minimal personal data |
| Name                    | Delivery / Deployment both used             | To be decided (section 11)                                                                                                    |

## 10. Milestones (Leon’s dates kept)

| When           | What                                                                                                                                                                                          |
|----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 28 Oct – 7 Nov | Review this file; Leon turns it into the working PRD v0.2; data model and screens reviewed                                                                                                    |
| 10 Nov         | Scope and UI sign-off                                                                                                                                                                         |
| 10 Nov – 5 Dec | Sprint 1: cases and work items, case mailbox, DingTalk card, old-ticket import, device registry reconciliation. Sprint 2: other V1 modules, capability matrix; import of current PMI trackers |
| 7 Dec          | Internal pilot on live PMI transition stores (Portugal, Switzerland, Spain, Italy December installs), Excel in parallel                                                                       |
| 10 Dec         | V1 feature-complete                                                                                                                                                                           |
| 22 Dec         | Pilot review and fix list                                                                                                                                                                     |
| Early Jan 2027 | Security & data-flow document to PMI IT; penetration test                                                                                                                                     |
| 20 Jan 2027    | Internal go-live for all projects; Excel trackers closed; old ticket system read-only, then retired                                                                                           |
| Feb – Mar 2027 | V1.1: client and partner portals, calibration module, full device-platform link, AI assistant; NEINVER and Watsons onboarded                                                                  |

## 11. Open questions

| \#  | Question                                                                                                                | Who answers           |
|-----|-------------------------------------------------------------------------------------------------------------------------|-----------------------|
| Q1  | Who are the tech lead and the two developers, and from when?                                                            | Hai Tao / Xavier      |
| Q2  | Hosting provider and region (AWS / Azure / Alibaba Cloud EU)?                                                           | Tech lead             |
| Q3  | Keep the name "OCS"?                                                                                                    | Vlad, Leon            |
| Q4  | AI provider and budget for AI coding tools and API use                                                                  | Hai Tao               |
| Q5  | Can the device-platform OpenAPI give online status, calibration status and accuracy-test data? Endpoints and frequency? | Xavier's team         |
| Q6  | How to read mail, DingTalk and WhatsApp (reuse the existing archive tools?)                                             | Leon, Vlad            |
| Q7  | Company mail system (Microsoft 365 / other); who sets up the case address (e.g. cases@ with a per-case sub-address)?    | IT, Hai Tao           |
| Q8  | Old ticket system: name, export (API / CSV), number of open tickets, retirement date                                    | Xavier, platform team |
| Q9  | Who approves the DingTalk internal-app permissions (interactive cards, bot, reading group messages)?                    | Hai Tao               |
| Q10 | Duty-triager rotation; who covers until the Platform PM joins; is Joe the algorithm-side client contact?                | Hai Tao, Song Jun     |
| Q11 | Default visibility: proposed internal by default, opened to the client item by item by the delivery owner — agreed?     | Vlad, Leon            |

**Leon, please:** mark each section agree / change / question and return the working version by 7 November.
