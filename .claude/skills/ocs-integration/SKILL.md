---
name: ocs-integration
description: Use when building or changing an adapter to an external system (Aliyun mail, DingTalk cards/notices/Drive/Minutes, device platform OpenAPI, Kingdee, imports) — idempotent, fake-first, never client-facing sends.
---
# Integrations

Read `docs/ocs/07-integrations.md` for the system-specific facts.

1. Build the **fake** first (`adapters/<system>/fake.ts`) and the contract test against it. Real connection only when access exists.
2. Every inbound item has an idempotency key (Message-ID, DingTalk message id, dentry id + version, platform SN + timestamp). Re-processing must not duplicate.
3. Inbound data becomes **commands** (as system actor or the mapped user). Adapters never write tables.
4. Retries with backoff; after N failures → dead-letter table + alert to the integration owner.
5. Outbound only to staff (DingTalk work notices, digests) or the user's own Drafts folder. **Never** send to a client or partner. A test asserts the adapter has no client-send path.
6. Secrets from the secret store; never log tokens, message bodies with personal data, or credentials.
7. Respect communication norms: outbound drafts to Europe suggest 14:00–15:00 Beijing.
8. Data direction: DingTalk → EU OCS is fine; do not push client personal data into DingTalk.
