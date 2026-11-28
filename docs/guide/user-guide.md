# OCS user guide

How to use OCS today: what is there, where to click, who may do what. Button and menu names are exactly as on screen (English UI; switch to 中文 with the language button top right).

> Kept current with every new feature — see "Keeping this guide current" at the end. Last updated: 26 Nov 2026.

---

## 1. Getting in

**First time (invitation only).** There is no self sign-up. An admin or director invites you; you get a link.
1. Open the link → enter **Your name** and a **Password** (at least 12 characters) → **Create account**.
2. **Set up two-factor authentication**: enter your password → **Continue** → scan the QR code with an authenticator app (Google/Microsoft Authenticator, 1Password…) → type the 6-digit **Code from your authenticator app** → **Confirm**.

**Every day.** **Sign in** with email + password, then the 6-digit code. Or **Sign in with a passkey** (fingerprint / face / device PIN) once you have added one.

Your name and role are shown bottom left. **中文** (top right) switches the language.

## 2. The left menu

| Menu | What it is |
|---|---|
| **Home** | Your start page |
| **Portfolio** | All clients and their projects (Project IDs) you may see |
| **Sites** | List of projects/sites → click a Project ID to open it (section 3) |
| **Intake Register** | Every Handover Card submission (section 5) — director, sponsor, management |
| **Actions & alerts** | Every open action with owner and due date; **Mine** shows yours |
| **AI agents** | AI assistants you connected to OCS (section 7) |
| **Admin** | Gate templates; AI connections (section 6) |
| **Commercial** | Commercial status of all projects; click a Project ID for details (section 3, Commercial) |
| Projects, Platform & algorithms, Cases, Client portal, Partner app, Knowledge | Not built yet — they show "This screen arrives with its epic" |

## 3. A project (site) page

Open **Sites** → click the Project ID (e.g. `CLIENTA-ES-MAD-001`). Tabs across the top:

### Overview
Tiles with the key numbers; click a tile to open its tab: **Stage** (last step, next gate, planned installation, readiness warning), **Devices** (count, offline, firmware issues), **Switches with offline devices**, **Open actions**, **Last visit**, **Offline alerts** (on/off, linked to the platform or not).

### Intake — the Handover Card (SOP-DEL-01)
- **Sales**: fill **Project name**, **Project type**, the two package questions, and every checklist item A1…G1: **Provided** (with a summary or folder link) or **N/A** (a reason is required). Group F items (verbal commitments, concessions, relationships) are only marked as recorded in the restricted notes — their text never goes on the card.
- The screen shows **Still missing before submission: …** until nothing is missing. **Save draft** any time; **Submit for intake review** when complete. A submitted card is read-only.
- **Sponsor** (before acceptance): **Conditional Start** — tick the missing items, set a deadline (within 5 working days), give the DingTalk reference → **Authorise Conditional Start**.
- **Delivery Director** (submitted card): **Decision** (Accepted / Accepted with conditions / Returned), folder standard, gaps or reasons; for conditions **Add condition** (item, what is missing, deadline within 5 working days) → **Record decision**. Items A1, A4, A6, C2, D1, F1 can never be conditions — OCS refuses and says why. Expired conditions create an action for the Sales owner and the director automatically.
- **Dispute of a return** (SOP-DEL-01 §9): when the card is **Returned**, Sales can disagree once: **Why the return is wrong** → **Dispute this return**. The sponsor decides within 2 working days (the date is shown): optional **Note on the decision** → **Uphold the return** or **Overturn the return**. While the dispute is open, a Conditional Start is refused. After an overturn the card is accepted at once (a newer draft is archived).

### Lifecycle (SOP-DEL-04)
The base steps (card received → card complete → readiness confirmed → go/no-go → installed → accepted) and the project's gates with dates and evidence. **Record a step**: pick the **Step**, **Date**, evidence (folder path or document name) → **Record step**. Steps go in order. **Accepted** needs its acceptance evidence: the Installation Acceptance Form (standard S) or the Acceptance Certificate (standard L) — without it OCS refuses the step. **Planned installation** → **Set installation date** (only after "card complete"). A readiness warning appears when the installation is near and readiness is not confirmed.

### Devices
Every device with serial, model, platform status, offline since, channels/gates, firmware. **Register device** by **Serial** and **Model**; tick devices → set **Firmware** / algorithm → **Save versions**. Known firmware problems are shown on the affected devices (R&D records them with **Record problem**).

### Network
Devices grouped by switch and port, with offline counts per switch. Shown when switches are recorded.

### Actions
Open actions of this project with owner, due date and an overdue mark. **New task**: **Task**, **For whom** (any staff member), **Due date** → **Create task** — the person sees it under **Actions & alerts → Mine**. **Done** closes a task: its owner, a director or a PM may do it.

