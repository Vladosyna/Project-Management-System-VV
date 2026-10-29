---
project: company
doc_id: company-communication-norms
doc_type: process
status: active
last_updated: 2026-09-18
sources: [whatsapp-wesley-vlad-comms-rule-2026-09-10, vlad-standing-instruction-2026-09-10, voice-call-xavier-2026-09-10, whatsapp-bridge-felix-vlad-dm-2026-09-10, dingtalk-minutes-xavier-2026-09-11, dingtalk-bridge-haiwaijiaofuguanli-2026-09-14, dingtalk-wesley-dm-full-read-2026-09-16, dingtalk-minutes-api-audit-2026-09-17, vlad-instruction-2026-09-17, vlad-instruction-2026-09-18]
---

# Company — General Communication Rule

One underlying principle, five applications: communicate proactively and clearly with the other side — client HQ and on-site counterparts alike — rather than reactively or ambiguously. Don't interrupt people at the wrong time; don't show up without warning either; keep everyone who needs to know actually informed once something happens; don't let two different kinds of request blur into one thread; and escalate in order rather than jumping straight to the top.

## 1. Timing — don't disturb clients/partners at night

New reference, 10 September 2026. Wesley Ma flagged an internal rule set by **Dr. Tao (Hai Tao)**: don't interrupt European clients or partners during their **night time**. **Sourcing correction, 16 September 2026:** tagged `whatsapp-wesley-vlad-comms-rule-2026-09-10`; a full read of Wesley's DingTalk 1:1 (`company/docs/2026-09-09-wesley-dm-dingtalk-1to1-sep9-15.md`) confirms this exchange is on DingTalk, not WhatsApp — corrected here, tag kept for traceability. Installers and store managers are the exception — contacting them at odd hours for urgent matters is fine; it's client/partner-side contacts specifically who aren't to be disturbed.

**Practical workaround:** Wesley, Aaron, Xavier and Jordan Zhang all use a scheduled-send feature, timing outbound emails to Europe for **2–3PM Beijing time** so they land at the start of the European business day rather than in the middle of the European night. Vlad should look for the equivalent button in his DingTalk email client.

**Exception:** urgent or important matters override the rule — Wesley's example was the Las Rozas escalation. Otherwise: "just a reminder," not a hard blocker.

**Origin of the rule:** VionVision was once badly criticised over this — **PMI Germany complained to their own HQ** after being disturbed outside working hours — and the rule was set afterward to prevent a repeat.

**Clarified with Vlad:** the rule is about VionVision-initiated contact, not response latency — receiving an email overnight and replying the next morning is completely fine.

**Context for why this matters beyond politeness:** per Wesley, client-side tempers and attitudes toward VionVision vary a lot ("people diversed"), including outright hostility in at least one case — see `neinver/06-risks.md` for the specific example he raised (Ramón Picado). The rule is partly about not giving an unfriendly counterpart a reason to escalate.

## 2. Advance notice — tell local security and site managers before any visit

**New standing practice, established by Vladyslav, 10 September 2026** — not (yet) a client requirement, a VionVision-side good-practice rule going forward: **notify local security and the site/facility manager in advance of any VionVision visit** — where the team will be and roughly when — rather than turning up and hoping the right person is available.

