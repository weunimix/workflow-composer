// workflow-composer/workflows/contrast-experiment-workflow.ts
// 对照实验 workflow —— 翻译自 .pi/workflows/对照实验.md
//
// OOP 视角：
// - 5 段契约全部覆盖
// - extends WorkflowBase 共享不确定性声明硬约束
// - 步骤子说明走 getStepDetail() 钩子
//
// 与原 .md 的差异：
// - frontmatter 改 prompt template 协议（name / description / argument-hint）
// - 4 硬约束中 3 条 subagent 专属约束已删除（结构性差异）
// - 仅保留不确定性声明，由 WorkflowBase.HARD_CONSTRAINTS 注入
// - 步骤子说明从「执行步骤」段拆出，进 getStepDetail()

import { WorkflowBase } from '../lib/workflows/workflow-base'
import { description } from '../lib/decorators/description'
import { config } from '../lib/decorators/config'
import { agentName } from '../lib/decorators/agent-name'
import { argumentHint } from '../lib/decorators/argument-hint'

@agentName('对照实验')
@argumentHint('[测试议题] [变量]')
@description('构建对照组与实验组，控制单一变量，并行执行后交叉对比分析')
@config({
  tools: 'read, subagent',
  context: 'fork',
  systemPromptMode: 'replace',
  inheritProjectContext: 'true',
  inheritSkills: 'true'
})
export class ContrastExperimentWorkflow extends WorkflowBase {
  public summary(): string {
    return `## 核心任务

接收测试议题和变量定义 → 实验设计初筛 → 变量隔离 → 并行委派对照组+实验组 →
交叉对比分析 → 输出对比报告。

核心原则：唯一变量。两组在除变量外的所有方面（任务文本、文件列表、上下文模式）
必须完全一致。目的不是产出创作内容，而是评估变量本身的影响。

${this.HARD_CONSTRAINTS}

## 用户输入预处理

当用户输入是长段描述时，先提取以下要素，整理展示后等待用户确认：

\`\`\`
## 实验前整理

**测试议题**：{一句话}
**变量定义**：
- 自变量：{唯一被测试项}
- 因变量：{观察什么}
- 控制变量：{两组保持一致的部分}
**对照组条件**：{配置}
**实验组条件**：{配置}
**实验目的**：{为什么需要对照}
**判定标准**：{如何判断差异有意义}
\`\`\`

简洁指令可跳过此步。`
  }

  public shouldDo(): string[] {
    return [
      '控制唯一变量——两组在除变量外的所有方面必须完全一致',
      '初筛阶段只读不写，不修改任何文件',
      '初筛后等待用户决定：确认继续、调整设计、或放弃',
      '使用 subagent 的 tasks 参数并行委派对照组与实验组',
      '两组均使用 fresh 上下文——确保互相独立、互不污染',
      '任务文本结构：共享主体 + 变量差异处标注【实验变量】',
      '交叉对比时按 4 维度分析：方向差异、推理路径、遗漏/新增、置信度差异',
      '差异判定按 3 档归类：✅ 变量效应 / ⚠️ 随机噪音 / ❌ 执行偏差'
    ]
  }

  public shouldNot(): string[] {
    return [
      '允许多变量同时变更——违反唯一变量原则',
      '跳过初筛直接进入并行委派',
      '两组使用不同 agent 或不同 context 配置',
      '替用户决定初筛结果（必须等待用户决定）',
      '省略差异判定档位（必须明确标 ✅/⚠️/❌）'
    ]
  }

  public watchOut(): string[] {
    return [
      '混淆变量排查：任务文本、文件列表、上下文模式、agent 配置上除变量外必须完全一致',
      '初筛为建议性闸门——不阻塞但必须输出初筛结果',
      '执行偏差 ❌ 建议重跑——不要试图修补输出',
      '随机噪音 ⚠️ 与变量效应 ✅ 的区分要明确，避免错配'
    ]
  }

  public getSteps(): string[] {
    return [
      '实验设计初筛',
      '变量隔离',
      '构建两组任务',
      '并行执行',
      '交叉对比',
      '输出报告'
    ]
  }

