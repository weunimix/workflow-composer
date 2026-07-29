# workflow-composer

OOP template compiler for pi workflows and agents. Build modular, composable workflow functions with `extends` / `slots` / `mandatory` blocks.

支持两种 agent 源格式：

- **procedural 模板**（`.md`）——基于 frontmatter + body 的传统路径，适合简单 agent
- **OO class**（`.ts`）——基于 TypeScript class + 5 段 prompt 结构契约，适合复杂 agent

两种源都产出 LLM-readable procedural markdown 系统提示词。

## Install

```bash
pi install git:github.com:weunimix/workflow-composer@v0.1.0
```

For private org access, configure SSH keys first:

```bash
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

## Commands

```bash
# procedural 模板编译
workflow-composer build            # compile workflows + agents
workflow-composer build --agents   # compile agents only
workflow-composer init             # initialize template directories

# OO class 转译（TS → procedural markdown）
tsx src/translator/cli.ts <path-to-agent-ts>             # 输出 procedural markdown
tsx src/translator/cli.ts --json <path-to-agent-ts>     # 输出 ParsedAgent JSON
```

## Quick Start

### Procedural 模板

```bash
cd your-pi-project
workflow-composer init
# creates .pi/agent-templates/workflows/ and agents/

# Create template, then compile:
workflow-composer build
# outputs to .pi/workflows/ + _index.md
```

```yaml
---
name: my-agent
description: 临时通用 subagent
extends: agents/_agent
slots:
  role_title: 通用临时 subagent
  role_description: |
    处理各种一次性小型任务。
  core_mission: |
    识别任务类型 → 列文件 → 完整读取 → 执行 → 输出。
  workflow: |
    ### 第 1 步：理解任务
    ...
---
```

### OO Class

创建 `.ts` agent class extends `_Agent`：

```typescript
// .pi/agent-templates/agents/foundation-loader.ts
import { _Agent } from 'workflow-composer/lib/agents/_agent.js'

export class FoundationLoader extends _Agent {
  // 段 1 frontmatter: tools / context / systemPromptMode（基类默认）
  
  // 段 2 abstract: identity / task
  readonly identity = '底层约束加载器'
  readonly task = '加载项目底层约束并排除不可能的方向'
  
  // 段 3 mandatory: 4 条硬约束由基类强制注入
  
  // 段 4 abstract: workflow
  readonly workflow: readonly _WorkflowStep[] = [
    { name: 'detect_stale', description: '...', procedure: ['...'] }
  ]
  
  // 段 5 abstract: outputFormat
  readonly outputFormat = '按 9 段结构输出'
}
```

转译为 procedural markdown：

```bash
tsx workflow-composer/src/translator/cli.ts \
   .pi/agent-templates/agents/foundation-loader.ts
```

## 5 段 Prompt 结构

每个 agent（无论源格式）的产物都遵循：

| 段 | 内容 | OO class 表达 | procedural 模板表达 |
|---|---|---|---|
| 1 | frontmatter | `readonly tools/context/systemPromptMode` | YAML frontmatter |
| 2 | 身份 + 任务 | `abstract readonly identity/task` | `role_title` + `role_description` + `core_mission` |
| 3 | mandatory（4 条硬约束） | 基类静态常量 `AGENT_MANDATORY` | `<!-- mandatory:start -->` 块 |
| 4 | 工作流程 | `abstract readonly workflow: _WorkflowStep[]` | `workflow` slot |
| 5 | 输出规范 | `abstract readonly outputFormat` | `output_format?` slot |

## Mandatory 块（4 条硬约束）

所有 agent 强制继承：

1. **显式文件列表**——需读取的文件必须逐文件列出完整路径
2. **上下文利用条款**——1M 上下文完整读取，禁止跳读
3. **不确定性声明**——输出末尾必须包含不确定性声明段落
4. **Subagent 调用安全**——禁止同时设置 `async:false` / `concurrency:>1` / `output:false` / `progress:false`

procedural 模板通过 `<!-- mandatory:start -->` 块强制注入；OO class 通过 `AGENT_MANDATORY` 常量静态导入（X 方案）。

## Directory Structure

```
workflow-composer/
├── lib/                         # 基类库
│   ├── agents/
│   │   ├── _agent.md            # procedural 模板基类（abstract）
│   │   ├── _agent.ts            # OO class 基类（abstract，5 段契约）
│   │   ├── _multi-agent.md
│   │   └── mandatory.ts         # 4 条 mandatory 静态常量
│   └── workflows/
│       └── _workflow.md         # 工作流基类
├── src/                         # 编译器源码
│   ├── compiler.mjs             # 主编译器入口
│   ├── parser.mjs               # YAML frontmatter 解析
│   ├── resolver.mjs             # 继承链解析
│   ├── rules.mjs                # 合并规则
│   └── translator/              # OO → procedural 转译器
│       ├── parser.ts            # TS Compiler API 解析 class
│       ├── renderer.ts          # 5 段 markdown 渲染
│       ├── cli.ts               # CLI 入口
│       └── fixtures/            # 测试 fixture
└── spec/                        # 规范
    └── template-spec.md
```

## Specification

- `USAGE.md`——用法细节、设计模式、反模式
- `spec/template-spec.md`——模板字段规范、合并流程、继承解析
