# workflow 体系 OOP 方法论·综合指南

> 用途：未来构建 `workflow-composer` OOP workflow 时参考
> 来源：
> - 项目自身设计：`docs/source-design-v1.md`（v1.2）、`docs/compiler-design-v1.md`、`docs/oop-methodology.md`
> - 通用 OOP 知识：SOLID 原则、Template Method / Hook（GoF）
> - Pi prompt template 协议：`.pi/agent-templates/...`、`.pi/prompts/...`
>
> 文档定位：**不是教科书**——只记「与本项目 workflow 框架相关、可操作的」原则
> 时间：2026-08-03

---

## 0. 范围与位置

本份文档定义 workflow 体系的 OOP 建模方案。它与 `oop-methodology.md`（agent 体系）**对称存在**：

| 维度 | agent 体系 | workflow 体系 |
|------|-----------|--------------|
| 编译产物 | `.pi/agents/<name>.md`（subagent 7 字段格式）| `.pi/prompts/<name>.md`（prompt template 3 字段格式）|
| 运行时 | 独立新会话（FRESH / fork）| 当前会话（继承上下文）|
| 基类 | `BaseAgent` / `GeneralBase` | `BaseAgent` / `WorkflowBase` |
| 共享方法论文档 | `oop-methodology.md` | **本份文档** |

两套体系**共享** 5 段契约骨架、3 hook 默认空实现、4 类装饰器模式；
**差异**在产物格式、硬约束、基类层级、编译路由——下文逐项展开。

---

## 1. 核心洞察：结构同构与结构性差异

### 1.1 结构同构

**workflow 与 agent 都是对流程进行编排**——一组 step + 一组数据约束 + 一组输出契约：

```
┌─────────────────────────────┐
│ 编排者（orchestrator）        │
│  ├─ 步骤序列（getSteps）      │
│  ├─ 步骤间数据传递            │
│  ├─ 工具集（@config.tools）   │
│  └─ 输出契约（buildOutput）   │
└─────────────────────────────┘
```

OOP 视角下，二者**外形都是 5 段契约**（identity / task / output）+ 3 hook + 装饰器静态字段。

### 1.2 结构性差异

| 维度 | agent（subagent）| workflow |
|------|------------------|----------|
| 会话壳 | 独立新会话 | 当前会话 |
| 上下文 | FRESH / fork | 继承父会话全部上下文 |
| 工具调用 | subagent 自己的工具集 | 当前会话 AI 的工具集 |
| 失败隔离 | 仅影响 subagent | 影响父会话 |
| 数据流 | 只能通过 task 文本传入、output 返回 | 直接共享父会话变量 |

### 1.3 硬约束差异的来源

**关键洞察**：4 硬约束不是「通用 agent 协议」，而是 **subagent 体系为防御「新会话不知道上下文」而设计的对策**：

| 硬约束 | 设计动机（subagent 视角）| workflow 视角是否适用 |
|--------|--------------------------|----------------------|
| 显式文件列表 | subagent 不知道要读什么 | ❌ 当前会话 AI 知道上下文 |
| 上下文利用（完整读取）| subagent 容易跳读节省上下文 | ❌ 当前会话 AI 不会跳读 |
| Subagent 调用安全 | subagent 可能嵌套 | ❌ workflow 是顶层编排器 |
| 不确定性声明 | 结论性输出需要声明 | ✅ workflow 也输出报告 |

**结论**：workflow 体系**仅保留 1 条硬约束**——不确定性声明。其他 3 条因结构性差异删除。

### 1.4 解耦 GeneralBase 的理由

早期版本让 `WorkflowBase extends GeneralBase` 复用 4 硬约束文本——这是错误的 OOP 关系表达：

- `extends` 在 OOP 中表达 **is-a** 关系
- 让 `WorkflowBase extends GeneralBase` 等于宣称「workflow 是一种 audit agent」——语义错误
- 二者实际是**平级抽象**（都 `extends BaseAgent`），仅在「共享不变量」层面有交叉

正确做法：`WorkflowBase extends BaseAgent`，硬约束文本**重新独立定义**（仅 1 条），与 `GeneralBase` 完全解耦。

---

## 2. 顶层 OOP 单元

### 2.1 沿用 agent 体系的 5 段契约骨架

| 段 | agent 体系映射 | workflow 体系映射 |
|----|----------------|------------------|
| Identity | `# Identity` H1 段 | 拆为 `## 核心任务` / `## 不确定性声明` 等 H2 段 |
| Task | `### 第 N 步：<name>` | `## 执行步骤` H2 + `### N. <name>` H3 + 子说明 |
| Output | `# Output` H1 | `## 输出格式` H2 + markdown 表格模板 |

