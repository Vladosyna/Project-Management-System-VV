# OCS user guide

How to use OCS today: what is there, where to click, who may do what. Button and menu names are exactly as on screen (English UI; switch to 中文 with the language button top right).

> Kept current with every new feature — see "Keeping this guide current" at the end. Last updated: 21 Nov 2026.

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
| Projects, Platform & algorithms, Cases, Commercial, Client portal, Partner app, Knowledge | Not built yet — they show "This screen arrives with its epic" |

## 3. A project (site) page

Open **Sites** → click the Project ID (e.g. `CLIENTA-ES-MAD-001`). Tabs across the top:

### Overview
Tiles with the key numbers; click a tile to open its tab: **Stage** (last step, next gate, planned installation, readiness warning), **Devices** (count, offline, firmware issues), **Switches with offline devices**, **Open actions**, **Last visit**, **Offline alerts** (on/off, linked to the platform or not).

### Intake — the Handover Card (SOP-DEL-01)
- **Sales**: fill **Project name**, **Project type**, the two package questions, and every checklist item A1…G1: **Provided** (with a summary or folder link) or **N/A** (a reason is required). Group F items (verbal commitments, concessions, relationships) are only marked as recorded in the restricted notes — their text never goes on the card.
- The screen shows **Still missing before submission: …** until nothing is missing. **Save draft** any time; **Submit for intake review** when complete. A submitted card is read-only.
- **Sponsor** (before acceptance): **Conditional Start** — tick the missing items, set a deadline (within 5 working days), give the DingTalk reference → **Authorise Conditional Start**.
- **Delivery Director** (submitted card): **Decision** (Accepted / Accepted with conditions / Returned), folder standard, gaps or reasons; for conditions **Add condition** (item, what is missing, deadline within 5 working days) → **Record decision**. Items A1, A4, A6, C2, D1, F1 can never be conditions — OCS refuses and says why. Expired conditions create an action for the Sales owner and the director automatically.

### Lifecycle (SOP-DEL-04)
The base steps (card received → card complete → readiness confirmed → go/no-go → installed → accepted) and the project's gates with dates and evidence. **Record a step**: pick the **Step**, **Date**, evidence → **Record step**. **Planned installation** → **Set installation date** (only after "card complete"). A readiness warning appears when the installation is near and readiness is not confirmed.

### Devices
Every device with serial, model, platform status, offline since, channels/gates, firmware. **Register device** by **Serial** and **Model**; tick devices → set **Firmware** / algorithm → **Save versions**. Known firmware problems are shown on the affected devices (R&D records them with **Record problem**).

### Network
Devices grouped by switch and port, with offline counts per switch. Shown when switches are recorded.

### Actions
Open actions of this project with owner and due date.

### Timeline
Everything that happened, newest first, each with its source. **Comment** → **Add comment** (tick people to @mention them). **Make it an action** on a comment → owner, **Due date** → **Create action**. **Record a visit** → attendees, summary, decisions, coverage, action items → **Save visit record** (a shortfall needs a reason).

### Settings
**Mall on the device platform** and **Offline alerts** (only with a linked mall) → **Save**.

## 4. Actions & alerts
All open actions in columns, with owner, due date and source (comment, visit, alert). **Mine** filters to yours. Alerts (device offline > 24 h, device lists not matching the platform, expired intake conditions) arrive here as actions automatically.

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
| Sales | Fill and submit Handover Cards; record lifecycle steps; comment |
| PM | Register devices and versions, record steps, set installation dates, comments, visits, turn comments into actions, device settings |
| Director | Intake decisions, gate templates, everything a PM does, invite people |
| Sponsor | Conditional Start, gate templates, Intake Register |
| R&D | Register devices and versions, record firmware problems, visits, comments |
| Admin | Invite people, AI connections — no project work |

The full list is generated from the code: `docs/ocs/permission-matrix.md`.

---

## Keeping this guide current
Every PR that adds or changes something a person sees or does updates this guide in the same PR: the screen, the button names exactly as in `packages/i18n/src/catalog/en.ts`, who may use it. Describe only what is merged and working — never planned features as if they existed (`docs/ocs/12-ai-agents.md`, Part B).
