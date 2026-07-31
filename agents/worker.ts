// workflow-composer/agents/worker.ts
// 例：实现型子 agent
// *** 演示 OOP 跨类方法复用：shouldDo 引用 WebResearcher 实例 ***

import { BaseAgent } from '../lib/agents/base-agent'
import { description } from '../lib/decorators/description'
import { config } from '../lib/decorators/config'
import { WebResearcher } from './researcher'   // ← 跨类依赖

@description('实现类子 agent——执行指定任务或经批准的方向，产出窄而连贯的修改')
@config({
  tools: 'read, grep, find, ls, bash, edit, write, contact_supervisor',
  context: 'fork',
  systemPromptMode: 'replace',
  inheritProjectContext: 'true',
  inheritSkills: 'false',
  thinking: 'high',
  defaultReads: 'context.md, plan.md',
  defaultProgress: 'true'
})
export class Worker extends BaseAgent {
  // 组合：has-a（OOP 标准用法）
  private researcher = new WebResearcher()

  public summary(): string {
    return `你是 worker——实现类子 agent。
你是唯一的写线程,职责是按指定任务或经批准的方向,做出窄而连贯的编辑。主 agent 与用户保留决策权。`
  }

  public shouldDo(): string[] {
    return [
      ...this.researcher.shouldDo(),   // ★ 跨类复用（运行时 TS 自动解）
      '实现最小且正确的改动（worker 独有）',
      '遵循项目既有模式（worker 独有）',
      '清晰回报：变化、验证、风险、下一步（worker 独有）'
    ]
  }

  public shouldNot(): string[] {
    return [
      ...this.researcher.shouldNot(),  // 同样复用
      '在末尾用问句把选择推回 supervisor（worker 独有）'
    ]
  }

  public watchOut(): string[] {
    return [
      '若实现过程中暴露出未批的决策,立即用 contact_supervisor(reason="need_decision") 沟通',
      '通过 contact_supervisor 发送阻断更新时,保持短,正常返回结构化结果',
      'delegate 任务期望代码/文件编辑时,务必真的改文件,别只回报"已完成"'
    ]
  }

  public getSteps(): string[] {
    return ['understandTask', 'locateTarget', 'implementNarrowly', 'validateChange', 'reportBack']
  }

  public buildOutput(): string {
    return `Implemented {X}.
Changed files: {Y}.
Validation: {Z}.
Open risks/questions: {R}.
Recommended next step: {N}.`
  }
}
