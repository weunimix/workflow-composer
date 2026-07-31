# workflow-composer 编译器设计 v1.1

> 状态：v1.1 完成（**Runtime 派**——TS 运行时处理 OOP，compiler 仅做 instantiate+render，约 80 行）
> 时间：2026-07-30
> 关联文档：[workflow-composer-source-design-v1.md](./workflow-composer-source-design-v1.md)

## 1. 范围

本文档定义 workflow-composer 编译器（项目内 `src/compiler.ts`）的职责与实现细节。

**核心职责**：把 OOP 风格的 TypeScript agent 源码（`.ts`），转化为 pi-subagents 插件可识别的 `.md` 系统提示词。

**实现哲学（Runtime 派）**：不自行实现 OOP 运行时——TS 编译器已经是。compiler 做的事：

1. `import` 用户提供的 agent 类（TS 模块加载）
2. `new` 实例化（TS 内存构造）
3. 调用方法（TS 自动按继承链、虚方法表分派）
4. 拼接返回值到 .md 文本（领域逻辑）
5. `writeFile` 落到 `.pi/agents/`（领域逻辑）

**不涵盖**：

| 项 | 出处 |
|---|---|
| 源侧（用户/框架）语法设计 | `source-design-v1.md` |
| 编译产物的运行时行为 | 由 pi-subagents 处理 |
| workflow 类型模板的编译 | 本期不做 |

## 2. 输入契约

编译器加载的 TS 模块假设：

| 维度 | 约束 | 来源 |
|---|---|---|
| 语言 | TypeScript 5+ | `source-design-v1` §9 |
| 装饰器 | TC39 stage 3 decorators（值塞进静态字段） | `source-design-v1` §9, §7.2 |
| 入口文件 | `agents.config.ts`，导出 `export const agents = [ClassA, ClassB, ...]` | 本文档 §4 |
| 类约束 | 至少一个 `extends BaseAgent` 的 concrete class | `source-design-v1` §7.6 |
| 必填（class-level） | `@description('...')`、`@config({...})` | `source-design-v1` §7.2 (U1, U2) |
| 必填（method-level） | `summary(): string`、`getSteps(): string[]`、`buildOutput(): string` 三个 abstract | `source-design-v1` §7.2 |
| 可选 override | 三个 hook（`shouldDo`/`shouldNot`/`watchOut`）默认空实现 | `source-design-v1` §7.2 |
| 构造器 | **必须无参**（compiler 写死 `new AgentClass()`） | 本文档 §6 |
| 方法纯度 | hook / summary / buildOutput / getSteps **必须无副作用**（compiler 真的会调） | 本文档 §6 |

**编译期不需要做的事情（TS 运行时已经做）**：

- 解析类继承链：TS 在 `import` 时已经 `extends` 解析
- 解析方法 override：TS 在 `new` 时已经按 vtable 分派
- 跨类方法调用（`new X().method()`）：TS runtime 直接求值
- 数组 / 模板字面量求值：TS runtime 直接求值

## 3. 输出契约（MVP）

**MVP 输出**：仅 `<name>.md` 文件，落到 `.pi/agents/`。

### 3.1 文件命名

`<source class name>` → kebab-case：

| 类名 | 输出文件名 |
|---|---|
| `WebResearcher` | `web-researcher.md` |
| `Worker` | `worker.md` |

### 3.2 文件内容

完全遵循 `source-design-v1` §5 / §7.5：

```markdown
---
name: <kebab-case-class-name>
description: <description>
tools/context/systemPromptMode/...: <from @config>
---

# Identity
<summary() prose>

## Should do / Should not / Watch out    ← 三个 hook 列表（每行 `- ` 前缀）
...

# Task
[步骤序列由 getSteps() 提供]

### 第 1 步：<step name 1>
### 第 2 步：<step name 2>
...

# Output
```markdown
<buildOutput() return>
```
```

### 3.3 frontmatter 字段

MVP 字段：

| 字段 | 来源 |
|---|---|
| `name` | kebab-case(class name) |
| `description` | `Class.description`（@description 装饰器写入的静态字段） |
| `tools` | `Class.config.tools`（@config 装饰器写入的静态字段） |
| `context` | `Class.config.context` |
| `systemPromptMode` | `Class.config.systemPromptMode` |
| `inheritProjectContext` | `Class.config.inheritProjectContext` |
| `inheritSkills` | `Class.config.inheritSkills` |
| 其他 `@config` 字段 | 透传 |

### 3.4 与 pi-subagents 兼容

- 输出位置 `.pi/agents/` = 插件最高优先级扫描位置（依据 `subagent-plugin-analysis.md` §1）
- frontmatter `name` + `description` 必填（依据 `subagent-plugin-analysis.md` §2.1）

## 4. 项目结构

按三个物理模块划分：

```
workspace-project/
│
├── workflow-composer/                       ← 本编译器项目
│   │
│   ├── src/                                ← 【编译代码模块】
│   │   └── compiler.ts                     ← Runtime 派实现（~80 行）
│   │
│   ├── lib/                                ← 【原文件模块】- 框架层
│   │   ├── agents/
│   │   │   └── base-agent.ts               ← 抽象基类 + public compileOutput()
│   │   └── decorators/
│   │       ├── description.ts              ← @description → Class.description
│   │       └── config.ts                   ← @config → Class.config
│   │
│   ├── agents/                             ← 【原文件模块】- 用户具体 agent
│   │   ├── researcher.ts
│   │   └── worker.ts
│   │
│   ├── agents.config.ts                    ← 列出要编译的 agent 类
│   │   (eg: export const agents = [WebResearcher, Worker])
│   │
│   ├── tsconfig.json
│   ├── package.json
│   └── cli.mjs                              ← 历史保留入口（本次不重写）
│
├── .pi/
│   └── agents/                             ← 【产物模块】（编译器输出到此处）
│       ├── web-researcher.md
│       └── worker.md
│
└── ...
```

