# Case and work-item rules (basis for SOP-DEL-05, draft)

Status: agreed direction with Vlad (29 Oct). SOP-DEL-05 still has to be written and agreed with platform, algorithm and firmware leads and Hai Tao before the pilot. Until then, treat these as the spec for E6/E7 and keep every rule as configuration so the SOP can tune numbers without code changes.

## Objects

- **Case** `CS-nnnn` — the client-facing problem or request. Fields: client, project/site, devices, type (bug, data, feature, configuration, hardware, network, infrastructure, question), priority P0–P2, accountable owner (delivery), status, internal ETA (derived), committed client date (manual), client-facing title, visibility, root cause + category + fix type (on close).
- **Work item** — `ALG-`, `PLT-`, `FW-`, `DEL-`, `TST-` numbers; one team, one owner, ETA, status, link to release/config change.
- **Message** — mail, DingTalk, WhatsApp (forwarded), portal, comment; original text, thread id, sender, visibility, match confidence.

## States

Case: New → Triaged → In progress → Waiting (client / partner / other team) → Fix ready → Verifying → Resolved → Closed (root cause required).
Work item: Open → Accepted → In progress → In review / test → Done; side states Needs info, Rejected (reason required).

## Rules

| Topic | Rule |
|---|---|
| One problem = one case | Internal tasks are work items; case ETA = latest ETA among blocking work items |
| Mail in | Subject tag `[CS-nnnn]` or Project ID + known thread → attach automatically; otherwise inbox with AI suggestion; a person confirms |
| Mail out | OCS never sends to clients; draft in the user's mailbox with tag + case address in CC; sent copy lands back in the timeline |
| DingTalk | R&D accepts, asks, reassigns, sets ETA from a card; messages in named groups attachable in one click |
| Triage | Duty triager (one each from delivery, platform, algorithms, rotating) within 4 working hours (P0) / 1 working day; required fields: client, site, device SN, firmware/algorithm version, time window, evidence. Incomplete → back to reporter, not to R&D |
| ETA | Set within 2 working days of acceptance; every change needs a reason; history kept |
| Two dates | Internal ETA (R&D) ≠ committed client date (delivery owner, with buffer) |
| Visibility | Internal by default; delivery owner opens items one by one. Client sees client-facing title, simple status (Received / Investigating / Fix in progress / Waiting on you / Resolved), committed date, client-visible updates, shared files — never internal comments, internal ETA, R&D names, partner names |
| Client update rhythm | P0 daily, P1 twice a week, P2 weekly |
| Closing | Root cause, category, fix type (release / configuration / on site / client side / no change); linked change; updates the capability matrix |
| Old tickets | Imported once with AI pre-matching, then read-only; retired after go-live |
| Metrics | Time to first response, time to ETA, on-time rate, ETA slips, reopen rate, complete-information rate, contradictions — weekly per team |
