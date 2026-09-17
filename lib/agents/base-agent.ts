// workflow-composer/lib/agents/base-agent.ts
// BaseAgent 抽象基类 —— runtime 派的 OOP 源
// 编译期调用 compileOutput() 即可得到全部 metadata，TS 自己解 OOP

import { description } from '../decorators/description'
import { config } from '../decorators/config'

// 注：@displayName 是可选装饰器（见 ../decorators/display-name.ts）
// 此文件不强制 import 以保持最小依赖

export interface AgentMeta {
  description: string
  config: AgentConfig
  displayName?: string  // 元信息保留（不影响产物）
  agentName?: string    // frontmatter name 字段：默认 = kebab(className)；@agentName 可覆盖
  argumentHint?: string // frontmatter argument-hint 字段：仅 workflow 子类使用
  summary: string
  shouldDo: string[]
  shouldNot: string[]
  watchOut: string[]
  steps: string[]
  stepDetails: Record<string, string>  // step 名 → 详情 prose；空字符串不输出
  buildOutput: string
}

import type { AgentConfig } from '../decorators/config'

@description('Agent 系统的核心抽象基类——所有具体 agent 必须继承此')
@config({
  systemPromptMode: 'replace',
  inheritProjectContext: 'false',
  inheritSkills: 'false'
})
export abstract class BaseAgent {
  // ===== 三个 hook（默认空实现；public 让 sibling 类也能访问）=====
  // Runtime 派的必然性：worker.ts 里 this.researcher.shouldDo() 必须能跨类调用
  public shouldDo(): string[] { return [] }
  public shouldNot(): string[] { return [] }
  public watchOut(): string[] { return [] }

  // ===== 第四个 hook（默认空实现；protected 让子类可 override）=====
  // 与 WorkflowBase.getStepDetail 同语义：按 step 名返回子步骤 prose。
  // 子类 override 后由 compileOutput() 收集到 stepDetails，传给 compiler.ts
  // 在 # Task 章节自动展开——实现 Agent 与 Workflow 步骤详情机制对称。
  protected getStepDetail(_stepName: string): string {
    return ''
  }

  // ===== abstract（每个 agent 必实现）=====
  public abstract summary(): string
  public abstract buildOutput(): string
  public abstract getSteps(): string[]

  // ===== 公共读取入口（compiler 用）=====
  public compileOutput(): AgentMeta {
    const ctor = this.constructor as {
      description?: string
      config?: AgentConfig
      displayName?: string
      agentName?: string
    }
    const steps = this.getSteps()
    const stepDetails: Record<string, string> = {}
    for (const step of steps) {
      const detail = this.getStepDetail(step)
      if (detail) stepDetails[step] = detail
    }
    return {
      description: ctor.description ?? '',
      config: ctor.config ?? {},
      displayName: ctor.displayName,  // 元信息保留（不影响产物）
      agentName: ctor.agentName,       // 控制 frontmatter name 字段
      summary: this.summary(),
      shouldDo: this.shouldDo(),
      shouldNot: this.shouldNot(),
      watchOut: this.watchOut(),
      steps,
      stepDetails,
      buildOutput: this.buildOutput()
    }
  }
}
