// workflow-composer/workflows/web-search-workflow.ts
// 联网搜索 workflow —— 翻译自 .pi/workflows/联网搜索.md
//
// OOP 视角：
// - 5 段契约全部覆盖（summary / shouldDo / shouldNot / watchOut / getSteps / buildOutput）
// - extends WorkflowBase 共享不确定性声明硬约束
// - 步骤子说明走 getStepDetail() 钩子（按 step name 取 prose）
// - 产物正文结构（核心任务 / 不确定性声明 / 用户输入预处理 / 执行步骤 / 输出格式）
//   由 summary() 开头 + buildOutput() 末尾两段控制
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

@agentName('联网搜索')
@argumentHint('[主题...]')
@description('多角度深度搜索、递归扩展、交叉验证，产出结构化的分析报告')
@config({
  tools: 'web_search, fetch_content, get_search_content',
  context: 'fork',
  systemPromptMode: 'replace',
  inheritProjectContext: 'true',
  inheritSkills: 'true'
})
export class WebSearchWorkflow extends WorkflowBase {
  public summary(): string {
    return `## 核心任务

接收用户搜索主题 → 设计搜索策略 → 执行多角度搜索 → 深度读取高价值来源 →
交叉分析整合 → 输出分析报告。

搜索策略遵循：4-8 个英文查询覆盖核心/邻近/反向三个维度。递归深度上限 2 层。

${this.HARD_CONSTRAINTS}

## 用户输入预处理

当用户输入是长段描述（含背景分析、多个假设、或模糊想法）时，先整理核心要素：

\`\`\`
## 搜索前整理
**核心问题**：{一句话}
**已知背景**：{已明确的信息}
**待验证假设**：- {假设 1}
**分析目标**：{用途}
**关键字**：{英文关键词}
\`\`\`

等待用户确认后继续。简洁搜索短语可跳过此步。`
  }

  public shouldDo(): string[] {
    return [
      '把问题拆成 2-4 个研究角度（核心/邻近/反向），每个角度单独搜',
      '优先一手来源、官方文档、规范',
      '读完搜索结果后再决定是否 deep-dive 抓全文',
      '舍弃过时、冗余、SEO 重的内容',
      '中文主题需先转换为英文查询；专有名词保留原词',
      '等待用户确认「搜索前整理」后再继续'
    ]
  }

  public shouldNot(): string[] {
    return [
      '基于单一来源做结论',
      '搜索后直接抛原文——必须先综合再输出',
      '跳过用户输入预处理——长输入必须先整理核心要素'
    ]
  }

  public watchOut(): string[] {
    return [
      '时效敏感主题必须有 recent developments 维度',
      '如搜索后仍有缺口，显式报告 Gaps，别装作完整',
      '区分 Kept 与 Dropped 来源，Dropped 给出排除理由',
      '递归深度上限 2 层——超过时停止扩展',
      '用户输入是长段描述时强制走「搜索前整理」预处理'
    ]
  }

  public getSteps(): string[] {
    return [
      '确定搜索策略',
      '执行搜索',
      '深度读取',
      '交叉分析与整合',
      '输出报告'
    ]
  }

  protected override getStepDetail(stepName: string): string {
    const details: Record<string, string> = {
      '确定搜索策略': `关键字转换：所有搜索查询使用英文。普通主题翻译为英文，专有名词保留原词。
查询拆分：4-8个查询，核心2个(不同措辞)、邻近2-4个、反向1-2个。
递归扩展：搜索结果出现新术语→追加1-2查询，深度上限2层。`,
      '执行搜索': `使用 \`web_search\` 工具，\`queries\` 参数传入所有英文查询。`,
      '深度读取': `对前10-15条最相关结果使用 \`fetch_content\` 获取完整内容。邻近维度和反向视角同样深度读取。`,
      '交叉分析与整合': `- 事实提取：多来源共识
- 分歧标注：矛盾或立场差异
- 机制提炼：可复用的运作逻辑
- 与项目关联：呼应/冲突/空白
- 可借鉴点：具体机制、结构、模式`,
      '输出报告': `按输出格式生成最终报告。报告主体中文，专有名词保留原文附中文参考。`
    }
    return details[stepName] ?? ''
  }

  public buildOutput(): string {
    return `## 执行步骤

### 1. 确定搜索策略

${this.getStepDetail('确定搜索策略')}

### 2. 执行搜索

${this.getStepDetail('执行搜索')}

### 3. 深度读取

${this.getStepDetail('深度读取')}

### 4. 交叉分析与整合

${this.getStepDetail('交叉分析与整合')}

### 5. 输出报告

${this.getStepDetail('输出报告')}

## 输出格式

## 搜索策略
| # | 维度 | 查询 |
|---|:---:|------|

## 事实提取
| # | 事实 | 来源数 | 置信度 |
|---|------|:---:|:---:|

## 分歧标注（如有）

## 机制提炼
| 机制 | 来源案例 | 运作逻辑 | 可迁移性 |
|------|---------|---------|:---:|

## 与项目关联

## 可借鉴点`
  }
}
