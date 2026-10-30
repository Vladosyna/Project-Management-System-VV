---
name: ocs-sop-rule
description: Use when implementing any business rule from a Vionvision SOP (SOP-DEL-01..05, change management, communication norms) — encode as cited configuration with example tests.
---
# Encoding a SOP rule

SOPs are law (`docs/ocs/domain/sop-index.md`, full text in `docs/ocs/domain/sop/`).

1. Find the exact clause and quote it in your plan (document, section, sentence).
2. `pnpm gen:rule <module> <rule-key> --cite "SOP-DEL-01 §8" --sop-version 1.3` creates:
   - `rules/<rule-key>.config.ts` — parameters (numbers, item codes, lists) + `cite: 'SOP-DEL-01 §8'` + `sopVersion: '1.3'`;
   - `rules/<rule-key>.ts` — evaluator that reads only the config;
   - `rules/__tests__/<rule-key>.examples.test.ts` — table of examples: input → expected decision.
3. Examples must include the boundary cases (exactly 5 working days, exactly 20 sensors, N/A without reason, blocking item as condition).
4. A violation throws `RuleViolation({ clause, message })` so the UI shows "Blocked by SOP-DEL-01 §8: …".
5. If the SOP is ambiguous, do not invent: write the question for Vlad, implement the stricter reading behind a config flag, note it in the PR.
6. If you notice the SOP itself is wrong or outdated, say so to Vlad; never "fix" the SOP in code.