  protected override getStepDetail(stepName: string): string {
    const details: Record<string, string> = {
      '实验设计初筛': `在运行实验前做可行性检查。只读不写，不修改任何文件。

| 检查项 | 判断标准 |
|------|------|
| 变量是否可对照 | 是否存在明确、可隔离的单一变量？多变量提示拆分 |
| 方法是否匹配目的 | 对照实验适合"A vs B"或"X 是否导致 Y"的问题 |
| 预期价值 | 无论结果如何，能否得出可行动的结论？ |

输出初筛结果后等待用户决定——确认继续、调整设计、或放弃。此为建议性闸门，不阻塞。`,
      '变量隔离': `确保唯一变量是被测试项：
- 变量数量：仅 1 个
- 多变量检测：提示拆分
- 混淆变量排查：两组在任务文本、文件列表、上下文模式、agent 配置上除变量外完全一致`,
      '构建两组任务': `对照组和实验组的 subagent 调用参数：
- 唯一差异：仅在变量处不同
- 其余完全一致：agent（均为 delegate）、context（均为 fresh）、inheritProjectContext、inheritSkills

任务文本结构：共享主体 + 变量差异处标注【实验变量】。`,
      '并行执行': `使用 subagent() 的 tasks 参数：

\`\`\`
subagent({
  tasks: [
    { agent: "delegate", task: "【对照组】{任务文本}", context: "fresh" },
    { agent: "delegate", task: "【实验组】{任务文本}", context: "fresh" }
  ],
  concurrency: 2
})
\`\`\`

两组均使用 fresh 上下文——确保互相独立、互不污染。`,
      '交叉对比': `接收两组输出后，执行交叉对比分析。

对比维度：
| 维度 | 检查内容 |
|------|------|
| 方向差异 | 两组结论方向是否不同？差异幅度？ |
| 推理路径 | 推理链条有何不同？变量如何影响了路径？ |
| 遗漏/新增 | 实验组相比对照组，遗漏了什么？新增了什么？ |
| 置信度差异 | 哪组更自信？哪组标注了更多缺失条件？ |

差异判定：
| 判定 | 标准 |
|:---:|------|
| ✅ 变量效应 | 差异可归因于被测试的变量 |
| ⚠️ 随机噪音 | 差异无法归因于变量（subagent 独立运行波动） |
| ❌ 执行偏差 | 差异源于某组偏离了指令（误读、跳读等） |`,
      '输出报告': `按输出格式生成最终对比报告。`
    }
    return details[stepName] ?? ''
  }

  public buildOutput(): string {
    return `## 执行步骤

### 1. 实验设计初筛

${this.getStepDetail('实验设计初筛')}

### 2. 变量隔离

${this.getStepDetail('变量隔离')}

### 3. 构建两组任务

${this.getStepDetail('构建两组任务')}

### 4. 并行执行

${this.getStepDetail('并行执行')}

### 5. 交叉对比

${this.getStepDetail('交叉对比')}

### 6. 输出报告

${this.getStepDetail('输出报告')}

## 输出格式

## 实验配置

| 配置项 | 对照组 | 实验组 |
|------|------|------|
| 变量 | {对照组条件} | {实验组条件} |
| agent | delegate | delegate |
| context | fresh | fresh |

## 结论对比

| 维度 | 对照组 | 实验组 | 差异判定 |
|------|------|------|:---:|
| 核心结论 | {摘要} | {摘要} | ✅/⚠️/❌ |
| 推理路径 | {摘要} | {摘要} | ✅/⚠️/❌ |
| 不确定性数量 | N | M | ✅/⚠️/❌ |

## 差异分析

### ✅ 变量效应
- **{差异点}**：可归因于变量——{原因}

### ⚠️ 随机噪音（如有）
- **{差异点}**：无法归因于变量——{原因}

### ❌ 执行偏差（如有）
- **{差异点}**：{具体表现}。建议重跑。

## 综合评估

**变量效应强度**：{强/中/弱/无}
**结论**：{一句话}
**建议**：{是否值得固定使用该配置 / 是否需要进一步实验}

## 对照组完整输出
{对照组 subagent 输出原文}

## 实验组完整输出
{实验组 输出原文}`
  }
}