**Origin:** the Amsterdam site survey, 10 September (`neinver/03-open-items.md` items 23, 23b). Xavier arrived for a scheduled technical inspection to find the facility manager on holiday and no permanent on-site maintenance team; José Carlos (the facility managers' boss) had to be looped in reactively, and even then security couldn't show Xavier the racks. The visit's value was cut well below what a routine heads-up would have preserved. Vlad's framing: don't let this repeat.

**Relationship to Sergio's own precondition (Neinver specifically):** Sergio's Poland-hold email (8 Sep) already requires "coordination and prior approval of the works by Neinver" before any new installation begins, and Neinver separately committed to producing a per-centre access/security/permissions checklist (item 11b, not yet delivered). This rule generalises the same instinct into VionVision's own standing practice across **all** sites and clients, proactively, rather than only when a client demands it.

**Not yet formalised as a checklist step or SOP addition** — worth folding into `neinver/07-installation-checklist.md`'s "Access / credentials granted" column, and into `company/04-shipment-process.md` or a future general site-visit SOP if this pattern recurs outside Neinver.

## 3. Post-visit briefings — tell people what happened, same day if possible

**Proposed by Xavier, agreed with Vladyslav, 10 September 2026** (voice call, `neinver/docs/originals/xavier-call-2026-09-10/`) — looser than the two rules above, not yet a formal SOP, but a real working agreement. Xavier is running a multi-site inspection tour (Amsterdam → Milan → Warsaw → Madrid, see `neinver/04-timeline.md`) across several concurrent projects and doesn't have time to loop Vladyslav into every email thread. Instead: a short update after each site visit and each significant on-site conversation — who was met, what was discussed/found, and how any issue will be resolved (a call, an email, etc.) — sent as a **voice message** (Chinese is fine), **same day where possible**. Vladyslav asked that the same update also reach **the Beijing team**, plus (per the call, names not fully clear in the transcription) likely **Hai Tao** and **José Carlos Gracia Palos** — both already established elsewhere in this KB as wanting cross-site visibility — so nobody loses track of what's happening across the tour.

**Distinct from rule 2 above:** rule 2 is about warning people *before* a visit; this is about informing people *after* one. Both came out of the same underlying instinct — don't let people find out too late — but they're separate practices, not one rule split in two.

**In practice, still informal — checked 11 September (`neinver/docs/originals/xavier-call-2026-09-11/`).** A short follow-up call confirms the Amsterdam/Milan update that was meant to reach Sergio (Neinver) had, in practice, only gone out as an informal photo-plus-note in a WhatsApp/chat group ("In talk group"), not the structured briefing this rule describes — Xavier had to be reminded and then forward the specific message on request. Not yet a habit, consistent with rule 3's own framing as "not yet a formal SOP."

**Root cause surfaced directly, 14 September** (DingTalk "海外交付管理" group, `docs/2026-09-14-haitao-xavier-overload-intern-vs-sop-dingtalk.md`). Xavier asked Hai Tao for an intern to help with meeting minutes and ticket-raising, citing overload. Leon argued against it (client-facing judgment calls aren't a fit for an intern without a clear SOP). Vlad's position, which stuck: don't hire for this, fix the process — build clear SOPs and a standardised reporting template so less time goes into compiling updates in the first place, which is the structural fix this rule has been informally waiting on since 10 September. **Vlad committed to Hai Tao to deliver an update on the SOP/template work by end of week (~19 September)** — see `03-open-items.md`.

**Template decided, 17 September — built on DingTalk's own "Action Record" minutes template, not a bespoke format.** Vlad's own words to Hai Tao ("everything... can be broadly divided and categorised... a simple and clear template for most reports") pointed at a fixed field set; rather than inventing one, this rule now points at DingTalk's built-in Action Record layout (Theme / Date / Attendees / Executive Summary / Decided / Key Points / Key Action Items table with Owner+Task+Deadline / Follow-up) — full field-by-field mapping onto a site visit in `10-site-visit-report-template.md`. Reasoning: it keeps the exact same medium Xavier already uses (dictate through DingTalk), so the "same-day, minimum overhead" goal above isn't compromised by a new tool, while giving the AI summary a fixed, comparable shape instead of a free-form one.

**Two things checked directly against the DingTalk Minutes API, 17 September, worth knowing before relying on this:** (1) auto-extracted action items do **not** reliably carry an owner — `assignee` came back `null` on a real, current example (Xavier's own 16 Sep call) — so the Owner column in the Action Record table has to be said out loud and read off by whoever files the report, not trusted to auto-extraction. (2) There is no API-exposed way to create or assign a tag to a note (`list_minutes_tags`/`list_minutes_by_tag` are read-only) — tagging site-visit notes for easy retrieval needs a one-time manual step in the DingTalk app itself, not something this integration can do from here. **Also done, 17 September:** 69 hot words added to Vlad's personal DingTalk recognition list (site names, client names, colleagues) — the Bilbao/Baracaldo-style mistranscription risk this rule's own record-keeping depends on is a direct, tested cause of past confusion (`neinver/09-rollout-plan-17-centers.md`), so this is a real accuracy fix, not a nice-to-have.

## 4. Keep resource requests and customer authorisation requests in separate threads

**Tip from Félix, adopted by Vladyslav, 10 September 2026** (WhatsApp DM, `neinver/02-las-rozas-network.md`). Don't mix a request for resources to the installation company (e.g. "send us a technician") with the authorisation request to the customer (e.g. "please grant site access") in the same email thread — it can generate a thread of correspondence the customer doesn't need or want to see, and risks confusing them about what's actually being asked of them. Send the two as separate, purpose-built emails even when they concern the same visit. Applies retroactively as a lesson, not just going forward — see the still-unconfirmed Las Rozas access email in `neinver/03-open-items.md` item 9f as the case that prompted it.

## 5. Escalation order for PM issues — Vlad, then Leon, then Hai Tao only for the extraordinary

**Standing rule, stated by Vladyslav, 18 September 2026.** Anything a PM (Xavier or others going forward) needs to escalate — a client-facing problem, a resourcing gap, something flagged in a site-visit report — goes to Vlad first, then to Leon if it needs to go further. Hai Tao is not the default second stop; he gets pulled in only for something genuinely out of the ordinary.

**Why this matters here specifically:** the site-visit reporting template (`10-site-visit-report-template.md`) includes an escalation flag on every report's Follow-up field, and the first draft of that template pointed it at "Hai Tao or Leon" — corrected to match this rule once Vlad flagged it. Worth keeping in mind any time a document or process references who a PM issue should go to.
