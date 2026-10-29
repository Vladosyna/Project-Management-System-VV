## What
<!-- 2–4 lines: what changes for the user or the system. -->

## Why — epic / AC and SOP clause
<!-- e.g. E2 AC2 — SOP-DEL-01 §8 blocking items A1, A4, A6, C2, D1, F1. No AC → ask before coding. -->

## Verification evidence
<!-- Paste the commands you ran and their result lines (04-testing §1 rule 3). -->
```
pnpm verify →
```

## Screenshots (UI changes)
<!-- EN and 中文. -->

## Checklist (09-review-protocol §2)
- [ ] Every write goes through `defineCommand` (permission key, schema, audit)
- [ ] New data: `client_id`, RLS policy, RLS/matrix tests; client projections hide internal fields, R&D and partner names
- [ ] SOP rules are config citing the clause, with example tests
- [ ] Tests assert the acceptance criterion; bug fixes start with a failing test
- [ ] No real client data, no secrets, no deletes, no client-facing sends
- [ ] UI strings are i18n keys with EN + 中文
- [ ] ≤ 400 changed lines; label `ai-assisted` if written with AI
