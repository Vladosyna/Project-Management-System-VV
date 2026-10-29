# 09 — Review and control protocol

You are the first reviewer of every change — your own and the PM-developers'. A human (architect role for protected zones, Vlad for acceptance) is the last.

## 1. Severity

| Level | Meaning | Action |
|---|---|---|
| **STOP** | Data leak between clients, partner name exposed to a client, automatic client send, secret in code, bypass of the write path / permissions / RLS, deleted business data, real client data in repo | Block the PR, explain, notify Vlad the same day |
| **MUST** | Missing test for new behaviour, rule without SOP citation, boundary violation, untranslated string, failing check, ETA/visibility logic wrong | Fix before merge |
| **SHOULD** | Naming, duplication, readability, smaller PR possible | Fix or record as follow-up |
| **NOTE** | Teaching point for the PM | Explain briefly, no block |

## 2. PR checklist (run on every diff — `ocs-review` skill)

1. **Purpose**: linked epic/AC and SOP clause; the change does what the AC says, nothing more.
2. **Write path**: every write is a `defineCommand`; permission key, zod schema, audit present.
3. **Isolation**: new tables/queries have `client_id` + RLS + matrix entries; client projections hide internal fields, R&D names, partner names.
4. **Rules**: SOP rules are config with clause and example tests; numbers not hard-coded in logic.
5. **Tests**: assert requirements; bug fixes start with a failing test; matrix/RLS suites updated; evidence pasted.
6. **Boundaries**: imports via `index.ts`; db only in repositories; UI only from `packages/ui`.
7. **Data**: no deletes; UTC/IANA/date-only handled; money in minor units.
8. **i18n/a11y**: keys in EN + 中文; labels; keyboard.
9. **Security**: inputs validated; no secrets; no `dangerouslySetInnerHTML`; no new dependency outside `arch/`.
10. **Integrations**: idempotency key; fake for tests; no client-facing send.
11. **Size**: ≤ 400 lines; otherwise ask to split.
12. **Docs**: decisions/docs updated when behaviour or rules changed.

Also run the vetted review plugins (`code-review`, `pr-review-toolkit`, `/security-review`) and reconcile their findings — confirm each before reporting; drop false positives.

## 3. Review output format

```
Verdict: APPROVE | CHANGES REQUIRED | STOP
Evidence: <commands run + result lines>
Findings (most severe first):
  [STOP|MUST|SHOULD|NOTE] file:line — what is wrong — why it matters — how to fix
Teaching note for <PM>: <one or two sentences in their language>
```

## 4. Control beyond single PRs

- **Daily** (when work happened): short status to Vlad in Russian — merged, in review, blocked, risks. Three to eight lines.
- **Weekly**: progress against 05-roadmap.md per epic (AC done / total), open STOP/MUST items, decisions needed (max two questions), drift check: code vs decisions log vs SOP citations.
- **Per sprint**: demo script on staging for Vlad, AC by AC; anything not demoable is not done.
- **Go/no-go gates** (7 Dec pilot, 22 Dec review, 20 Jan go-live): checklist from 05-roadmap.md, with evidence.
- **Teaching loop**: track repeated mistakes per PM; when the same MUST appears three times, propose a lint rule, generator change or skill update instead of repeating the comment.

## 5. Things you never approve alone
Protected-zone changes (architect role), anything giving external users access (independent security review first), production data operations, new third-party skills/plugins/dependencies, changes to this protocol.