差异在于**段落粒度更细**——workflow 是 prompt template，正文用 H2 分段而非 H1，因为：
- prompt template 的 `#` 已被「产品名」占用（如 `# 联网搜索`）
- workflow 的 `##` 段是给当前会话 AI 的指令段落

### 2.2 装饰器扩展

| 装饰器 | 状态 | 说明 |
|--------|------|------|
| `@description` | 沿用 | frontmatter `description` |
| `@config` | 沿用 | 编译期校验；产物 frontmatter **不渲染**这 7 字段 |
| `@displayName` | 沿用 | 元信息保留 |
| `@agentName` | 沿用 | frontmatter `name` |
| `@argumentHint` | **workflow 专属** | frontmatter `argument-hint`（仅 workflow 场景）|

### 2.3 基类层级

```
BaseAgent（abstract）                      ← 5 段契约骨架
  │
  ├─ GeneralBase（abstract）                 ← 通用 4 硬约束
  │   ├─ SystemAuditAgent
  │   └─ NodeReviewAgent
  │
  ├─ WebResearcher                         ← 现有 5 个 agent
  ├─ FoundationLoaderAgent
  ├─ NaturalistAgent
  ├─ SkeletonValidatorAgent
  │
  └─ WorkflowBase（abstract，**新增**）    ← workflow 1 硬约束
      │
      ├─ WebSearchWorkflow                 ← 联网搜索
      ├─ HistoryTransWorkflow              ← 历史转化
      ├─ ContrastExperimentWorkflow        ← 对照实验
      └─ StorySimulationWorkflow           ← 故事模拟
```

`WorkflowBase` 与 `GeneralBase` **平级**——都是 `BaseAgent` 的中介抽象。

---

## 3. 终产物精确结构

### 3.1 字面结构

```markdown
---
name: <name>
description: <description>
argument-hint: <argument-hint>
---

# <name>

## 核心任务
[summary() 开头段]

## 不确定性声明
[WorkflowBase.HARD_CONSTRAINTS 全文]

## 用户输入预处理
[summary() 中段]

## 执行步骤
### 1. <step name>
[getStepDetail(step name) 文本]
### 2. <step name>
...

## 输出格式
[buildOutput() 文本]
```

### 3.2 与 agent 产物的对比

| 元素 | agent 产物 | workflow 产物 |
|------|-----------|--------------|
| frontmatter 字段 | 7（name/description/tools/context/systemPromptMode/inheritProjectContext/inheritSkills）| 3（name/description/argument-hint）|
| `name` 来源 | `@agentName` | `@agentName`（共用）|
| `description` 来源 | `@description` | `@description`（共用）|
| 4 硬约束 | 全部保留 | 仅 1 条（不确定性声明）|
| workdir 声明 | 保留（subagent 不知道）| 删除（当前会话 AI 知道）|
| `### 第 N 步` | 编译自动生成 | 子类 `buildOutput()` 显式写 |
| 步骤子说明 | 无（步骤只有 name）| `getStepDetail()` 提供 |
| 3 hook 段（Should do/not/out）| 编译生成 | **不渲染**（prompt 文本里不需要）|
| 不确定性声明位置 | 子类 buildOutput 末尾 | `WorkflowBase.HARD_CONSTRAINTS`（summary 段中部）|

---

## 4. 源↔产物映射

### 4.1 已锁映射

| 产物 .md 元素 | 源侧 TS 元素 |
|---|---|
| frontmatter `name` | `@agentName('...')` 装饰器 |
| frontmatter `description` | `@description('...')` 装饰器 |
| frontmatter `argument-hint` | `@argumentHint('...')` 装饰器 |
| `# <name>` H1 | `meta.name`（来自 @agentName）|
| `## 核心任务` H2 | `summary()` 开头段 |
| `## 不确定性声明` H2 | `${WorkflowBase.HARD_CONSTRAINTS}` |
| `## 用户输入预处理` H2 | `summary()` 中段 |
| `## 执行步骤` H2 | `buildOutput()` 中段 |
| `### N. <name>` H3 + 子说明 | `getSteps()` + `getStepDetail(name)` 组合 |
| `## 输出格式` H2 | `buildOutput()` 后段 |

### 4.2 `summary()` 与 `buildOutput()` 的分工

