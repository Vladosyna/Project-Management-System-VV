---
project: company
doc_id: company-change-management-sop
doc_type: process
status: draft
last_updated: 2026-09-10
sources: [dingtalk-songjun-vlad-mac-sop-2026-09-10, vlad-standing-instruction-2026-09-10]
---

# Company — Change Management SOP (client-site devices) + Problem Case Log

## Why this exists

Trigger: the Inditex (Zara Men) CBox lock of July 2026, after a firmware push went out without the client-approval step being confirmed first. Vladyslav asked for two things, 10 September 2026: a simple, reusable instruction for this class of change, and corresponding edits to the company's interaction/reporting norms (`05-communication-norms.md` §3–4). This file is meant to be the first entry in a growing library — new problems get added to the Case Log below in the same shape, not written up from scratch each time.

## Part 1 — SOP: any change to a device already live at a client site

**Scope:** firmware updates, remote configuration pushes (MAC/DHCP/network settings), Mesh/remote-access commands, physical swaps or reflashes — anything that touches a device already deployed at a client's site, whether pushed remotely or done on-site.

### Before

1. **Notify the client / get approval** — tell them what will change and when, before it happens, unless their contract already delegates this to VionVision (confirm case by case, don't assume). Same underlying principle as `05-communication-norms.md` §2 (advance notice for site visits): don't touch what's theirs without warning.
2. **Internal sign-off** — the change has been tested/reviewed and has a named owner.
3. **Rollback plan** — know how to undo it, and how you'll tell if it failed, before starting.
4. **Timing** — avoid the client's night hours for anything that could take a device offline (`05-communication-norms.md` §1); avoid pushing right before a period you know you can't reach them (e.g. a client's holiday shutdown).

### During

5. Execute the change.
6. **Confirm success actively — never by assumption.** An on-site check or a platform-log confirmation, not "no complaints yet." The Inditex device sat unconfirmed and offline for weeks precisely because this step was skipped — see Case 1 below.

### After

7. **Log the change** — changelog/version, date, who — somewhere retrievable (the project's own timeline file, or a per-device log).
8. **Close the loop with the client** if the change was visible to them, or if you'd committed to telling them once it landed.

### If it breaks — incident branch

9. **Escalate internally before any client-facing reply.** Currently: Leon Zhao for delivery-side technical incidents. Don't self-authorise the client-facing explanation.
10. **Send a holding reply fast anyway**, even without a full answer — get it cleared too, but don't let "no answer yet" become "no reply at all." See `05-communication-norms.md` §4.
11. **Once root cause is confirmed, add it to the Case Log below** (or the project's own files) so the same failure mode is recognisable next time.

## Part 2 — Case log

Each entry: Problem / Root cause / Resolution / Standing rule added. Keep entries short — full detail stays in the project's own files.

### Case 1 — Inditex (Zara Men): CBox locked after an unnotified firmware update (Jul 2026)

- **Problem:** a firmware push meant to fix a MAC-address-instability bug caused the CBox at the Inditex PoC site to go offline mid-upgrade; it stayed locked/unreachable for weeks. Inditex is demanding the device back to verify the firmware meets their network security standards before it returns to the store.
- **Root cause:** the update went out via Mesh without confirming the client-approval step had actually happened (it should have, per the 15 Jul 2026 internal plan — Song Jun: "由于某种原因没申请", for some reason it wasn't submitted at the time). No on-site or log-based confirmation that the push had succeeded before the team moved on. Full detail: `inditex/00-overview.md`, `04-timeline.md`, `02-security-and-architecture.md`.
- **Resolution (in progress as of 10 Sep 2026):** MAC address to be supplied to Inditex (pre- or post-upgrade — unreconciled, `inditex/03-open-items.md` item 1); any client-facing reply cleared with Leon Zhao first; a v6.32-relative firmware package with the fix, tested internally, before any redeployment (`inditex/03-open-items.md` item 11).
- **Standing rule added:** this SOP (Part 1), plus `05-communication-norms.md` §3.
- **Not the first time on this account:** a 2024 security audit already found five vulnerabilities here; the fix approach then — repair in-house, ship ready units, never remote-fix the live device — is the more conservative default worth reusing on demanding accounts. See `inditex/02-security-and-architecture.md`, "Key lessons."

## Ownership

Per Song Jun (DingTalk, 10 Sep 2026): the SOP itself is **Leon Zhao's** to own and finalise. This file is Vladyslav's working draft for that discussion, not yet a signed-off company policy — update `status` above once Leon has reviewed it. See `company/03-open-items.md` item 10.
