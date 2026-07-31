# workflow-composer 源侧 OOP 体系设计 v1

> 状态：v1.2 完成（Runtime 派实现 + 审查类共享 abstract 层级 + SettingGraphReader 提取模块——见 §11）
> 时间：2026-07-30

## 1. 范围与目标

本设计文档定义 workflow-composer 源侧（TypeScript）的 OOP 建模方案，
目标是用面向对象思想构建系统提示词，并经编译转化为 subagent 插件可识别的 .md 文档。

## 2. 已锁前提（P 层）

| ID | 内容 |
|---|---|
| P1 | 系统提示词可拆分为三段：身份 / 任务 / 输出 |
| P2 | 函数有三段：参数 / 流程 / 返回值 |
| P3 | P1 三段与 P2 三段同构（类比）；身份段不对应"参数" |
| P4 | OOP 是把过程/函数模块化的手段 |
| P5 | 源侧 = TypeScript 代码，具有高度面向对象特性 |

## 3. 已锁 U 层

| ID | 内容 | 状态 |
|---|---|---|
| U1 | 身份段 = 行为约束集合（应该 / 不该 / 注意） | ✅ |
| U1.子项 | 身份段位置 = .md body 的 H1 段 | ✅ |
| U2 | 已移除（用户表示无具体指代） | ✅ |
| U3 | 粒度 = 3（identity / task / output 三个顶层 OOP 单元） | ✅ |
| U4 | OOP 能力子集（Runtime 派下天然支持继承 + 组合；Tier B/C 失去意义） | ✅ |
| U5 | 三段独立可复用 + 软条件（破坏 OOP 时可放弃） | ✅ ⚠️ |
| U6 | 访问控制（默认约定已锁定；详见 §7.6） | ✅ |
| U7 | 任务↔template method；输出↔abstract method；身份↔hook methods | ✅ |
| U8 | 粒度可演化（默认=3，段可由子段组成） | ✅ |
| U-Composite | 完整 Composite Pattern 设计（基础纵向组合已支持；跨继承链多模块自由组合延后到 U4） | ⏸ |
| 5 岔路口 | A=TS / B=abstract class 为主 / C=单+多文件 / D=主流 OOP / E=H1/H2 章节 | ✅ |

## 4. 推导终点（主结论）

### 4.1 语言层
TypeScript，abstract class 为骨架，interface 为可选辅助。

### 4.2 顶层 OOP 单元
一个 agent 提示词 = identity + task + output 三段组合：
- identity ← hook methods（默认实现 + 子类 override）
- task ← template method（控制流程骨架）
- output ← abstract method（强制 schema）

### 4.3 .md 产物结构
参见 §5。

### 4.4 模块化复用 + 可演化
- 三段独立可复用（继承 / 跨文件 import）
- 每段可由子段组成（U8 保证 3→N 的演化方向）
- 反向聚合不被允许（避免破坏段级共享契约）

## 5. 终产物精确结构

### 5.1 字面结构（基于 系统提示词模板.md）

模板 `general-purpose.md` 的实际骨架按标题层级：

| 层级 | 元素 | 内容性质 |
|---|---|---|
| — | `You are \`X\`: ...` + bullet 列表（任务范围） | 角色引入 + 任务范围 |
| ## | 处理原则 | 行为约束（多条） |
| ## | 工作流程 | 流程骨架 |
| ### | 第 N 步 | 具体步骤 |
| ## | 输出格式 | 输出 schema |

frontmatter 实际用到的字段：`name`、`description`、`tools`、`context`、`systemPromptMode`、`inheritProjectContext`、`inheritSkills`（共 7 个）。

### 5.2 映射到 {Identity, Task, Output} 框架

| 模板字面元素 | 框架映射 |
|---|---|
| `You are X: ...` + 任务范围 | Identity 段（介绍 + 范围） |
| `## 处理原则`（含 5 条约束） | Identity 段（约束类内容，按 U1 拆为 3 hook） |
| `## 工作流程` + 5 个 `### 第N步` | **Task 段**（template method + abstract step 方法） |
| `## 输出格式` | **Output 段**（abstract buildOutput 方法） |

