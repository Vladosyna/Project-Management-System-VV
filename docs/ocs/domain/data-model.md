# Data model (V1 target — refine in ADRs, migrations on `arch/` branches)

Conventions: UUID v7 `id`; `created_at/by`, `updated_at/by`; `archived_at` (no deletes); `client_id` + RLS on client data; `visibility` where client exposure is possible.

## Organisation
- **Client**: short_code (≤ 8, used in Project ID), name, languages, gate_template_id?, communication rules ref.
- **Programme** (optional): client_id, name (e.g. Transition Deployment).
- **Country**: iso2, name. **City**: iata/3-letter code, name, country.
- **Partner**: real_name (staff only), label per client (Partner A/B/C), country, contacts (business only).
- **User**: kind (staff | client | partner | system), name, email, language, time zone, roles, client_ids (external).

## Projects and sites
- **Project/Site** (one row per SOP-DEL-02 "project/site"): project_id (`CLIENT-CC-CITY-NNN`, unique, immutable), client_id, programme_id?, country, city, site name, standard (L|S), package (Full|Light), phase, pm_user_id, sales_owner_id, time_zone (IANA), dingtalk_folder ref, status, gate_template_id?.
- **SiteStep**: site_id, step (card_received | card_complete | readiness_confirmed | go_no_go | installed | accepted | custom gate key), date, actor, evidence_file_id, note.
- **GateTemplate**: client/programme, gates [{key, name, order, conditions (rule config refs)}].

## Intake (SOP-DEL-01)
- **HandoverCard**: project_id, version, sections jsonb validated by zod per Annex B (1 Project identification … 11 Intake review), package Full|Light, submitted_at, sales_declaration_signed_by/at.
- **HandoverItem**: card_id, item code (A1…G), value / file ref / N/A + reason, blocking (bool from config).
- **IntakeDecision**: card_id, decision (accepted | accepted_with_conditions | returned), reasons, decided_by, decided_at.
- **IntakeCondition**: decision_id, item code, deadline (≤ 5 working days), status.
- **ConditionalStart**: project_id, authorised_by (permission holder), missing items, deadline.
- **IntakeRegister**: view over submissions: project_id, submitted, decision, days_to_acceptance, returns.
- **RestrictedNote**: client/project scope, text, author — separate RLS (group F, `11_Internal Notes`).

## Devices
- **Device**: sn, mac, model (G6, G6S, G6 WiFi, B1, CBox…), firmware, site_id, switch, port, ip, status (planned | shipped | received | installed | online | calibrated | faulty | lost), replaced_by_id.
- **DeviceSourceRecord**: device ref (sn/mac), source (packing_list | as_built | platform | aiot | import), payload, seen_at — for reconciliation.

## Work
- **Action**: title, owner (owner_id of an OCS user, or owner_name of a person outside OCS — exactly one), due, status (open | in_progress | done | cancelled), source_kind, source_ref, linked object (one typed FK per kind: site now, case and visit with their tables), visibility.
- **Comment / Update**: linked object (typed FK: site now, case and visit later), body, mentions (user ids), author, source_kind, source_ref, visibility. An action turned from a comment carries `comment_id` and source `comment`.
- **Visit** (SOP-DEL-03): site_id, type (site_survey | technical_inspection | installation | commissioning | maintenance), date, attendees [{name, side: vv | client | third_party}], summary, decided [{text, agreedWith}], discussed [text], key_points, coverage_done of coverage_total (+ coverage_gap when short), follow_up, escalate, minutes_ref, svr_no (SVR-NN per project). Actions from a visit carry `visit_id`.

## Cases
- **Case**: number `CS-nnnn`, client_id, site_id?, type, priority, owner_id, status, internal_eta (derived), committed_date, client_title, visibility, root_cause, category, fix_type, closed_at.
- **WorkItem**: number (`ALG-`/`PLT-`/`FW-`/`DEL-`/`TST-`), case_id, team, owner_id?, status, eta, blocking (bool).
- **EtaChange**: work_item_id, old, new, reason (required), actor, at.
- **Message**: case_id?, inbox_state (unlinked | linked | dismissed), channel (mail | dingtalk | whatsapp | portal), external_id (Message-ID / msg id — unique), thread_ref, from, subject, body_text, attachments refs, visibility, match_suggestion {case_id, confidence, reason}.
- **CaseDevice**: case_id, device_id.

## Platform
- **Alert**: rule (R1…R23), object ref, level, owner_id, due, status, handling log.
- **FileRef**: storage (dingtalk | ocs-eu), space_id, dentry_id, version, hash, folder_number / slot prefix, doc_type, object ref, shared_with_client (bool).
- **AuditEvent** (append-only): actor, actor_kind, command, object ref, before, after, source, at.
- **Outbox**: event type, payload, status, attempts.
- **AiProposal** (Jan): agent, object ref, proposed change, evidence refs, confidence, status (pending | accepted | edited | rejected), decided_by.