`summary()` 返回内容覆盖**正文前段**（核心任务 + 不确定性声明 + 用户输入预处理）：
- 由 WorkflowBase 的 HARD_CONSTRAINTS 字符串拼接
- 不确定性声明的 H2 标题由 HARD_CONSTRAINTS 内部提供

`buildOutput()` 返回内容覆盖**正文后段**（执行步骤 + 输出格式）：
- 不再追加不确定性声明（HARD_CONSTRAINTS 已在 summary 段提供）
- 步骤子说明通过 `${this.getStepDetail('step name')}` 注入

---

## 5. WorkflowBase 设计

### 5.1 仅 1 条硬约束

```typescript
protected readonly HARD_CONSTRAINTS = `无论任务类型，工作流最终报告末尾必须包含以下「不确定性声明」段：

## 不确定性声明

| # | 缺失/不确定条件 | 影响范围 | 对结论的置信度影响 |
|---|---------------|---------|:---:|
| 1 | {条件描述} | {该条件影响哪些判断} | {高/中/低} |

如无不确定条件，输出："经核查，本次工作流执行所需条件均已满足，无不确定因素。"`
```

**论证**：见 §1.3。其他 3 条硬约束因结构性差异不适用。

### 5.2 不提供 workdirNote() / uncertaintyTableTemplate()

早期版本让 `WorkflowBase extends GeneralBase` 复用 `workdirNote()` / `uncertaintyTableTemplate()`——**已废弃**。

废弃理由：
- `workdirNote()` 假设 subagent 不知道工作目录——workflow 在当前会话不适用
- `uncertaintyTableTemplate()` 已被 `HARD_CONSTRAINTS` 整合——重复

### 5.3 getStepDetail 钩子

```typescript
protected getStepDetail(stepName: string): string {
  return ''
}
```

**为什么需要**：agent 体系的 `getSteps(): string[]` 只返回步骤名数组，编译产物 `### 第 N 步：<name>` 不带子说明。workflow 体系每步带子说明，新增 `getStepDetail()` 钩子。

**设计准则**：
- 默认空实现——子类按需 override
- 渲染器按 `step name` 调此方法取子说明
- 未 override 的步骤子说明为空

### 5.4 compileOutput 扩展

```typescript
public override compileOutput(): AgentMeta {
  const meta = super.compileOutput()
  const ctor = this.constructor as { argumentHint?: string }
  return {
    ...meta,
    argumentHint: ctor.argumentHint ?? ''
  }
}
```

收集 `argumentHint` 静态字段到 `meta`——compiler 读取后写入 frontmatter。

### 5.5 `AgentMeta` 接口扩展

`argumentHint?: string` 字段加入 `BaseAgent.AgentMeta` 接口——这是 workflow 体系的唯一接口扩展点。

---

## 6. 共享与差异

### 6.1 跨 workflow 复用（进 WorkflowBase）

- 不确定性声明硬约束（见 §5.1）
- 不确定性声明表格模板（已并入 HARD_CONSTRAINTS）

### 6.2 子类特化（各自实现）

- `summary()` 的核心任务段表述
- `summary()` 的用户输入预处理段内容
- `getSteps()` 步骤序列
- `getStepDetail()` 步骤子说明（按 name 取 prose）
- `buildOutput()` 输出格式 markdown 模板
- 3 hook 内容（shouldDo / shouldNot / watchOut）

**注意**：3 hook 内容在 workflow 产物中**不被渲染**——它们在 TS 层维护是为了：
- 保持与 agent 体系 5 段契约一致（OOP 复用）
- 子类作者仍可受 3 hook 约束表达
- 未来若需在产物中渲染（如 audit 类 workflow），可扩展

---

## 7. 构建新 workflow 的检查清单

当你准备创建 `workflows/X.ts` 时，按顺序检查：

- [ ] **基类**：`extends WorkflowBase`（不是 `GeneralBase`）
- [ ] **`@agentName`**：中文触发名（与产物 filename 一致）
- [ ] **`@argumentHint`**：参数提示（仅 workflow 必须）
- [ ] **`@description`**：workflow 视角描述
- [ ] **`@config`**：tools / context / systemPromptMode / inheritProjectContext / inheritSkills
- [ ] **5 段契约**全部覆盖：summary / shouldDo / shouldNot / watchOut / getSteps / buildOutput
- [ ] **`getStepDetail()`**：子类按需 override（默认空）
- [ ] **`summary()` 不写 `## 不确定性声明` 段标题**——由 `${HARD_CONSTRAINTS}` 内部提供
- [ ] **`buildOutput()` 不追加不确定性声明表格**——已在 summary 段提供
- [ ] **`shouldNot` 不含 subagent 专属约束**（"完整读取" / "显式文件列表"）
- [ ] **不创建抽象层**：除非 ≥3 个调用方出现