### 5.3 终产物结构示意

```markdown
---
name: <name>
description: <...>
tools: ... (其余配置字段)
---

# Identity

[summary() 返回的中文 prose]

## Should do
[shouldDo() 返回的列表项]
...

## Should not
[shouldNot() 返回的列表项]
...

## Watch out
[watchOut() 返回的列表项]
...

# Task
[template method 控制的固定步骤]

### 第 1 步：理解任务
### 第 2 步：列文件清单
### 第 3 步：完整读取
### 第 4 步：执行任务
### 第 5 步：输出

# Output
[abstract buildOutput 强制 schema]
```

## 6. 源↔产物映射

### 6.1 已锁映射

| 产物 .md 元素 | 源侧 TS 元素 |
|---|---|
| frontmatter `name` | class name |
| `# Identity` H1 | abstract class 的身份段成员聚合 |
| `## Should do / Should not / Watch out` H2 | 三个 hook methods |
| `# Task` H1 | abstract class 的 template method |
| `### 第 N 步：<别名>` | template method 内部调用的 abstract step 方法；编号由编译器自动生成；中文冒号后别名按 D7 规则优先级取（见 §7.5） |
| `# Output` H1 | abstract class 的 abstract buildOutput |

### 6.2 已定映射

| 产物元素 | 源侧 TS 元素 |
|---|---|
| frontmatter `description` | `@description('...')` 装饰器（中文） |
| frontmatter `tools / context / systemPromptMode / ...` | `@config({...})` 组装饰器 |
| Identity 段开头 prose（`You are X: ...` 中文版） | abstract `summary(): string` 方法 |
| "任务可能包括" 范围列表 | `shouldDo(): string[]` hook 方法（归入 `## Should do`） |

## 7. 源侧语法设计

### 7.1 必需的 TS 语法能力（已锁事实可推导）

| 能力 | 用途 | 依据 |
|---|---|---|
| `abstract class` | 基类骨架 | P5 + B |
| `abstract method` | 强制子类实现 output / step | U7 |
| concrete method 调用 abstract | template method 骨架 | U7 |
| hook 方法 + override | identity 段三 hook | U7 + U8 |
| `extends` 同/跨文件 | 继承链 | C |
| `import`（跨文件继承） | 多文件场景 | C |

### 7.2 已定语法项

| ID | 源侧 TS 形式 | 用途 / 上下文 |
|---|---|---|
| U1 | `@description('...')` 装饰器（值写入 `Class.description` 静态字段，运行时读取） | frontmatter `description`（identity-defining，中文） |
| U2 | `@config({...})` 组装饰器（值写入 `Class.config` 静态字段，运行时读取） | frontmatter `tools / context / systemPromptMode / ...`（operational） |
| U3 | `abstract summary(): string` 方法 | Identity 段开头 prose（中文；强制每 concrete agent 实现） |
| U4 | `shouldDo(): string[]` hook 方法 | `## Should do` 内容（含"任务可能包括" 范围列表） |
| U5 | `protected methodName(): T { return default }` + 子类 `override + [...super.x(), ...]` 组合 | hook 默认值表达形式 |
| U6 | 严格归类到 3 hook（Should do / Should not / Watch out） | 处理原则类内容的归类策略 |

### 7.3 处理原则归类判定准则（来自 U6）

| hook | 判定标准 |
|---|---|
| Should do | agent 应做的具体行为（"应 X"） |
| Should not | agent 应避免的行为（"应不 X"、"不要 X"） |
| Watch out | 条件性 / 警戒性约束（"如果 X 则 Y"、"必须警惕 X"） |

### 7.4 组合 Pattern 维度（已被 Runtime 派原生解决）

