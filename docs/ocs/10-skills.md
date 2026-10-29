# 10 — Vetted skills and plugins

Policy: one skill per topic (overlapping skills give contradictory instructions). Read every SKILL.md before enabling; a skill can grant itself broad tool access. Pin versions; no auto-update; project skills (`ocs-*`) override generic ones. Anything not on this list needs Vlad's OK and a decisions-log entry. Researched 29 Oct 2026.

## Enable at kickoff

| Topic | Skill / plugin | Source | Install | Notes |
|---|---|---|---|---|
| Development workflow | **superpowers** — brainstorming, writing-plans, test-driven-development, systematic-debugging, verification-before-completion, requesting-/receiving-code-review, finishing-a-development-branch | obra/superpowers (community; in Anthropic's plugin marketplace) | `/plugin marketplace add obra/superpowers-marketplace` → `/plugin install superpowers@superpowers-marketplace` | Core discipline for PM-developers. Its TDD is *the* TDD skill — do not add another |
| Edit discipline | **karpathy-guidelines** | community (already in Vlad's account) | copy into `.claude/skills/` if not available in the cloud session | Minimal changes, surface assumptions |
| PR review | **code-review**, **pr-review-toolkit**, **code-simplifier** | Anthropic official (`anthropics/claude-plugins-official`) | `/plugin` → official marketplace → install | Multi-agent review with confidence filter; 6 focused reviewers |
| Security while editing | **security-guidance** + built-in `/security-review` | Anthropic official | `/plugin` → official | Warns on XSS / injection at edit time |
| TS diagnostics | **typescript-lsp** | Anthropic official | `/plugin` → official | |
| Hooks & setup | **hookify**, **claude-md-management**, **claude-code-setup** | Anthropic official | `/plugin` → official | Use hookify to extend `.claude/hooks` (on `arch/` branches) |
| Skill authoring | **skill-creator** | Anthropic official | `/plugin` → official | For writing/improving `ocs-*` skills |
| Browser E2E | **webapp-testing** | anthropics/skills | copy `skills/webapp-testing` into `.claude/skills/` at a pinned commit | Playwright against the local app |
| UI quality | **frontend-design** | Anthropic official | `/plugin` → official | Must still use `packages/ui` tokens |
| React | **react-best-practices**, **composition-patterns** | vercel-labs/agent-skills (MIT) | `npx skills add vercel-labs/agent-skills --skill react-best-practices --agent claude-code` (same for composition-patterns) | Ignore Next.js-specific advice (we use Vite SPA) |
| UX / a11y review | **web-design-guidelines** | vercel-labs/agent-skills (MIT) | `npx skills add vercel-labs/agent-skills --skill web-design-guidelines --agent claude-code` | Run on every new screen |
| API, security, ADRs | **api-and-interface-design**, **security-and-hardening**, **documentation-and-adrs**, **incremental-implementation** | addyosmani/agent-skills | `npx skills add addyosmani/agent-skills --skill <name> --agent claude-code` | Do **not** install its TDD/debugging skills (overlap with superpowers) |

## Architect / CI only

| Skill / plugin | Source | Use |
|---|---|---|
| **static-analysis** (Semgrep, CodeQL, SARIF), **differential-review** | trailofbits/skills (CC BY-SA 4.0) | Deep review of protected-zone PRs and pre-release audits |

## After installing
- Commit project-level skills (`.claude/skills/<name>/` + `VENDOR.md` with repo, commit, date, reviewer).
- Record plugin names and versions in this file.
- Run `claude-code-setup` once and compare its recommendations with this list; adopt nothing without review.
