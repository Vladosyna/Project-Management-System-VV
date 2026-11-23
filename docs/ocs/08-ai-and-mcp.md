# 08 — AI agents, MCP, trust levels

## Two channels, one API (D-07)
1. **Central agent** (`apps/worker`, EU model endpoint, no training on our data): reads the case mailbox, DingTalk bot messages, portal requests, alerts. Matches messages to cases, summarises with sources, extracts ETAs/status from text, flags contradictions. Writes only through commands as actor `system:ai-central`.
2. **Personal agents via MCP** (`apps/mcp`, now — D-33): any MCP client (Claude, ChatGPT, Qwen-based, DeepSeek-based…) authenticates by OAuth as the user and gets that user's permissions. Audit shows "<user> via AI (<client>)". Tools are generated from the command and query registry (D-33): every query is a read tool, every command a write tool, named after it (e.g. `intake.handoverCard.read`), with the zod input as JSON Schema and the permission description as the tool description. A tool the user's roles do not hold is not listed. Platforms without MCP use the same registry as REST + OpenAPI. Case tools (`search_cases`, `create_case`, `draft_client_update`…) arrive with the case module, the same way. Personal agents bring context only the person has (own mail folders, WhatsApp, meeting notes).

### How an AI platform connects (D-33)
- **MCP clients** (Claude, ChatGPT, Cursor…): server URL `<OCS origin>/mcp`. The client discovers sign-in from `/.well-known/oauth-protected-resource`, registers itself, and the person signs in to OCS (with MFA) and allows it on the consent screen.
- **Platforms without MCP** (GPT Actions, Copilot Studio, n8n…): import `<OCS origin>/api/v1/openapi.json`; OAuth 2.0 authorization code + PKCE at OCS; every operation is `POST /api/v1/<operation>`.
- The person sees and disconnects their agents under **AI agents**; tokens stop working at once.

## Trust levels (same for both channels)

| Level | Examples | Mechanics |
|---|---|---|
| Automatic | Attach message on exact thread/case-number match; summaries; link device by exact SN; last-activity stamp | Applied immediately, labelled AI, source + one-click undo |
| Proposal | New case from inbox; status change; ETA extracted from text; new work item; contradiction flag; owner for a minutes action item | `AiProposal` queue for the case/object owner; accept / edit / reject |
| Human only | Anything client-visible; committed client date; close with root cause; priority to P0; any change to live devices | AI may draft only |

### Delivery data entry (D-34 N5)
For N1–N3 agents enter the data, PMs confirm; hand entry is the fallback. Until the central agent runs (January) each PM's own agent does this via MCP.

| Data | Source | Agent action | Level |
|---|---|---|---|
| Price proposals (per site / trip / country) | Installer mails, PDF/XLSX quotes, WhatsApp | Extract each quote, match to SOW and site, normalise to unit + hour + travel, flag lines above time standard, client price (P-03) or supplier rules | Proposal; approval human (CEO, P-11) |
| Quote comparison | Price proposals of the same SOW | Like-for-like table, cheapest compliant quote, draft CEO approval request | Proposal |
| Client PO, DPIA, invoice | Client mails, PO notifications, DPIA status lists, portals | Extract PO number, amount, store, DPIA status per market; link to site | Proposal |
| Supplier invoice | Supplier mails | Match to quote and visit outcome, check supplier rules (P-07), draft payment request text | Proposal; payment request human (OA) |
| Shipment | Carrier mails, tracking pages/APIs | Update status and ETA; alert on customs hold | Automatic (status); proposal (new shipment) |
| Readiness checklist | Market mail/WhatsApp with photos | Tick items with the photo as evidence, list what is missing | Proposal; go/no-go human |

Money data (PO, quotes, invoices, payments) is never applied without a PM's confirmation, also when an adapter replaces the agent (07-integrations.md).

Start: everything except exact-match attach is a proposal. Promote a proposal type to automatic only when its accept-without-edit rate stays above ~90% for 4 weeks, by decision-log entry.

## Data handling
- MCP returns data per role and strips personal data not needed for the task.
- Restricted notes (D-28): never available to the central agent. Through MCP only to their readers, since a personal agent has the user's rights (D-07); which model providers may receive them is part of the Q4 policy.
- Policy needed (Q4): which model providers may be connected to projects with client data.
- Idempotency: two agents proposing the same case from the same Message-ID produce one proposal.
- Prompts, responses and tool calls of the central agent are logged (no secrets).