| 维度 | 当前状态 |
|---|---|
| 基础纵向组合（`super.method()` + override） | ✅ 已支持（U5 已涵盖） |
| 跨 sibling 组合（`this.researcher.method()` 通过 `has-a` + 调用） | ✅ Runtime 派下 TS 自动支持 |
| 多模块自由组合（Mixin / 跨继承链 / 任意来源拼接） | ✅ 通用方式：本机实例 + 调用，不用额外语法 |
| 编译期合并算法 | N/A——Runtime 派不需要合并，TS 运行时直接求值 |

**Runtime 派结论**：不引入显式 Composite 类。基本组合（继承 + `super.x()` + 组合 `has-a`）由 TS 直接处理。提取复用逻辑走"abstract 基类"或"共享 reader 模块"路径（见 §11）——而非 Composite Pattern 这条路。

### 7.6 Access 默认修饰符约定（来自 U6；v1.1 修改）

| 成员类型 | 默认 access | 备注 |
|---|---|---|
| `BaseAgent` class | `export abstract`（public 导出） | 子类继承公共入口 |
| `summary()` | `public abstract` | Runtime 派下跨类可访问 |
| 3 hook methods（`shouldDo / shouldNot / watchOut`） | `public` | Runtime 派下允许 sibling 类实例跨类访问 |
| `getSteps()` | `public abstract` | Runtime 派下与 summary 同理由 |
| `buildOutput()` | `public abstract` | 同上 |
| **子类自定义成员** | **用户自选**（private / protected / public） | 不规定 |

**v1.1 修订理由（protected → public）**：Runtime 派下跨类组合（`Worker.researcher.shouldDo()`）要求从 sibling 类实例访问。TS `protected` 不允许这种访问，同时 TS 继承可见性 variance 规则要求子类不能比父类变窄——父类 public → 子类也必须 public。

**子类自由度边界**：
- 子类默认继承 `public` access（与基类一致）——⚠️ 如需 protected 重写会被 tsc 拒绝
- 用户自定义成员仍可自由选 private / public
- `compileOutput()` 是 framework 的公共读取入口——子类按需可 override

---

### 7.5 已定约束（来自自检 D5 / D6 / D7；D2 已重写见下）

| ID | 约束 |
|---|---|
| **D2**（重写） | Task 段步骤由 `getSteps(): string[]` 方法返回（替代原 template-method + AST 解析）。Runner 调 `instance.getSteps()` 直接拿 name 列表。`### 第 N 步：<name>` 由 compiler 自动编号。 |
| **D5** | hook 返回 `string[]` 渲染规则：每 item 默认单行 markdown；编译产物自动加 `- ` 前缀成 bullet；若 item 字符串内含 `\n` 则原样保留并渲染为多行 |
| **D6** | `@description` = 工具视角描述（用户从工具列表中选中 agent 时看到）；`summary()` = agent 运行时视角的身份定位（agent 本身读到）。两者职责不同，不强制内容一致 |
| **D7** | task 段步骤编号由编译器自动生成 `第 N 步`；别名取自 `getSteps()` 返回的 name（后续可扩展为优先级 ① → ④） |

## 8. 开放项汇总

| 编号 | 内容 | 何时回来 |
|---|---|---|
| 原 U4 | OOP 能力子集 | ✅ 已由 Runtime 派 + AuditBase + SettingGraphReader（§11）完全解决 |
| 原 U5 软条件 | "b 破坏 OOP 时可放弃"——执行后做检查点 | 框架实现后验证 |
| 编译管线 + 项目结构 + Runtime 派实现 | 已迁移至 [workflow-composer-compiler-design-v1.md](./workflow-composer-compiler-design-v1.md) | — |

## 9. 技术前提（来自 D1）

| 项 | 值 | 影响 |
|---|---|---|
| TypeScript 版本 | **TS 5+** | 支持 native stage 3 decorators |
| Decorator 标准 | **TC39 stage 3** | 与 legacy `experimentalDecorators` 不兼容 |
| 装饰器作用域 | class-level | `@description` `@config` 等仅作用于类声明本身 |

**编译配置要求**：

