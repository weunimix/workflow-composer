// workflow-composer/lib/workflows/workflow-base.ts
// Workflow 共享 abstract 基类 —— 与 GeneralBase 平级，均 extends BaseAgent
//
// 与 GeneralBase 的结构性差异：
// GeneralBase 服务于 subagent（独立新会话），需要 4 条硬约束防御
// 「新会话不知道上下文」的问题（显式文件列表 / 完整读取 / Subagent 安全 / 不确定性声明）。
// WorkflowBase 服务于 workflow（当前会话编排），AI 已具备完整上下文，
// 仅需保留 1 条硬约束：不确定性声明（workflow 也输出结论性报告）。
//
// 共享内容：
// - HARD_CONSTRAINTS（仅 1 条：不确定性声明）
//
// 抽象要求：
// - summary() / getSteps() / buildOutput() 仍由子类实现（与 BaseAgent 一致）
// - hook 方法默认空，子类按需 override

import { BaseAgent } from '../agents/base-agent'

export abstract class WorkflowBase extends BaseAgent {
  // 共享：硬约束（仅 1 条 mandatory）—— 不确定性声明
  // 其他 3 条 subagent 专属硬约束（显式文件列表 / 完整读取 / Subagent 安全）
  // 因结构性差异（workflow 在当前会话执行）已删除
  protected readonly HARD_CONSTRAINTS = `无论任务类型，工作流最终报告末尾必须包含以下「不确定性声明」段：

## 不确定性声明

| # | 缺失/不确定条件 | 影响范围 | 对结论的置信度影响 |
|---|---------------|---------|:---:|
| 1 | {条件描述} | {该条件影响哪些判断} | {高/中/低} |

如无不确定条件，输出："经核查，本次工作流执行所需条件均已满足，无不确定因素。"`

  // compileOutput() 扩展——额外收集 argumentHint 静态字段
  // compiler 通过 meta.argumentHint 读取并写入 frontmatter
  public override compileOutput(): import('../agents/base-agent').AgentMeta {
    const meta = super.compileOutput()
    const ctor = this.constructor as { argumentHint?: string }
    return {
      ...meta,
      argumentHint: ctor.argumentHint ?? ''
    }
  }
}
