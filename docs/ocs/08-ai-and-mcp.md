# 08 — AI agents, MCP, trust levels

## Two channels, one API (D-07)
1. **Central agent** (`apps/worker`, EU model endpoint, no training on our data): reads the case mailbox, DingTalk bot messages, portal requests, alerts. Matches messages to cases, summarises with sources, extracts ETAs/status from text, flags contradictions. Writes only through commands as actor `system:ai-central`.
2. **Personal agents via MCP** (`apps/mcp`, Jan): any MCP client (Claude, Qwen-based, DeepSeek-based…) authenticates by OAuth as the user and gets that user's permissions. Audit shows "<user> via AI (<client>)". Tools: `search_cases`, `get_case`, `add_comment`, `propose_status`, `set_eta`, `link_message`, `create_case`, `draft_client_update`. Personal agents bring context only the person has (own mail folders, WhatsApp, meeting notes).

## Trust levels (same for both channels)

| Level | Examples | Mechanics |
|---|---|---|
| Automatic | Attach message on exact thread/case-number match; summaries; link device by exact SN; last-activity stamp | Applied immediately, labelled AI, source + one-click undo |
| Proposal | New case from inbox; status change; ETA extracted from text; new work item; contradiction flag; owner for a minutes action item | `AiProposal` queue for the case/object owner; accept / edit / reject |
| Human only | Anything client-visible; committed client date; close with root cause; priority to P0; any change to live devices | AI may draft only |

Start: everything except exact-match attach is a proposal. Promote a proposal type to automatic only when its accept-without-edit rate stays above ~90% for 4 weeks, by decision-log entry.

## Data handling
- MCP returns data per role and strips personal data not needed for the task.
- Restricted notes (D-28): never available to the central agent. Through MCP only to their readers, since a personal agent has the user's rights (D-07); which model providers may receive them is part of the Q4 policy.
- Policy needed (Q4): which model providers may be connected to projects with client data.
- Idempotency: two agents proposing the same case from the same Message-ID produce one proposal.
- Prompts, responses and tool calls of the central agent are logged (no secrets).
