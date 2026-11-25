# Market Input in OCS — design (25 Nov 2026)

Source: `BRT_CVA_VionVision_Market_Input_File_2.xlsx` (PMI / BR Technology, CVA deployment readiness). Parts: A Store Information (31 fields, one row per store), B Technical Readiness (25 fields per store), C Readiness Checklist (B1–B11, at D−20, D−2 and before calibration), plus a single-location variant. Status today: e-mailed Excel (the model for our own template, decision 2 below), returned by e-mail with attachments, read by hand.

Goal: the questionnaire lives in OCS as a **form per store**, filled by the market (link, Excel or e-mail through the AI agent), saved and editable, with missing fields on top; answers and files feed the site record, the installer SOW and the gates; everything stays visible on the site page with history.

## 1. Model — the form is configuration, not code

| Object | What it holds | Notes |
|---|---|---|
| **form_template** | Name, version (PMI MIF v2), scope (base / client / programme / country — same rule as gate templates, D-32), sections and fields | Created and changed only by `director`/`sponsor`; a new version never rewrites answers already given |
| **form_field** (in the template) | Key, label EN/中文, section (A1…A8, B1…B4, C), type (text, email, date, date-window, number, enum, yes/no/TBC, attachment slot, checklist item), required / optional / conditional, who answers (**market** or **Vionvision** — the purple fields), guidance text, due offset (C: D−20, D−2, before calibration) | Conditions from the file: PoE = Yes → switch model and provider required, otherwise locked; Access Requirements entered once per store |
| **form_request** | One per store (site) and template version: sent to (market contacts), due date, status, current revision | Status: Not started → In progress → Ready for submission → Submitted → **Reviewed** / **Returned** (with the fields to fix) → **Changed — review needed** (after any edit to a submitted form) |
| **form_revision** | Revision number, frozen snapshot (PDF/XLSX + answer set), submitted by, time, changed fields with reason | Archive of every submission and later change; never overwritten |
| **form_answer** | Field, value, answered by, **source** (market link / Excel import / mail via AI agent / staff), time, superseded answer kept | Every change is audited (one write path); the latest value is shown, history on click |
| **attachment** | Slot (floor plan, ceiling plan, photos, network/IT info, other), file in EU object storage, hash, version, uploader, source mail/message | Type and size allow-list, virus scan, never inline in the DB (03 §7); SOP-DEL-02 folder number recorded for the later DingTalk Drive link |
| **form_comment** | Per field: "Comment from market" / "Comment from Vionvision" | Same as the two comment columns in the file; @mention turns into an action (E5) |

**Field gaps in PMI MIF v2, added to the Vionvision template v1:**

| Gap in the PMI file | Added field(s) | Required | Per store / common |
|---|---|---|---|
| Contacts have name and e-mail only, no phone | **Phone (mobile, WhatsApp yes/no)** for PMI key contact, store on-site contact, financial contact and network/IT contact | Yes for on-site and network/IT contact; optional for the others | On-site: per store; others: common allowed |
| No contact person for the visit itself (only in Part C B3, text) | **Store access contact** — person who opens the store and handles the alarm on the installation day: name, mobile, language; moved from the Part C checklist into Part A as fields | Yes (by D−2) | Per store |
| No opening hours | **Store opening hours** (Mon–Sun, from–to, local time) and **Installation allowed** (outside hours only / during hours / night window from–to) | Yes | Per store |
| Mall / landlord rules only as free text | **Mall or landlord registration lead time** (days) and **landlord contact** (name, e-mail, phone) | If the store is in a mall | Per store |

Store identity: a request is opened for an OCS site (Project ID). A market row without a site yet creates a **site proposal** (client, country, city, store ID, name) that the PM accepts — the store ID from PMI is kept as the client's external ID.

## 2. Collecting the answers — three channels, one record

