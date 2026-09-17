# Agent Instructions for workflow-composer – OOP template compiler for pi agents and workflows

## Summary

workflow-composer 是一个独立 pi 扩展插件项目（pi package），把 TypeScript OO class（继承 BaseAgent 或 GeneralBase）编译成 pi agent 和 workflow 的 markdown system prompt。本插件不是 pi agent 项目，本身不应存在 .pi/ 文件夹——编译产物应当落到使用方项目的 .pi/agents/ 与 .pi/prompts/ 下（即"该插件所属项目"的 .pi/，不是 workflow-composer 自身）。日常任务读 README.md 与 Must-follow rules 足够；新增 agent 类型、修改编译产物格式、调整强制块契约前需读完整文件与 docs/ 下的设计文档。

## Must-follow rules

这些规则在 workflow-composer 范围内不可违反。

- 修改 `agents/*.ts` 或 `workflows/*.ts` 源文件后必须执行 `npm run build` 重新生成产物，产物落点为该插件所属项目（即运行 `npm run build` 时所在的工程根目录）的 `.pi/agents/*.md` 与 `.pi/prompts/*.md`，不是 workflow-composer 自身的 `agents/` 或 `prompts/`
- 产物落点（使用方项目的 `.pi/agents/`、`.pi/prompts/`）应在使用方项目自己的 `.gitignore` 中排除（不是本插件的 `.gitignore`），本插件范围内的产物相关忽略规则只覆盖 `*.tsbuildinfo` 与 `node_modules/`
- 所有 agent 必须继承 `BaseAgent` 或 `GeneralBase`，并实现 `summary`、`shouldDo`、`shouldNot`、`watchOut`、`getSteps`、`buildOutput` 这六个方法
- 所有 agent 必须使用 `@displayName`、`@description`、`@config` 装饰器声明元数据
- 4 条硬约束（显式文件列表、上下文利用条款、不确定性声明、Subagent 调用安全）来自 `GeneralBase.HARD_CONSTRAINTS`，不得删除或绕过

### File modification rules

新增 agent 流程：

- 在 `agents/<kebab-name>.ts` 新建源文件，类名使用 PascalCase，文件名使用 kebab-case
- 装饰器元数据必须完整：`tools`、`context`、`systemPromptMode`、`inheritProjectContext`、`inheritSkills`
- 编译产物命名由 `agentName` 决定（默认跟随类名转 kebab-case），需与 `@displayName` 中文产物名一致
- 修改完成后跑 `npm run build` 验证产物生成，确认 11 个 agent/workflow 全部成功编译

修改现有 agent 流程：

- 优先修改 `agents/*.ts` 源文件而非使用方项目的 `.pi/agents/*.md` 编译产物
- 跨文件引用重构时同步更新所有引用点
- 修改后必须重新跑 `npm run build` 并检查产物 diff 是否符合预期

### Git workflow rules

- 所有改动通过 Pull Request 合并，禁止直推 master
- commit message 遵循 Conventional Commits，格式 `<类型>(<范围>): <主题>`，中文动词开头，不带句号，主题 ≤72 字符
- 推送前确认 working tree 干净（`git status` 无未提交改动）
- 不得使用 `git push --force`；如确需改写本地历史使用 `git push --force-with-lease` 并先展示方案等待确认

### Safety constraints

- 破坏性命令（`git reset --hard`、`git push --force`、`git revert`）执行前必须先展示完整方案等待用户确认
- 删除文件或目录前先确认文件是否已被 `.gitignore` 排除，避免误删源码
- 修改 `lib/` 下的基类（`base-agent.ts`、`general-base.ts`）前必须确认所有 `agents/*.ts` 与下游使用点能同步更新

## Must-read documents

按优先级读这些文档，再做 workflow-composer 范围内的改动。

- README.md – 项目入口，含目录结构、命令、强制块契约、安装方式
- package.json – 依赖与 npm scripts，确认 build 命令的实际行为
- .gitignore – 产物排除规则，确认改动是否会被纳入版本控制
- docs/source-design-v1.md – v1.2 设计状态，记录 Runtime 派实现与 GeneralBase 拆分
- docs/oop-methodology.md – OOP 形态方法论，记录 BaseAgent / GeneralBase / SettingGraphReader 的设计依据
- docs/workflow-oop-methodology.md – workflow OOP 形态方法论，记录 WorkflowBase 与钩子契约

## Agent guidelines

这些是偏好建议，可在上下文需要时偏离。

### Change granularity

优先小而专注的改动。每次改动只处理一个关注点。多个关注点必须同时处理时拆分为独立 commit。

### Verification approach

每次修改后跑 `npm run build`，确认 11 个 agent/workflow 产物全部生成。修改源文件后检查产物 diff 是否与预期一致。

### Handling uncertainty

不确定编译行为时跑一次 build 看产物；不确定装饰器契约时读 `lib/decorators/` 下源码；不确定历史决策时读 `docs/` 下设计文档。不得基于印象推断。

### Communication style

汇报改动时说明改了什么、为什么改、影响哪些下游使用点。引用具体文件路径，不使用模糊描述。

## Context

这段背景帮助在 workflow-composer 范围内做更好的判断。

### Project relationship

workflow-composer 是基于 weunimix 小说协作工作区衍生的独立 pi 扩展插件项目。它在物理上可能作为嵌套目录存在于上游项目（上游 `.gitignore` 排除），逻辑上是独立项目：独立 git remote `git@github.com:weunimix/workflow-composer.git`，独立 commit 历史与 PR 流程。本项目反哺 root agent 的工作流编排能力。

### Output directory semantics

本插件编译产物的落点不是 workflow-composer 自身，而是运行 `npm run build` 时所在的工程根目录下的 `.pi/agents/` 与 `.pi/prompts/`。原因是 workflow-composer 是 pi package（编译其他 agent 的产物），不是 pi agent 项目（自身不被 pi 加载），所以本身不应存在 .pi/ 文件夹——若在该目录下出现 .pi/，会被未来 agent 误读为 pi agent 项目根而引起歧义。运行 build 时请确保 cwd 是使用方项目根目录。

### Design intent

项目核心是 Runtime 派 OOP：TypeScript class 在运行时求值 OOP，compiler 把它写成 procedural markdown system prompt。这避免了在 markdown 里手写大量模板代码，同时保留 OOP 的可组合性。

### Historical decisions

v1.2 状态：Runtime 派实现完成，审查类共享 abstract 层级（GeneralBase 拆分），SettingGraphReader 提取为标准检索模块。SSOT 重构（2026-09）移除了 SettingGraphReader 与 query_setting_graph 工具，改为直接读取 `设定系统/设定图谱.yaml`。

### Tradeoffs

OOP class 形态要求源码用 TypeScript 装饰器（stage 3），对工具链有要求（tsx 或支持 stage 3 的 tsc）。编译产物仍是 markdown，保留与 pi 原生 prompt 的兼容性。

### Common misunderstandings

agents/ 目录下只有 .ts 源文件，没有 .md——编译产物落在使用方项目的 `.pi/agents/*.md`，不在本插件内。`lib/readers/` 目录已空（SSOT 重构移除 SettingGraphReader 后），不要试图恢复该模块。

## References

- SPECIFICATION.md (TechSpokes/agency-specifications-files-agents-md) – AGENTS.md 文件格式规范
- docs/compiler-design-v1.md – 编译器设计 v1 状态
