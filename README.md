# workflow-composer

OOP template compiler for pi workflows and agents. Build agents as TypeScript classes that extend `BaseAgent`, compile them into procedural markdown system prompts.

## Architecture

Only one agent source format is supported:

- **Runtime 派 OO class**（`.ts`）——TypeScript class extends `BaseAgent`（or `GeneralBase`），TS evaluates OOP at runtime, compiler writes `.pi/agents/<kebab-class-name>.md`

Source structure:

```typescript
import { BaseAgent } from 'workflow-composer/lib/agents/base-agent'
import { description } from 'workflow-composer/lib/decorators/description'
import { config } from 'workflow-composer/lib/decorators/config'

@description('我的 agent 描述')
@config({
  tools: 'read',
  context: 'fresh',
  systemPromptMode: 'replace',
  inheritProjectContext: 'false',
  inheritSkills: 'false'
})
export class MyAgent extends BaseAgent {
  public summary(): string { return '你是 ...' }
  public shouldDo(): string[] { return [...] }
  public shouldNot(): string[] { return [...] }
  public watchOut(): string[] { return [...] }
  public getSteps(): string[] { return ['step1', 'step2'] }
  public buildOutput(): string { return '...' }
}
```

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
# Compile all agents defined in agents.config.ts
npm run build
# Output: .pi/agents/<kebab-class-name>.md
```

## Mandatory Block (4 hard constraints)

All agents inherit these through `GeneralBase.HARD_CONSTRAINTS` (or via the rendered markdown):

1. **显式文件列表**——需读取的文件必须逐文件列出完整路径
2. **上下文利用条款**——1M 上下文完整读取，禁止跳读
3. **不确定性声明**——输出末尾必须包含不确定性声明段落
4. **Subagent 调用安全**——禁止同时设置 `async:false` / `concurrency:>1` / `output:false` / `progress:false`

## Directory Structure

```
workflow-composer/
├── lib/
│   ├── agents/
│   │   ├── base-agent.ts        # 抽象基类
│   │   └── general-base.ts      # 通用基类（独立视角 + 4 条通用纪律 + 2 个辅助方法）
│   ├── decorators/
│   │   ├── description.ts       # @description 装饰器（TS stage 3）
│   │   └── config.ts            # @config 装饰器（TS stage 3）
│   └── readers/                # （空目录——SettingGraphReader 于 SSOT 重构中移除）
├── agents/                      # Runtime 派 OO class 源
│   ├── researcher.ts
│   ├── worker.ts
│   ├── foundation-loader.ts
│   ├── system-audit-agent.ts
│   └── node-review-agent.ts
├── agents.config.ts             # Runtime 派用户配置（列出要编译的 agent 类）
├── src/
│   └── compiler.ts              # Runtime 派编译器（import → new → compileOutput() → 写文件）
└── docs/
    ├── source-design-v1.md      # 源侧 OOP 体系设计
    └── compiler-design-v1.md    # 编译器设计
```

## Specification

- `docs/source-design-v1.md`——源侧 OOP 体系设计（identity / task / hook methods / abstract methods / 5 段契约）
- `docs/compiler-design-v1.md`——Runtime 派编译器设计