### 7.1 产物段落布局准则

| 段位置 | 内容来源 |
|--------|----------|
| `## 核心任务` | `summary()` 开头段 |
| `## 不确定性声明` | `${WorkflowBase.HARD_CONSTRAINTS}` |
| `## 用户输入预处理` | `summary()` 中段 |
| `## 执行步骤` + `### N. <name>` | `buildOutput()` 拼装 `getSteps()` + `getStepDetail()` |
| `## 输出格式` | `buildOutput()` 后段 |

### 7.2 跨 workflow 引用

如果某 workflow 的步骤需要"调用"另一 workflow（如历史转化的阶段 A 调用联网搜索），在 `getStepDetail()` 中写明：

```typescript
'阶段 A：调用联网搜索': `读 .pi/prompts/联网搜索.md 并按其执行`
```

这是**人读指令**——AI 读到后自行决定是否真的去展开该 prompt template。不在 OOP 层面建立 has-a 引用关系。

---

## 8. 失败案例 / 反模式清单

❌ **`WorkflowBase extends GeneralBase`**——OOP 关系错误（误表达「workflow 是一种 audit agent」），应解耦
❌ **复用 `GeneralBase.HARD_CONSTRAINTS` 4 条全文**——3 条不适用结构性差异
❌ **`summary()` 与 `HARD_CONSTRAINTS` 同时写 `## 不确定性声明` 标题**——重复
❌ **`buildOutput()` 末尾追加 `uncertaintyTableTemplate()`**——重复（HARD_CONSTRAINTS 已含）
❌ **workdir 声明保留**——workflow 在当前会话，不需要
❌ **shouldNot 含"节省上下文"/"模糊引用文件路径"**——subagent 专属约束
❌ **renderer 类单独建文件**——渲染逻辑应在 `src/compiler.ts` 内联，按 `instanceof` 分支
❌ **workflow 源放 `agents/` 目录**——应放 `workflows/` 与编译产物落点对齐
❌ **不加 `argumentHint` 装饰器**——workflow 场景 frontmatter 必填

---

## 9. 决策记录（v1.x 锁定的）

| 主题 | 决策 | 修订理由 |
|------|------|---------|
| 基类关系 | `WorkflowBase extends BaseAgent`（**不** extends GeneralBase）| workflow 与 audit 是平级抽象 |
| 硬约束数量 | 1 条（不确定性声明）| 其他 3 条因结构性差异不适用 |
| workdir 声明 | 删除 | 当前会话 AI 知道工作目录 |
| 步骤子说明 | 新增 `getStepDetail()` 钩子 | agent 体系无此需求，workflow 必需 |
| 渲染器 | 不单独建 renderer 类 | 内联在 `src/compiler.ts` `instanceof WorkflowBase` 分支 |
| 产物落点 | `.pi/prompts/<name>.md` | 与 prompt template 加载规则一致 |
| 文件夹归属 | `workflows/` 与 `agents/` 对称 | 与产物落点对齐 |
| `argumentHint` 装饰器 | workflow 专属 | 与 `@config` 语义分离（前者是协议字段，后者是 operational）|
| `AgentMeta` 接口扩展 | 加 `argumentHint?: string` 可选字段 | workflow 编译产物唯一新增字段 |
| 3 hook 渲染 | workflow 产物不渲染 | prompt template 段落结构不需要 |

---

## 10. 总结：一句话版本

> **workflow 体系 = agent 体系 OOP 框架的子集（5 段契约 + 3 hook + 装饰器）+ workflow 专属扩展（@argumentHint + getStepDetail 钩子）+ workflow 专属硬约束（仅 1 条不确定性声明）+ workflow 专属产物（prompt template 格式落 .pi/prompts/）+ workflow 专属编译路由（instanceof WorkflowBase 分支）。**
>
> **核心洞察**：4 硬约束是 subagent 体系为防御「新会话不知道上下文」而设计的对策；workflow 在当前会话执行，结构性差异决定 3 条硬约束不适用。
>
> **新 workflow 设计时按检查清单 §7 逐项核验；反模式清单 §8 是常见错误汇总；决策记录 §9 是历史锁定决策的查询入口。**