| 配置 | 值 | 说明 |
|---|---|---|
| `tsconfig.json` `target` | `ES2022` 或更高 | 支持 stage 3 decorators 的核心 ES 能力 |
| `experimentalDecorators` | `false` | 与 stage 3 互斥 |
| `useDefineForClassFields` | 视情况 | 与 decorator 与 field 初始化顺序相关 |

**已锁定假设**：未来对接 subagent 插件时，若需要运行时反射元数据，按 TS 5+ 内置能力处理（暂不引入 `reflect-metadata` 等额外依赖）。

## 10. OOP 能力决策记录（来自 U4 讨论）

### 10.1 Tier A — 已锁定

见 §3 / §7.1 / §7.2 / §7.5。

### 10.2 Tier B — v2 候选

| 模式 | 决策 |
|---|---|
| ~~Composite Pattern（完整）~~ | ~~v2 优先；基本纵向组合已支持；完整形式（多源自由拼接）待 §2 中段合并算法~~ **已被 Runtime 派原生解决（继承 + 组合 + super 调用）**——delete |
| **Decorator Pattern**（行为装饰） | v2 推荐；用于给 agent 加可选行为（计时 / 强制约束 / 监控等）；与 metadata 装饰器不冲突（前者管行为，后者管 metadata） |

### 10.3 Tier B — 暂不纳入（除非有强需求）

| 模式 | 暂不纳入的理由 |
|---|---|
| Mixin | TS mixin 与 `super.method()` 组合语义冲突；除非有强需求再开 |
| Strategy | 当前 agent 是 stateless 的；`tools` 字段已足够支持行为选择 |

### 10.4 Tier C — 明确不纳入

| 模式 | 不纳入的理由 |
|---|---|
| State Pattern | agent 是 stateless 的 |
| Visitor / Iterator / Observer / Chain of Responsibility | 当前 prompt 编译产物为静态文本，无需这些动态结构 |
| Memento / Command | 不适用 |
| Factory / Builder | 与 abstract class 直接实例化相比无增益 |

## 11. 提取模块（v1.2 实装层）

> Runtime 派实现里多出了两个非 agent 模块——它们不是"可编译的 agent"，而是**被多个 agent 复用的代码资产**。本节记录它们的存在、职责边界与使用方式。

### 11.1 AuditBase · 审查类共享 abstract 层级

**位置**：`lib/agents/audit-base.ts`

**继承链**：`AuditBase extends BaseAgent`

**存在的理由**：审查类 agent（Mode A 系统审计 / Mode B 节点审查）有几条**完全相同**的硬约束——见原 .pi/agents/审查引擎.md 的"硬约束（不可违反）"段。直接重复在两个 agent 里会漂移。AuditBase 把这些公共约束集中在一处，子类通过 `${this.HARD_CONSTRAINTS}` 引用。

**提供的内容**：

| 成员 | 类型 | 用途 |
|---|---|---|
| `HARD_CONSTRAINTS` | `protected readonly string` | 4 条 mandatory 文本（显式文件列表 / 完整读取 / 不确定性声明 / Subagent 4 参数禁忌） |
| `workdirNote()` | `protected method` | "工作目录为项目根"声明文本 |
| `uncertaintyTableTemplate()` | `protected method` | 不确定性声明段的 markdown 模板 |

**使用方**：
- `agents/system-audit-agent.ts` — `extends AuditBase`，在 `summary()` 注入 `${this.HARD_CONSTRAINTS}`
- `agents/node-review-agent.ts` — `extends AuditBase`，同上
- 未来追加的审查类 agent 应继承 AuditBase 而非 BaseAgent

### 11.2 SettingGraphReader · 标准检索模块

**位置**：`lib/readers/setting-graph-reader.ts`

**它的来源**：从 foundation-loader.md 的核心能力"通过设定图谱规范检索约束"提炼出来。Mode A 也在做"约束链检查"（与 foundation-loader 的检索逻辑部分重合），但 Mode A 不调用 foundation-loader 的 subagent——只共享**输入数据源**（同一份 设定图谱.md）。

为了避免"两类功能各自 inline 重复实现"，把这个流程做成了一个可复用的纯 TS 类。

**类签名**：