## 5. 编译步骤（3 阶段）

### 5.1 Phase 1 — Configuration Load

**目标**：拿到要编译的 agent 类引用列表。

**动作**：

1. `import { agents } from '../agents.config'`
2. 拿到 `Array<typeof BaseAgent>` 即类引用列表

**约束**：编译器不"扫描"文件——类引用由用户在 `agents.config.ts` 显式列出。这是 Runtime 派的**入口约束**。

### 5.2 Phase 2 — Instance + Method Call

**目标**：通过 TS 运行时拿到每个 agent 的 metadata。

**per-class 动作**：

1. `const instance = new AgentClass()`  ← TS runtime 构造
2. `const meta = instance.compileOutput()` ← 调用公共读取入口（BaseAgent 实现）
3. `compileOutput()` 内部逐项调用：
   - `this.summary()`              ← TS 走继承链找到具体实现
   - `this.shouldDo()`             ← 同上
   - `this.shouldNot()`            ← 同上
   - `this.watchOut()`             ← 同上
   - `this.getSteps()`             ← 同上
   - `this.buildOutput()`          ← 同上
4. 同时读取 `(this.constructor as any).description` 与 `(this.constructor as any).config` ← 装饰器写入的静态字段

**Runtime 自动处理**：

- 类继承：TS 在 `new` 时已构造好完整实例
- super.x() 调用链：TS 在方法调用时按 MRO 查找
- 跨类引用（`new Other().method()`）：TS 真正的运行时求值
- Mixin 模式：TS 函数式继承标准支持

### 5.3 Phase 3 — Render + Emit

**目标**：拼接 .md 并写到磁盘。

**per-class 动作**：

1. frontmatter = `name: ${kebab}` + `description: ${meta.description}` + `@config` 字段展开
2. `# Identity` = `summary()` 文本
3. `## Should do` / `## Should not` / `## Watch out` = 三 hook 列表（D5 渲染规则）
4. `# Task` = `### 第 N 步：<name>` × N（N = `getSteps().length`）
5. `# Output` = `buildOutput()` 包在代码块里
6. `writeFileSync(`./.pi/agents/${kebab}.md`, md)`

### 5.4 总流程

```
读 agents.config.ts
   ↓
foreach AgentClass in agents:
   ↓
   new AgentClass()  ← TS runtime
   ↓
   meta = instance.compileOutput()  ← 调用 protected 钩子
   ↓
   拼接 .md
   ↓
   writeFileSync
```

整个 pipeline 没有 AST 遍历、没有类型检查调用、没有手工实现的 OOP 分析。

### 5.5 并行性

每个 agent 独立处理；可并发生成 .md（MVP 顺序即可）。

## 6. 错误处理与约束

### 6.1 Runtime 错误（最常见）

| 错误源 | 触发条件 | 表现 |
|---|---|---|
| 缺少构造器参数 | `new AgentClass()` 抛 `TypeError` | tsx 编译期报错 |
| 钩子方法有副作用 | 实际执行了 console.log 等 | 副作用污染产物 |
| 钩子方法返回 undefined | 实例方法没实现 | TS 编译期会报错（abstract） |
| 缺 @description / @config | 静态字段为 undefined | 渲染 .md 时缺字段 |

### 6.2 设计级约束（用户必须遵守）

| 约束 | 来源 |
|---|---|
| 构造器必须无参 | compiler 写死 `new AgentClass()` |
| hook / summary / buildOutput / getSteps 必须纯函数 | compiler 真调用 |
| @description 与 @config 是 metadata 注入方式 | Stage 3 decorators（运行时无反射，需自管存储） |

### 6.3 错误传播（已演示）

如果 Researcher.shouldDo 改了，Worker 通过 `...this.researcher.shouldDo()` 自动拿到新内容。不需要任何额外机制。

## 7. (已解决) TS 5+ stage 3 decorator 运行时反射

**已被 Runtime 派原生解决**。Stage 3 decorators 的值通过 `target.description = text` 这种"装饰器写入静态字段"的方式在类定义时即存储，运行时直接 `Class.description` 可读。不需要反射标准（reflect-metadata）的额外依赖。

## 8. (已解决) 合并算法（hook 列表 / step 编号 D7）

**已被 TS 运行时原生解决**。`[...this.researcher.shouldDo(), '...']` 这种 spread 由 TS runtime 直接处理，无需 compiler 实现合并算法。

## 9. (已解决) 跨文件继承解析

**已被 TS `import` 原生解决**。`import { WebResearcher } from './researcher'` 由 Node/tsx 模块加载系统解析并执行。compiler 不需要做这件事。

## 10. CLI 接口

当前 MVP 用 `npx tsx src/compiler.ts` 调用。`package.json` 已加 `"scripts": { "build": "tsx src/compiler.ts" }` 支持 `npm run build`。

CLI 参数（如 `--input <dir>`）未实现——MVP 不需要。当前约定：
- 输入：项目根 + `agents.config.ts`
- 输出：项目根 + `.pi/agents/`
