// workflow-composer/lib/agents/general-base.ts
// General 通用基类 —— 为所有需要「独立视角 + fresh 上下文 + 替换式 prompt」的
// 子 agent 提供 4 条共享硬约束（显式文件列表 / 完整读取 / 不确定性声明 / subagent 调用安全）
// 与 2 个辅助方法（不确定性声明模板 / 工作目录声明）。
// 不强制 tools 字段 —— 子 agent 必须自行声明所需工具与角色特化逻辑。

import { BaseAgent } from './base-agent'
import { description } from '../decorators/description'
import { config } from '../decorators/config'

@description('General 通用基类——独立视角 + fresh 上下文 + 替换式 prompt,继承 4 条通用纪律(显式文件列表 / 完整读取 / 不确定性声明 / subagent 调用安全)与 2 个辅助方法(不确定性声明模板 / 工作目录声明),子类自声明 tools')
@config({
  context: 'fresh',
  systemPromptMode: 'replace',
  inheritProjectContext: 'false',
  inheritSkills: 'false'
})
export abstract class GeneralBase extends BaseAgent {
  // 共享：硬约束（4 条 mandatory）
  protected readonly HARD_CONSTRAINTS = `1. 显式文件列表：需要读取的文件必须逐文件列出完整项目根相对路径。禁止"读取相关文件"等模糊描述。
全局排除目录（永不可读取）：.pi-subagents/、.git/、node_modules/、参考文献/（仅在用户明确指令引用时才可读取）。
2. 上下文利用：你有 1M 上下文窗口可用。完整读取以上所有文件，不得跳读、略读、节省上下文。每个文件从头到尾完整读。
3. 不确定性声明：无论任务类型，输出末尾必须包含「不确定性声明」段（无不确定条件时输出"经核查，本次分析所需条件均已满足，无不确定因素"）。
4. Subagent 调用安全：禁止同时设置以下四个参数——async: false ∧ concurrency: > 1 ∧ output: false ∧ progress: false（会导致资源死锁）。`

  // 共享：不确定性声明模板（供子类 buildOutput 末尾引用）
  protected uncertaintyTableTemplate(): string {
    return `## 不确定性声明

| # | 缺失/不确定条件 | 影响范围 | 对结论的置信度影响 |
|---|---------------|---------|:---:|
| 1 | {条件描述} | {该条件影响哪些判断} | {高/中/低} |

如无不确定条件，输出："经核查，本次分析所需条件均已满足，无不确定因素。"`
  }

  // 共享：工作目录声明
  protected workdirNote(): string {
    return `本 agent 的工作目录为项目根目录。所有文件路径均为项目根相对路径。`
  }
}
