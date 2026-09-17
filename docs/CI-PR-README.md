# CI 与 PR 流程指南

本仓库通过 GitHub Actions 自动校验 PR，确保改动符合项目规范。本指南说明当前 CI 包含哪些检查、PR 必须走哪些流程。

## CI 工作流清单

`.github/workflows/` 下共 3 个 workflow：

### agents-md-check.yml（AGENTS.md 格式校验）

- **触发条件**：PR 或 push 修改任何 `**/AGENTS.md`
- **校验规则**：
  - 首行必须是 H1 标题（`# ` 开头）
  - 不允许嵌套列表（行首缩进的 `-` 或 `*`）
  - 文件前 5 行内不允许 `---`（避免 frontmatter 解析歧义）
  - 文件中段 `---` 是软警告
  - A 类 AGENTS.md（首行 `# Agent Instructions for `）建议包含 `## Summary`
- **失败处理**：错误（硬约束违反）必须修复；警告可保留

### agents-md-sync-notify.yml（同步提醒）

- **触发条件**：仅 PR
- **行为**：检测本次 PR 修改的文件，按 closest-file-wins 机制向上递归找最近的 `AGENTS.md`，在 PR 下自动评论提醒同步
- **性质**：纯提醒，不阻塞合并

### build-check.yml（编译验证）

- **触发条件**：PR 或 push 修改 `lib/`、`agents/`、`workflows/`、`src/`、`package.json`、`package-lock.json`、`agents.config.ts`
- **执行步骤**：`npm ci` → `npm run build`
- **失败处理**：必须修复——编译失败意味着下游使用方失去产物

## PR 流程

1. 从 `master` 新建功能分支（命名 `<类型>/<描述>`，如 `ci/eng-baseline`、`feat/add-new-agent`）
2. 本地完成改动，按规范拆分粒度（每次改动只处理一个关注点）
3. 自检：
   - `git status` 干净（无未提交改动）
   - `npm run build` 通过
   - commit 信息符合 Conventional Commits
4. push 到远端：`git push origin <branch>`
5. 创建 PR：标题遵循 Conventional Commits、目标分支为 `master`、按 `PULL_REQUEST_TEMPLATE.md` 填写
6. 等待 review（见下方"必走 review"）
7. 合并后清理：远端 head 分支会被保留，但可手动删除以保持仓库整洁

## 必走 review（建议在 GitHub 仓库 Settings 配置）

由于 workflow-composer 是独立 pi 插件项目，下游使用方依赖其稳定性，建议在 GitHub 仓库 Settings → Branches 配置：

- **Branch protection rule** for `master`：
  - Require a pull request before merging
  - Require approvals: 1（至少 1 人 review）
  - Dismiss stale pull request approvals when new commits are pushed
  - Require status checks to pass before merging：勾选所有 3 个 workflow

配置操作无法在仓库文件内完成，需在 GitHub 网页手动设置。

## 与 AGENTS.md 的关系

AGENTS.md 中的"Git workflow rules"章节定义了 commit 规范与 PR 流程。本文是该章节的延伸补充，专注于 CI 机制本身。如有冲突，以 AGENTS.md 为准——发现冲突时请更新 AGENTS.md 而非本文。