1. **Country link (main channel, decided 25 Nov).** One link per client × country (e.g. PMI · Poland), because one market team usually fills all its stores at once. The link opens the country's batch: every store of the rollout, the instructions and guidance, and the forms. The market team fills, saves, comes back, uploads files from phone or PC, and can **add a store** (becomes a site proposal the PM accepts). Access: a **country-scoped form token** — this client and country only, write answers and files of its stores, read its own answers and the Vionvision comments addressed to the market; nothing else in OCS. Each person enters name and e-mail on first use and confirms a one-time code sent to that e-mail, so every answer is audited under a named person, not under the link. Expiry date (end of rollout + 30 days), revocable and re-issuable by the PM, rate-limited. This is the first external access to OCS: security review of 03 §7 scoped to this capability before the first link goes out (smaller than the full client portal of V1.1).
2. **Excel export (record and fallback only).** The submitted batch can be exported as a PMI-style workbook for the client's own record; an Excel returned by a market that cannot use the link goes through the import framework (E10) with dry-run diff and PM confirmation. Not the normal path.
3. **Mail / WhatsApp through the AI agent.** Answers and attachments sent in a mail or chat are extracted by the agent into **proposed answers** and attachment slots, linked to the source message; the PM confirms (trust level: proposal; 08-ai-and-mcp). Attachments are classified into slots by the agent (floor plan vs photo), confirmable.

All three end in the same `form_answer` rows with their source, so the record shows who said what, where and when.

## 3. How the form looks and behaves