### Timeline
Everything that happened, newest first, each with its source. **Comment** → **Add comment** (tick people to @mention them). **Make it an action** on a comment → owner, **Due date** → **Create action**. **Record a visit** → attendees, summary, decisions, coverage, action items → **Save visit record** (a shortfall needs a reason).

### Commercial (D-34 N2)
Client PO, DPIA, client invoice and price-list price of the project (staff only). **Add a record**: pick the **Record**, its **Status**, **Number** (PO and invoice), **Date**; for an amount give **Amount** in the original currency, **Currency (ISO code)** and, for any currency except EUR, **Rate: EUR per 1 unit** → **Save record**. OCS keeps both the original amount and the EUR value with the rate and date. What you enter is confirmed by you at once; what an AI assistant enters shows **Proposed by AI — confirm** until a person clicks **Confirm** (an assistant can never confirm). **Archive** removes a wrong record from the list; it is kept in the history.

The left-menu **Commercial** page shows every project at once: client POs (count and EUR), invoiced, paid, DPIA, price-list price and AI proposals waiting. Click a **Project ID** to open that project's Commercial tab.

### Installers (D-34 N1)
Installer jobs of the project (staff only), each with its quotes **cheapest first in EUR** — the quote comparison. A quote an AI assistant entered shows **Confirm**; a person confirms it. **CEO approval of the chosen quote**: pick the **Chosen quote** (confirmed quotes only), give the **Approval reference** (DingTalk OA or message) and **Approved on** → **Record approval**. OCS needs two comparable quotes from different installers on the same SOW; with only one, give the **Reason** (supplier rule P-12). Then **Next status**: **Scheduled** (with the installation date), and after the visit **Done**, **Attended — site not ready** (say what was not ready) or **Cancelled** → **Save status**. **New installer job**: **Scope**, **Sensors**, **SOW version** → **Create job**. **Add a quote** on a job: **Installer**, one row per line (**Line type** per unit / per hour / travel / extra, **Description**, **Quantity**, **Unit price**; **Add line** for more), **Currency** and, unless EUR, the **Rate**, **Quote date** → **Save quote** — OCS adds up the lines exactly and shows the EUR value. An AI assistant can enter the same quote from an installer's mail or PDF; it then waits for your **Confirm**. While a job is being quoted, a confirmed quote whose per-hour lines add up to more than the time standard (partial: sensors + 2 h, full: 2 × sensors + 2 h) raises an action for the PM — R29; it goes away once the quote is replaced or archived, or the approval is recorded.

### Settings
**Mall on the device platform** and **Offline alerts** (only with a linked mall) → **Save**.

## 4. Actions & alerts
All open actions in columns, with owner, due date and source (comment, visit, alert). **Mine** filters to yours; **Done** on a card closes it (owner, director or PM). Alerts (device offline > 24 h, device lists not matching the platform, expired intake conditions; installation within the readiness window (template days, e.g. D−2) without readiness confirmed — R9, to the PM; an installed project without a confirmed client PO or approved DPIA; an accepted project without a confirmed client invoice after 5 working days — R5, to the PM; a project without a PM — sent to the directors) arrive here as actions automatically, and go away by themselves once the gap is closed.

## 5. Intake Register
One row per submitted card version: Project ID, submitted, decision, decided, returns, working days to acceptance. **Month of submission** filters; **Export CSV** downloads what is shown — for the monthly review with the Sales Lead.

## 6. Admin
- **Gate templates** (director, sponsor): which gates projects pass. Pick the scope — all projects, a client, or a client in one country — add, name, reorder (↑ ↓) and remove gates → **Save template**. **Edit** / **Archive** existing ones. The most specific template applies; steps already recorded never change.
- **AI connections** (admin, once per installation): **Create the token-check client** → copy the two values shown once into the secret store, restart the API. Then OCS checks every AI agent token strictly and the audit names the agent.

## 7. Using AI with OCS (ChatGPT, Claude, Copilot…)
An AI assistant can read and change OCS **as you** — with exactly your permissions, every change recorded under your name ("via AI").
- **Connect**: in the assistant, add OCS as a connector / MCP server with the address `https://<your OCS address>/mcp` (platforms without MCP: import `https://<your OCS address>/api/v1/openapi.json`). The assistant opens the OCS sign-in → sign in as usual (with your code) → **Allow**.
- **See and disconnect**: menu **AI agents** → **Disconnect** next to an assistant. It stops working at once.
- **Rules the assistant gets**: say only what OCS returned, never invent IDs, dates or names, ask you before changing a status, date or owner, never send anything to a client, never delete. If OCS refuses (permission or an SOP rule), the assistant tells you why.

