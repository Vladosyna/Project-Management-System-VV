---
name: ocs-definition-of-done
description: Use before saying any OCS task is done, fixed or ready for PR — checklist plus the exact verification evidence to show.
---
# Definition of Done

A task is done only when all are true and the evidence is shown:

- [ ] AC from `docs/ocs/05-roadmap.md` satisfied; SOP clause cited where a rule is involved.
- [ ] Tests written first for new behaviour; bug fix has a reproducing test.
- [ ] `pnpm verify` green — paste the summary lines and exit code.
- [ ] Permission matrix / RLS suite updated if data exposure changed — `pnpm test:matrix` green.
- [ ] UI: `pnpm e2e --grep <area>` green + screenshot; EN + 中文 strings present.
- [ ] No new dependency, no protected-zone edit outside `arch/`.
- [ ] No real client data, no secrets, no deletes, no client-facing send.
- [ ] Docs updated if behaviour or rules changed (decisions log via `arch/`).
- [ ] `ocs-review` run on the diff; findings resolved or listed.
- [ ] PR ≤ 400 lines, template filled, label `ai-assisted` if applicable.

Report format to the person: what changed (2–4 lines), evidence, what is left / follow-ups. Russian for Vlad.
