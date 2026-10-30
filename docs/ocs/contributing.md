# How to contribute — for PM-developers / 如何参与开发（PM 开发者）

[English](#english) · [中文](#中文)

## English

You build OCS features together with Claude. Claude writes, explains, tests and reviews; you decide what the screen or rule must do and check the result. You cannot break `main`: hooks, lint, CI and code-owner review stop unsafe changes. Ask early, ask often.

### Once: set up
1. Accounts: GitHub access to this repository; Claude Code (web or desktop).
2. Locally (optional): Node 22, pnpm 10, Docker. Then `pnpm install` and `pnpm verify`. It must end green.

### Every task, seven steps
1. **Pick a task** from `docs/ocs/05-roadmap.md` — an epic and acceptance criterion (AC), e.g. "E2 AC3". No AC → ask Vlad first.
2. **Start a branch** `feat/<epic>-<short-name>` (new behaviour) or `fix/<short-name>` (bug). Tell Claude the AC and the SOP clause it serves.
3. **Plan with Claude.** Claude restates the task in two lines, lists files and tests. Read the plan; ask until it is clear.
4. **Generate, never hand-build** structure:
   `pnpm gen:command <module> <verb-noun>` · `pnpm gen:query <module> <noun>` · `pnpm gen:rule <module> <rule-key> --cite "SOP-DEL-01 §8" --sop-version 1.3` · `pnpm gen:screen <route> --title "…" --title-zh "…"`.
5. **Test first.** The first test says what the AC says, in plain words. It fails; then Claude writes the code that makes it pass.
6. **Verify.** `pnpm verify` (and `pnpm e2e` for screens). Paste the result lines in the PR. "Done" without evidence is not done.
7. **Open the PR** (template opens by itself), label `ai-assisted`, ≤ 400 changed lines. Claude reviews first (`ocs-review`), then Vlad approves. Fix what they ask, then merge.

### Rules you cannot break
- SOPs are law: every business rule cites its clause (`SOP-DEL-01 §8`).
- No real client names, emails or data anywhere in the repository — use `Client A`, `Partner A`, `Site 001`.
- Never send anything to a client automatically. OCS makes drafts; a person sends.
- Partners are anonymous to clients (Partner A/B/C).
- No passwords or keys in code, documents or tests.
- Never delete business records — archive them.
- Every screen text in English **and** 中文.
- Protected areas (database, permissions, identity, CI, `.claude`, `package.json`): only Vlad, on `arch/` branches. If Claude says "protected zone", stop and ask Vlad.

### When something is red
| Check | Means | Do |
|---|---|---|
| Claude's edit is blocked | A hook found a rule break before it was saved | Read the message to the end; it names the rule and the fix |
| `verify` | Format, lint, types or tests fail | Ask Claude to explain the first error in plain words, fix that one first |
| `generators` | Generators no longer produce working code | Not yours: tell Vlad |
| `e2e` | The app does not work in the browser | Open the `e2e-results` artifact screenshots |
| `security` | Secret, risky code or vulnerable package | Stop; tell Vlad the same day |
| `pr-rules` | PR > 400 lines or an old migration changed | Split the PR |

Stuck for more than 30 minutes? Ask Vlad. A short question saves a long detour.

## 中文

你和 Claude 一起开发 OCS 功能。Claude 负责编写、解释、测试和审查代码；你决定页面或规则应该做什么，并检查结果。你不会弄坏 `main` 分支：钩子（hook）、lint、CI 和代码负责人审查会拦住不安全的改动。有问题尽早问、多问。

### 一次性准备
1. 账号：本仓库的 GitHub 权限；Claude Code（网页版或桌面版）。
2. 本地（可选）：Node 22、pnpm 10、Docker。然后运行 `pnpm install` 和 `pnpm verify`，结果必须全部通过（绿色）。

### 每个任务七步
1. **选任务**：从 `docs/ocs/05-roadmap.md` 选一个史诗（epic）和验收标准（AC），例如 "E2 AC3"。没有 AC → 先问 Vlad。
2. **建分支**：新功能用 `feat/<epic>-<简称>`，修复问题用 `fix/<简称>`。把 AC 和对应的 SOP 条款告诉 Claude。
3. **和 Claude 一起做计划**：Claude 用两句话复述任务，列出要改的文件和测试。读懂计划，不清楚就一直问。
4. **用生成器，不要手工搭结构**：
   `pnpm gen:command <模块> <动词-名词>` · `pnpm gen:query <模块> <名词>` · `pnpm gen:rule <模块> <规则名> --cite "SOP-DEL-01 §8" --sop-version 1.3` · `pnpm gen:screen <路由> --title "…" --title-zh "…"`。
5. **先写测试**：第一个测试用简单的话写出 AC 的要求。它先失败，然后 Claude 写代码让它通过。
6. **验证**：运行 `pnpm verify`（页面还要运行 `pnpm e2e`），把结果贴到 PR 里。没有证据的"完成"不算完成。
7. **提交 PR**（模板会自动打开），加标签 `ai-assisted`，改动不超过 400 行。Claude 先审查（`ocs-review`），再由 Vlad 批准。按意见修改后合并。

### 不能违反的规则
- SOP 就是规则：每条业务规则都要注明条款（如 `SOP-DEL-01 §8`）。
- 仓库中任何地方都不能出现真实客户的名称、邮箱或数据——使用 `Client A`、`Partner A`、`Site 001`。
- 绝不自动给客户发送任何内容。OCS 只生成草稿，由人来发送。
- 对客户隐藏合作伙伴身份（Partner A/B/C）。
- 代码、文档、测试中不能有密码或密钥。
- 绝不删除业务记录——只能归档。
- 每个页面文字都要有英文**和**中文。
- 受保护区域（数据库、权限、身份认证、CI、`.claude`、`package.json`）：只有 Vlad 在 `arch/` 分支上修改。如果 Claude 提示"protected zone"，停下来问 Vlad。

### 出现红色（失败）时
| 检查 | 含义 | 怎么做 |
|---|---|---|
| Claude 的修改被拦截 | 钩子在保存前发现违反规则 | 把提示读完，里面写明了规则和改法 |
| `verify` | 格式、lint、类型或测试失败 | 请 Claude 用简单的话解释第一个错误，先改这一个 |
| `generators` | 生成器产出的代码不能用了 | 不是你的问题：告诉 Vlad |
| `e2e` | 应用在浏览器中不能正常工作 | 打开 `e2e-results` 附件里的截图 |
| `security` | 发现密钥、危险代码或有漏洞的依赖 | 停下，当天告诉 Vlad |
| `pr-rules` | PR 超过 400 行，或改了旧的数据库迁移 | 把 PR 拆小 |

卡住超过 30 分钟？问 Vlad。一个简短的问题能省下很长的弯路。
