# Vendored skills and pinned plugins

Policy: `docs/ocs/10-skills.md`. Every entry below was read before enabling (SKILL.md, scripts, hooks, network calls). Versions are pinned; nothing auto-updates. To upgrade: new `arch/` branch, re-review the diff of the upstream repo between the old and new commit, update this file.

Reviewed by: Claude (lead engineer role), 29 Oct 2026. Interim architect approval: Vlad (D-22).

## Skills copied into `.claude/skills/`

| Skill dir | Upstream | Commit | Licence | Review notes |
|---|---|---|---|---|
| `webapp-testing` | anthropics/skills `skills/webapp-testing` | `ca45fc496a3436251f191354091d557da31c15b5` | Apache-2.0 (LICENSE.txt) | Python Playwright helper `scripts/with_server.py` starts local servers only. No network calls |
| `react-best-practices` | vercel-labs/agent-skills `skills/react-best-practices` | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | MIT | Markdown rules only. Next.js/server rules do not apply (Vite SPA, ADR-001 P-02) |
| `composition-patterns` | vercel-labs/agent-skills `skills/composition-patterns` | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | MIT | Markdown rules only |
| `web-design-guidelines` | vercel-labs/agent-skills `skills/web-design-guidelines` | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | MIT | **Local patch**: upstream fetches the latest rules from `main` on every run (unpinned, remote text becomes instructions). Rules pinned in `guidelines.md` = vercel-labs/web-interface-guidelines `command.md` at `434b7f91364665f2f733b310ec54809bf8f37937` (MIT, `GUIDELINES-LICENSE`); SKILL.md reads the local file |
| `api-and-interface-design` | addyosmani/agent-skills | `eb07f19f52c2669f2364897aaa293e2aaddd7b1c` | MIT | Markdown only |
| `security-and-hardening` | addyosmani/agent-skills | `eb07f19f52c2669f2364897aaa293e2aaddd7b1c` | MIT | Markdown only (+ references) |
| `documentation-and-adrs` | addyosmani/agent-skills | `eb07f19f52c2669f2364897aaa293e2aaddd7b1c` | MIT | Markdown only. ADRs live in `docs/ocs/adr/`, binding entries in `docs/ocs/01-decisions.md` |
| `incremental-implementation` | addyosmani/agent-skills | `eb07f19f52c2669f2364897aaa293e2aaddd7b1c` | MIT | Markdown only |
| `karpathy-guidelines` | forrestchang/andrej-karpathy-skills `skills/karpathy-guidelines` | `2c606141936f1eeef17fa3043a72095b4765b9c2` | MIT (per upstream README) | Markdown only |

Not installed from addyosmani/agent-skills on purpose: its TDD and debugging skills (overlap with superpowers).

## Plugins — `.claude/settings.json`

Catalogue `ocs-vetted` is declared inline in `extraKnownMarketplaces` (source type `settings`); each plugin is pinned to a commit SHA.

| Plugin | Source | Commit | Version | Executable parts / review notes |
|---|---|---|---|---|
| `superpowers` | obra/superpowers | `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | 7.0.1 | SessionStart hook injects the `using-superpowers` skill text into context; no network. `brainstorming` can start a local preview server |
| `code-review` | anthropics/claude-plugins-official `plugins/code-review` | `f8c5e7a1dcb71b10cb74586224b5401f3de5db28` | 1.0.1 | Commands/agents only |
| `pr-review-toolkit` | same repo `plugins/pr-review-toolkit` | `f8c5e7a1…` | 1.0.1 | Commands/agents only |
| `code-simplifier` | same repo `plugins/code-simplifier` | `f8c5e7a1…` | 1.0.0 | Agent only |
| `security-guidance` | same repo `plugins/security-guidance` | `f8c5e7a1…` | 2.0.17 | Python hooks. SessionStart pip-installs `claude-agent-sdk` into `~/.claude/security/` venv; on commit/push/Stop it sends the **git diff** to an LLM review via the user's Claude credentials. Acceptable: diffs contain code only — real client data is banned from the repo (CLAUDE.md §3.3) |
| `hookify` | same repo `plugins/hookify` | `f8c5e7a1…` | 0.1.1 | Python hooks read `.claude/hookify.*.local.md` rules; no network. New rules only on `arch/` branches |
| `skill-creator` | same repo `plugins/skill-creator` | `f8c5e7a1…` | — | Eval scripts run locally when invoked |
| `frontend-design` | same repo `plugins/frontend-design` | `f8c5e7a1…` | 1.1.1 | Markdown only. Must use `packages/ui` tokens |

### Exception: official marketplace, not SHA-pinned

Claude Code refuses plugin names starting with `claude-` in a third-party catalogue, and an inline catalogue cannot carry LSP config. These three come from `claude-plugins-official` (registered from `github.com/anthropics/claude-plugins-official`). All three are markdown or configuration only — no hooks, no scripts.

| Plugin | Version at install | Notes |
|---|---|---|
| `typescript-lsp` | 1.0.0 | Runs `typescript-language-server --stdio` (installed as a dev dependency with the skeleton) |
| `claude-md-management` | 1.0.0 | Commands only |
| `claude-code-setup` | 1.0.0 | Commands only |

## Not enabled at kickoff
- trailofbits/skills `static-analysis`, `differential-review` (`2be6433b39e009cd2b6fd3be1895f6b1faa5af9a` reviewed for availability only) — architect/CI use, enable when the CI security job is built (F0.5).