- **Missing first.** Sections stay in order, but inside the form view fields are grouped: **Required and missing** (top, highlighted) → **Optional and missing** → **Answered** (collapsed at the bottom, one line each, expandable). A field moves down the moment it is saved; a field the PM returns moves back to the top with the reason.
- **Autosave** per field; "Ready for submission" only when no required field is missing (conditional rules applied); "Submit" freezes a snapshot (PDF/XLSX for the client's record).
- **Editing after submission.** A submitted (or reviewed) form stays editable by the market through the link and by staff; nothing is locked forever, because stores change (new date, new contact, new IT rules). Rules:
  - Each change after submission asks for a short **reason** (optional for the market, required for staff) and creates a new **revision** of the form: R1 = first submission, R2, R3… Each revision keeps its frozen snapshot (PDF/XLSX); the previous snapshot is never overwritten.
  - The store's **change log** (archive) shows every changed field: old value → new value, who (named person or agent with the person it acts for), when, channel, reason. Changed fields carry a "changed after submission" marker until the PM acknowledges them.
  - A change after submission sets the store to **Changed — review needed**, notifies the PM, and re-checks the derived records: if it touches the installation date, contacts, opening hours, IT/ports or readiness items, the site lifecycle, readiness gate and installer SOW are flagged for re-confirmation (a booked installer is never silently changed).
  - "Fill for all open stores" does not touch submitted stores unless the user ticks them; when ticked, each one gets its own revision and log entry.
  - From D−2 a change to a readiness item reopens the go/no-go.
- **Progress**: "17 of 24 required", per section and per store; same colour legend as the PMI file (market input, Vionvision input, completed, missing).
- **One tab per store.** The country page has a tab for every store of the batch (store name, status dot, "x of y required"); each tab is that store's full form with its own missing-first order, files and checklist. A **Batch grid** tab (one row per store, missing cells highlighted) gives the overview — the same view as the Excel, but live.
- **Fill for all open stores.** Any field can be filled once for every store at once when the answer is common (PMI key contact, financial contact, network/IT contact, static IP policy, cable category, power solution, access rules of the market, preferred installation window, attachments such as the market's network/IT information). Rules:
  - The action shows the target list before saving: by default all **open** stores of the batch (not Submitted/Reviewed); the user can untick stores.
  - Stores that already have a **different** value are listed separately and are not overwritten unless the user ticks them one by one.
  - Each store gets its own answer row with source "applied to all by <name>"; after that the value is per store and can be changed in that store's tab only.
  - Store-specific fields (Store ID, name, address, ZIP, store type/size, on-site contact, opening hours, ceiling constraints, free ports, photos and floor plan) are marked **per store** in the template and have no "fill for all".
- **Instruction text for the market** (country page intro): "Each store has its own tab. If an answer is the same for all stores — for example the market contacts, the IT rules or the installation window — use *Fill for all open stores* on that field: it fills every store that is not submitted yet and never overwrites a store where you entered something different. You can still change the value in any single store afterwards. Fields that differ by store (address, opening hours, on-site contact, ceiling, photos) must be filled in each store's tab. A submitted store can still be updated at any time: change the field, add a short reason, and the change is recorded and sent to your Vionvision project manager — please do this as soon as a date, contact or IT detail changes."
- **Checklist (Part C)** appears per store with its own dates: D−20 items (installation date, permits), D−2 items (access, cables, switch, static IPs, internet, IT contact on the day, equipment received, ladder), before calibration (DPIA). Each item needs a Yes plus evidence (photo or written confirmation) — not just any text, as in the Excel.
- **Instructions inside the form, not in a separate tab.** The "How to fill out" sheet becomes: a short intro on the country page (purpose, what is needed by when, who to contact), section intros, and per-field guidance shown next to the field (expected format, example, why it matters — e.g. "Why the IT points matter" from Part C). Legend and colours are the form's own states, not a key to read.
- **Country page** = the batch: list of stores with status and "x of y required", deadline per store (D−20 / D−2 from the planned date), what is missing across all stores, upload area per store.
- EN / 中文 interface for staff; market link in English (template labels per language where the client provides them).

## 4. What the answers drive (no double entry)

| Answer | Goes to |
|---|---|
| Address, store type, size, classification, contacts | Site record (E1) and contacts; client contacts stay client-visible, never sent to installers except the on-site contact |
| Expected opening / installation date, preferred window | Proposed installation date in the site lifecycle (E3) — still blocked until the Handover Card is complete (SOP-DEL-04 §1) |
| Static IP, PoE, ports, bandwidth, cable category, ceiling constraints, power | Installation mode (partial / full on-site) and the **installer SOW** site page (N1); "Additional switch required" (Vionvision field) → action for the PM |
| Attachments | Site files (floor plan for sensor positions, photos for the SOW, network info for IT sheet) |
| Part C D−20 / D−2 items | **Readiness gate** of the PMI template (C3): installer booking and go/no-go blocked until passed |
| DPIA (B11) | **DPIA gate**: install allowed, calibration blocked without written confirmation (C2) |

## 5. Visibility

| Who | Sees |
|---|---|
| Delivery staff | Everything on the site page: tab **Market input** (form, history, files, comments), plus the portfolio column "Market input: x/y required, status" |
| Market contact (link) | Only its own request(s): fields, own answers, files it uploaded, Vionvision comments addressed to the market |
| Installer (partner) | Only the technical subset and the files needed for the job (layout, ceiling plan, photos, on-site contact, access requirements) — never financial contact, never other stores |
| Client portal (V1.1) | Submitted forms and status for the client's own stores |
| AI agents | Same rights as the person they act for (D-07, D-33) |

Personal data (names, e-mails) is client data in EU storage, under RLS per client, not written to logs.

## 6. Alerts (rules for domain/rules.md)
- Request not started 3 working days after sending; required fields missing at D−20; readiness items missing at D−2 → go/no-go "no"; DPIA missing when calibration is requested; attachment slot "To be provided" past its promised date; returned form not corrected in 2 working days.

## 7. Slices
| Slice | What |
|---|---|
| MI-1 | `forms` module: template, request, answer (with source and history), comment; **Vionvision Market Input template v1** seeded from PMI MIF v2 (all fields, guidance and checklist), with instructions as form text; staff form view with missing-first ordering, autosave, conditions, progress |
| MI-2 | Attachments: EU object storage, slots, allow-list, virus-scan hook, versions; site Files tab |
| MI-3 | AI agent intake: proposed answers and attachments from mail/WhatsApp with PM confirmation (tools from the registry, D-33) |
| MI-4 | Derivations to site, lifecycle (readiness and DPIA gates), installer SOW page; alerts |
| MI-5 | Country link: country page with one tab per store, batch grid, **fill for all open stores** (with the no-overwrite rule), add-store proposal, country-scoped token with named contributors (e-mail one-time code) — after the scoped security review |
| MI-6 | Submit snapshot PDF/XLSX for the client's record; editing after submission with revisions (R1, R2…), change log with reason, "Changed — review needed" status and re-check of derived records; Excel fallback import |

## 8. Decisions (Vlad, 25 Nov 2026) — recorded as D-37
1. **Access per country:** one link per client × country; the market team fills all its stores through it. Contributors are named by e-mail one-time code; the link is scoped, expiring and revocable; scoped security review before the first link.
2. **Template:** the PMI Excel (MIF v2) is the model, not the master. OCS holds the **Vionvision Market Input template** for all future rollouts; instructions, guidance, data and attachments arrive only through our link. Excel is export/fallback.
3. **Per-store tabs plus "fill for all open stores"** for common answers, explained in the market instructions; added fields: contact phones, store access contact, opening hours and installation-allowed hours, mall registration lead time and landlord contact.
4. **Submitted forms stay editable** by the market and staff; every change after submission creates a revision with its snapshot, is logged in the archive (old → new, who, when, channel, reason), sets "Changed — review needed" and re-checks the derived site, gate and SOW records.
