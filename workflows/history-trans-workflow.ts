// workflow-composer/workflows/history-trans-workflow.ts
// 历史转化 workflow —— 翻译自 .pi/workflows/历史转化.md
//
// OOP 视角：
// - 5 段契约全部覆盖
// - extends WorkflowBase 共享不确定性声明硬约束
// - 步骤子说明走 getStepDetail() 钩子
// - 阶段 A 通过「读 .pi/prompts/联网搜索.md 并按其执行」人读指令引用联网搜索 workflow
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

@agentName('历史转化')
@argumentHint('[主题] [约束摘要]')
@description('基于联网搜索结果做历史转化处理，枚举约束内历史机制形态并标注依赖前提')
@config({
  tools: 'read, web_search, fetch_content, get_search_content',
  context: 'fork',
  systemPromptMode: 'replace',
  inheritProjectContext: 'true',
  inheritSkills: 'true'
})
export class HistoryTransWorkflow extends WorkflowBase {
  public summary(): string {
    return `## 核心任务

基于联网搜索工作流的结果，做历史转化处理。
接收约束摘要，在约束边界内枚举历史机制形态并标注依赖前提。
核心理念：先获取材料（联网搜索），再按约束筛选材料（历史转化）。

${this.HARD_CONSTRAINTS}

## 用户输入预处理

当用户输入是长段描述（含背景分析、多个假设、或模糊想法）时，
先提取以下要素，整理展示后等待用户确认：

\`\`\`
## 历史转化前整理

**主题**：{联网搜索目标}
**约束摘要**：{约束边界}
**约束来源**：{约束文件路径或基础设定}
**目标产物**：{需要的历史机制形态}
\`\`\`

简洁指令可跳过此步。`
  }

  public shouldDo(): string[] {
    return [
      '阶段 A：先调用联网搜索 workflow 获取材料',
      '阶段 A：等待用户确认后继续',
      '阶段 B：在约束边界内枚举历史机制形态',
      '对每个形态标注：原始运作逻辑、关键前提条件',
      '不推荐方向——只枚举不筛选',
      '某些形态超出给定约束边界时标注排除原因'
    ]
  }

  public shouldNot(): string[] {
    return [
      '跳过联网搜索直接做历史转化——必须有材料才能转化',
      '替用户做方向推荐',
      '在约束边界外枚举历史形态',
      '省略前提条件标注'
    ]
  }

  public watchOut(): string[] {
    return [
      '阶段 A 与阶段 B 是组合关系——A 提供材料，B 转化处理',
      '约束摘要可能由调用方提供，也可能由 foundation-loader 输出嵌入',
      '历史转化处理不产出创作内容——只产出候选机制清单'
    ]
  }

  public getSteps(): string[] {
    return [
      '阶段 A：调用联网搜索工作流',
      '阶段 B：历史转化处理',
      '输出报告'
    ]
  }

  protected override getStepDetail(stepName: string): string {
    const details: Record<string, string> = {
      '阶段 A：调用联网搜索工作流': `组合步骤——按以下顺序执行：

1. 读取 .pi/workflows/_index.md，确认 联网搜索 关键词已注册
2. 在当前工作流执行上下文中调用 /workflow 联网搜索 {主题}
3. 等待用户确认后继续
4. 接收联网搜索工作流输出作为本工作流阶段 B 的输入`,
      '阶段 B：历史转化处理': `1. 接收约束摘要（由调用方提供或由 foundation-loader 输出嵌入）
2. 读取 .pi/skills/novel-writer-structure/workflows/历史参考转化原则.md
3. 在约束边界内，枚举联网搜索结果中的机制形态
4. 对每个形态标注：
   - 原始运作逻辑
   - 关键前提条件
5. 不推荐方向`,
      '输出报告': `按输出格式生成最终报告。`
    }
    return details[stepName] ?? ''
  }

  public buildOutput(): string {
    return `## 执行步骤

### 阶段 A：调用联网搜索工作流（组合）

${this.getStepDetail('阶段 A：调用联网搜索工作流')}

### 阶段 B：历史转化处理

${this.getStepDetail('阶段 B：历史转化处理')}

### 输出报告

${this.getStepDetail('输出报告')}

## 输出格式

## 历史机制枚举

### 问题重述
{对构建问题的一句话重述}

### 给定约束
{从 task 中提取的约束摘要}

### 联网搜索结果摘要
{阶段 A 输出的关键内容}

### 枚举清单
| # | 机制名称 | 来源（联网搜索结果） | 原始运作逻辑 | 依赖的前提条件 |
|---|---------|------------------|------------|--------------|
| 1 | ... | ... | ... | ... |

### 不可行形态及原因
| 形态 | 不可行原因 | 该原因在给定约束下是否成立？ |
|------|---------|:--:|

### 约束边界备注（如适用）
- {某些形态因超出给定约束边界而未枚举——标注原因}`
  }
}