## 8. Who may do what (short)
| Role | Typically |
|---|---|
| Sales | Fill and submit Handover Cards; dispute a return; record lifecycle steps; comment |
| PM | Register devices and versions, record steps, set installation dates, comments, visits, turn comments into actions, device settings |
| Director | Intake decisions, gate templates, everything a PM does, invite people |
| Sponsor | Conditional Start, decide intake disputes, gate templates, Intake Register |
| R&D | Register devices and versions, record firmware problems, visits, comments |
| Admin | Invite people, AI connections — no project work |

The full list is generated from the code: `docs/ocs/permission-matrix.md`.

---

## 9. Coming — planned features

Each section below is a placeholder for a feature on the roadmap (`docs/ocs/05-roadmap.md`). **Planned — not available yet** means exactly that: it is not in OCS today. When a feature ships, its placeholder is replaced by real instructions (screen, buttons, who may use it) in the same PR, and it moves up into the sections above. Targets are the roadmap's, not promises.

### 9.1 Projects (menu **Projects**) — Planned — not available yet
Client → programme → country → city → project hierarchy (SOP-DEL-02), Project IDs `CLIENT-CC-CITY-NNN`, folder standard L/S per site and changing it; partners with their client-facing label (Partner A/B/C). *Target: pilot / January.*

### 9.3 Handover Card — full Annex B sections — Planned — not available yet
Stakeholders, commercial details, communication rules, open items and the change log as form sections, in addition to today's checklist. *Target: pilot.*

### 9.4 Device import — Planned — not available yet
Import devices from Excel/CSV with a dry-run preview of what would change, safe to run twice; source records per device (packing list, as-built, platform) for reconciliation. *Target: January.*

### 9.5 Cases (menu **Cases**) — Planned — not available yet
One case per problem (`CS-nnnn`) from the first email to the fix: owner, priority, internal ETA and committed client date, work items per team with ETAs (a reason is required to change one), a timeline of messages and changes, a client-facing title and view, and closing with root cause and fix type. *Target: pilot / January.*

### 9.6 Mail intake — Planned — not available yet
The case mailbox is read automatically; emails attach to their case or wait in an inbox for a person to confirm (attach / new case / action / not a case). Client replies are prepared as **drafts in your own mailbox** — OCS never sends. *Target: January.*

### 9.7 More alerts — Planned — not available yet
More automatic checks (domain rules R5–R23) arriving as actions with owner, level and due date, run hourly. *Target: pilot → January.*

### 9.8 DingTalk notices and cards — Planned — not available yet
Work notices to the person assigned (new work item, ETA due, alert) with a link to OCS; later interactive cards (accept / ask / reassign / set ETA) for R&D. Staff only, never clients. *Target: pilot (notices), January (cards).*

### 9.9 Imports of existing trackers — Planned — not available yet
Existing project trackers, the quote register and device lists brought in as actions/cases with their source, after a preview and the PM's confirmation; credentials found in sources are dropped. *Target: pilot.*

### 9.10 Reports — Planned — not available yet
The Monday pack per project exported from OCS data; the Intake Register monthly report. *Target: pilot.*

### 9.11 AI assistant inside OCS — Planned — not available yet
A central AI agent that reads the case mailbox and DingTalk messages and **proposes** (matches, summaries, ETAs found in text) for a person to accept, edit or reject. *Target: January.*

### 9.12 Knowledge and capability matrix (menu **Knowledge**) — Planned — not available yet
What each device/algorithm can do, maintained by hand; links to documents in DingTalk Drive. *Target: January.*

### 9.13 Platform & algorithms (menu **Platform & algorithms**) — Planned — not available yet
Algorithm and firmware views across projects; calibration queue and accuracy-test register. *Target: January → V1.1.*

### 9.14 Quotes and margin (menu **Commercial**) — Planned — not available yet
Quote generator from the point design; later margin per project and the accounting (Kingdee) link. *Target: V1.1 → V2.*

### 9.15 Client portal (menu **Client portal**) — Planned — not available yet
Clients see their own projects and cases (client-visible items only, partners anonymous), with their own accounts and MFA, after an independent security review; site information forms (CIP-S/CIP-L) by link. *Target: V1.1.*

### 9.16 Partner app (menu **Partner app**) — Planned — not available yet
A phone app for installation partners (their assigned work only). *Target: V1.1.*

### 9.17 Change calendar — Planned — not available yet
Planned changes with a client-notice gate (rule R22) before anything client-affecting happens. *Target: V1.1.*

### 9.18 Service monitoring and client reports — Planned — not available yet
Hypercare monitors (data gaps, spikes, time shifts), a monthly client service report, decommissioning with a data-deletion record. *Target: V2.*

---

## Keeping this guide current
Every PR that adds or changes something a person sees or does updates this guide in the same PR: the screen, the button names exactly as in `packages/i18n/src/catalog/en.ts`, who may use it. Describe only what is merged and working — never planned features as if they existed. When a planned feature ships, replace its placeholder in section 9 with real instructions and move it into the sections above (`docs/ocs/12-ai-agents.md`, Part B).
