# 07 — Integrations

All adapters live in `apps/worker/adapters/<system>/` and follow the pattern in 02-architecture.md §6: idempotency key, retries with backoff, dead-letter table, fake implementation for tests, rate limits, inbound → commands, never client-facing sends. Credentials from the secret store only. Build fakes first; real connections only when the access in Q5–Q8 is granted.

## Aliyun enterprise mail (case mailbox) — V1
- Dedicated mailbox (e.g. `cases@<company domain>`) — Q6.
- Read: IMAP (IDLE or polling every 2 min) or the Aliyun Mail open-platform API if available. Key: Message-ID. Store raw `.eml` reference + extracted text; attachments as FileRef.
- Match: `[CS-nnnn]` in subject → attach; Project ID in subject + known thread (In-Reply-To/References) → attach; else inbox item with suggestion.
- Plus-addressing (`cases+CS-0412@`) only if Aliyun supports it — verify, don't assume (D-08).
- Drafts for client updates: IMAP APPEND to the user's own Drafts folder (requires the user's app password / authorisation, stored per user in the secret store) or `.eml` download. Never SMTP send to clients.
- Outbound timing to Europe: drafts suggest scheduled send 14:00–15:00 Beijing (communication norms §1).

## DingTalk — V1 one-way, Jan interactive
Internal enterprise app (Q5). Permissions to request: work notifications, robot/bot, interactive cards, contacts read (unionId lookup), Storage read (`Storage.DownloadInfo.Read`), knowledge-base node read, OA approval events (V2), Minutes read.
- **V1 work notices**: new work item, ETA due, alert hit — to staff only; deep link to OCS.
- **Jan interactive cards**: accept / ask / reassign / set ETA (+ reason). Callback → command as that user (map DingTalk unionId → OCS user).
- **Group messages**: bot likely receives only messages where it is @mentioned — verify; design for "@OCS attach CS-0412" and forwarding.
- **Minutes (Action Record)**: read minutes whose Conference Theme starts with a Project ID → link to visit/meeting; extract action items as proposals (assignee is often empty → AI proposes owner, person confirms).
- **Drive / knowledge base (Jan index, V1.1 extraction)**: team space `0交付中心项目文档 / 3-海外连锁项目资料归档`; list dentries, version list, download info (URL valid ~15 min, Range supported). Poll by modified time every 10–15 min (no change events confirmed). Map folder number 00–11 / slot prefix → doc type. Read old phase layout via SOP-DEL-02 §4.1 mapping too. Originals stay in DingTalk; OCS stores FileRef (+ copy in EU storage only for documents shared with clients).
- Official DingTalk MCP server (open-dingtalk/dingtalk-mcp) covers contacts, robot, todo, calendar, Teambition — not Drive; use OpenAPI for Drive.
- Data direction: read from DingTalk into EU OCS is fine; do not auto-push client personal data into DingTalk (D-09).

## Device platform (V-store / AIoT OpenAPI) — Jan read-only
Online status, last seen, binding, firmware version per SN/MAC (Q7). Feeds DeviceSourceRecord; reconciliation report across packing list / as-built / platform / AIoT; R15 offline alert. No writes to the platform from OCS until the change calendar (V1.1) with client-notice gate exists.

## Kingdee ERP — V2 read-only
Stock, shipments, invoices (Q8). Until then: manual references (PO number, invoice number) on sites.

## Old ticket system — one-time import (Jan)
Export open tickets (Q10) → AI pre-match to cases → human review → import as cases/work items with source → old system read-only.

## Excel trackers and KB — imports (V1)
Idempotent importers with dry-run diff and PM confirmation; credentials detected and dropped (D-20); sources recorded on every imported record. The knowledge base and Vlad's DingTalk-Archive (chats, minutes, mail, team-files snapshot) are the seed sources; they are personal-account based — production ingestion must use the organisation app, not personal tokens.