```typescript
class SettingGraphReader {
  // A. domain → 加载组合（Layer 1-2 文档路径）
  getLoadingCombination(domain: string): string[]

  // D. domain → 同域活跃节点列表
  getActiveNodesByDomain(domain: string): NodeSummary[]

  // E. 主流程：domain → 完整约束摘要
  loadConstraintsByDomain(domain: string): ConstraintSummary

  // 渲染约束摘要为可读 markdown
  renderConstraintSummary(summary: ConstraintSummary): string
}
```

**MVP 数据来源**：现阶段硬编码（来自 设定图谱.md 的一、三、六、二章节）。工程化后可改为从 YAML 文件加载——但**不**改公共 API。

**使用方**：
- `agents/foundation-loader.ts` — `private reader = new SettingGraphReader()`，源码层声明它可用
- 未来 Mode A / Mode B 也可 import 这个 reader 用于约束链检查（待评估）

### 11.3 已重写的具体 agents

| 源 .md 文件 | Runtime 派 TS 类 | 行为说明 |
|---|---|---|
| `.pi/agents/审查引擎.md`（模式 A 段）| `agents/system-audit-agent.ts` | 五层递进扫描；产出 Finding + 协同修改清单；不修复 |
| `.pi/agents/审查引擎.md`（模式 B 段）| `agents/node-review-agent.ts` | 单节点锚点对照检查；产模式 B 报告 |
| `.pi/agents/foundation-loader.md` | `agents/foundation-loader.ts` | 三重职责：约束摘要 + 排除分析（用 SettingGraphReader） |
| `.pi/agents/system-auditor.md` | **不翻译** | 已标 `deprecated: true`，由 Mode A 取代 |
| 其他 5 个 .md（conclusion-reviewer / fill-reviewer / naturalist / skeleton-validator / web-researcher）| **尚未重构** | 待后续轮次逐个评估是否需要 Runtime 派化 |

### 11.4 两个 runtime 形态

模块结构在两个 runtime 都有体现：

| Runtime | 模块化形态 | 谁写谁读 |
|---|---|---|
| **Compiler (TS)** | 真正的 TS 类 + import | 每个 agent .ts 文件 `import { AuditBase } from '../lib/agents/audit-base'` |
| **Subagent (.md runtime)** | 标准化 prompt 文本 | 每份 .md 输出里有相同的"硬约束"四段文本——通过 AuditBase 在编译期注入，确保各 agent .md 看起来一致 |

TS 模块与 prompt 文本**两边都同步维护**：TS 改 AuditBase → 所有继承 agent 的 .md 输出都改；这种冗余是合理的——compile-time / runtime 都一致。

### 11.5 跨类关系图

```
BaseAgent（所有 agent 的根）
   ├─ WebResearcher（直接 extends）
   ├─ Worker（直接 extends，演示 has-a 复用）
   ├─ FoundationLoaderAgent（直接 extends，持有 SettingGraphReader）
   │
   └─ AuditBase（extends BaseAgent，引入审查类硬约束）
      ├─ SystemAuditAgent（模式 A）
      └─ NodeReviewAgent（模式 B）

lib/readers/setting-graph-reader.ts
   └─ FoundationLoaderAgent 持有（架构上可扩展到 Mode A）
```

### 11.6 模块化策略的元判断

| 问题 | 答案 |
|---|---|
| 什么时候提炼新模块？ | 当 ≥2 个具体 agent 用到相同的能力 / 硬约束 / 数据访问时 |
| 走 abstract 基类（AuditBase）还是共享类实例（SettingGraphReader）？ | **is-a 关系**（如"我是一种 AuditAgent"）→ abstract 基类；**has-a 关系**（如"我用 SettingsGraphReader 做事"）→ 共享类实例 |
| 应该走 Mixin 吗？ | 一般不——除非你确实需要把同一个 trait 叠加到多个不相关的类上 |
| Module 提炼后，原有的 .md 是否改 | 保留旧 .md 作为历史参考；Runtime 派新 agent 独立存在 |
