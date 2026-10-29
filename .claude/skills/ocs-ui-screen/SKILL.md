---
name: ocs-ui-screen
description: Use when building or changing an OCS screen — follow the mockups in docs/ocs/reference/mockups, packages/ui tokens, i18n, accessibility, client-projection rules and a Playwright check.
---
# Building a screen

1. Find the mockup: `docs/ocs/reference/mockups/<Screen>.dc.html` (Main, Portfolio, Project, Site, Platform, Actions, Cases, Case, RnD, Commercial, Client, Partner). Layout, density and wording follow it; data shown there is real — never copy names into code or seeds.
2. `pnpm gen:screen <route>` → route, page component, i18n keys, Playwright spec stub.
3. Use only `packages/ui` components and tokens. No raw colours, fonts, inline styles (lint fails).
4. Every string is an i18n key with EN and 中文.
5. Data comes from typed queries (contracts); no business logic in components — derived values come from core queries.
6. Client-facing screens: only client projections; team names instead of R&D names; Partner A/B/C labels; committed date instead of internal ETA.
7. Accessibility: labels, keyboard path, focus states; run `web-design-guidelines` review.
8. Verify: `pnpm e2e --grep <screen>` with the seed; attach a screenshot to the PR.
