import { AGENT_MANDATORY } from './mandatory.js'

/**
 * agent prompt 的 5 段结构契约
 */
export interface _AgentContract {
  /** 段 2：你的身份（你是什么）*/
  readonly identity: string

  /** 段 2：你需要做什么（任务）*/
  readonly task: string

  /** 段 4：工作流程（步骤序列）*/
  readonly workflow: readonly _WorkflowStep[]

  /** 段 5：输出规范 */
  readonly outputFormat: string
}

/**
 * 工作流步骤——工作流程段中的单个步骤
 *
 * name：步骤名（如 detect_stale）
 * description：步骤用途说明
 * procedure：步骤执行的具体过程（多步骤时用数组）
 */
export interface _WorkflowStep {
  readonly name: string
  readonly description: string
  readonly procedure: readonly string[]
}

/**
 * agent 基类——5 段结构 + mandatory 块强制
 *
 * 子类必须实现：identity / task / workflow / outputFormat
 * 子类可覆盖：tools / context / systemPromptMode 等 frontmatter 默认值
 * 子类不可覆盖：mandatory（基类强制）
 */
export abstract class _Agent implements _AgentContract {
  // ===== 段 1：frontmatter（基类默认值）=====
  readonly tools: readonly string[] = ['read'] as const
  readonly context: 'fresh' | 'fork' = 'fresh' as const
  readonly systemPromptMode: 'replace' | 'append' = 'replace' as const

  // ===== 段 3：mandatory 块（基类强制，不允许子类覆盖）=====
  readonly mandatory: readonly string[] = AGENT_MANDATORY

  // ===== 段 2：身份 + 任务（子类必须实现）=====
  abstract readonly identity: string
  abstract readonly task: string

  // ===== 段 4：工作流程（子类必须实现）=====
  abstract readonly workflow: readonly _WorkflowStep[]

  // ===== 段 5：输出规范（子类必须实现）=====
  abstract readonly outputFormat: string
}
