---
name: ocs-review
description: Use to review any OCS diff or PR (your own or a PM-developer's) — severity levels STOP/MUST/SHOULD/NOTE, the 12-point checklist and the fixed output format from docs/ocs/09-review-protocol.md.
---
# Reviewing a change

1. Get the diff (`git diff main...HEAD` or the PR). Read the linked AC and SOP clause.
2. Run evidence yourself: `pnpm verify`, `pnpm test:matrix`, and `pnpm e2e` if UI/flows changed. Never trust a claim without output.
3. Walk the 12-point checklist in `docs/ocs/09-review-protocol.md` §2. Highest attention: write path, isolation/RLS, client projections (partner names, internal fields), automatic sends, secrets, deletes.
4. Run vetted reviewers (`code-review`, `pr-review-toolkit`, `/security-review`); confirm each finding against the code before reporting; drop false positives.
5. Check tests assert the requirement, not the implementation.
6. Output exactly:
```
Verdict: APPROVE | CHANGES REQUIRED | STOP
Evidence: <commands + result lines>
Findings (most severe first):
  [STOP|MUST|SHOULD|NOTE] file:line — problem — why it matters — fix
Teaching note for <name>: <1–2 sentences, their language>
```
7. STOP findings: tell Vlad the same day. Repeated MUST (3×) from the same person → propose a lint rule / generator / skill change.
8. Never approve alone: protected zones, external access, production data, new skills/plugins/dependencies.
