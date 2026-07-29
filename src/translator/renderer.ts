import { AGENT_MANDATORY } from '../../lib/agents/mandatory.js'
import type { ParsedAgent, AgentMember } from './parser.js'

/**
 * Phase 1.4: 渲染器（OO class → procedural prompt）
 *
 * 当前范围：
 * - 接收 ParsedAgent（TS AST 解析产物）
 * - 输出 5 段 procedural markdown（identity / task / mandatory / workflow / outputFormat）
 * - 区分 abstract 与 concrete 成员：abstract 输出占位，concrete 提取值

 * 不在范围内（由 prototype 阶段主导）：
 * - 复杂 property initializer 解析（如 array of objects）
 * - 子类继承、覆盖的精细处理
 * - 内容叙事风格（"你扮演..." "你持有..."等）的取舍
 */

/**
 * 渲染 agent 的 procedural prompt
 *
 * @param parsed - parser 提取的 TS class 结构
 * @returns procedural markdown 文本
 */
export function renderAgent(parsed: ParsedAgent): string {
  const lines: string[] = []

  // 标题
  lines.push(`# ${parsed.className ?? '(未命名)'}`)
  lines.push('')

  // 段 2：身份
  const identity = findMember(parsed, 'identity')
  lines.push('## 你的身份')
  lines.push('')
  lines.push(formatMemberValue(identity))
  lines.push('')

  // 段 2：任务
  const task = findMember(parsed, 'task')
  lines.push('## 你需要做什么')
  lines.push('')
  lines.push(formatMemberValue(task))
  lines.push('')

  // 段 3：mandatory 块（静态注入）
  lines.push('## 你不能做什么')
  lines.push('')
  for (const item of AGENT_MANDATORY) {
    lines.push(`- ${item}`)
  }
  lines.push('')

  // 段 4：工作流程
  const workflow = findMember(parsed, 'workflow')
  lines.push('## 工作流程')
  lines.push('')
  if (workflow?.isAbstract) {
    lines.push('_（由具体子类实现）_')
  } else if (workflow?.initializer) {
    lines.push(workflow.initializer)
  } else {
    lines.push('_（未实现）_')
  }
  lines.push('')

  // 段 5：输出规范
  const outputFormat = findMember(parsed, 'outputFormat')
  lines.push('## 你应该输出什么以及输出规范')
  lines.push('')
  lines.push(formatMemberValue(outputFormat))
  lines.push('')

  return lines.join('\n')
}

/**
 * 在 members 中按名称找成员
 */
function findMember(parsed: ParsedAgent, name: string): AgentMember | undefined {
  return parsed.members.find(m => m.name === name)
}

/**
 * 格式化成员值为 markdown
 *
 * - abstract：占位说明
 * - concrete with initializer：取初始化值
 * - 无值：占位说明
 */
function formatMemberValue(member: AgentMember | undefined): string {
  if (!member) return '_（未定义）_'
  if (member.isAbstract) return '_（由具体子类实现）_'
  if (member.initializer) return member.initializer
  return '_（未提供）_'
}
