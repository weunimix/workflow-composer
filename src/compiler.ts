// workflow-composer/src/compiler.ts
// 编译器（Runtime 派）：import → 实例化 → 调方法 → 渲染 → 写文件
// 不做任何 AST 静态分析。让 TS 自己做 OOP 求值。
//
// 渲染路由：
//   instanceof WorkflowBase → renderWorkflow()（prompt template 格式，产物落 .pi/prompts/）
//   其他                    → renderAgent()（agent 7 字段格式，产物落 .pi/agents/）

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { agents } from '../agents.config'
import type { AgentMeta } from '../lib/agents/base-agent'
import { WorkflowBase } from '../lib/workflows/workflow-base'

function kebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase()
}

interface RenderInput extends AgentMeta {
  name: string
  kebab: string
}

// ===== Agent 渲染（7 字段 frontmatter + Identity/Task/Output 段）=====

function renderAgent(input: RenderInput): string {
  const { name, description, config, summary, shouldDo, shouldNot, watchOut, steps, buildOutput } = input

  const fm: string[] = ['---']
  fm.push(`name: ${name}`)
  fm.push(`description: ${description}`)
  for (const [k, v] of Object.entries(config)) fm.push(`${k}: ${v}`)
  fm.push('---')

  const body: string[] = []
  body.push('# Identity\n')
  body.push(summary)
  body.push('')

  body.push('## Should do\n')
  for (const item of shouldDo) body.push(`- ${item}`)
  body.push('')

  body.push('## Should not\n')
  for (const item of shouldNot) body.push(`- ${item}`)
  body.push('')

  body.push('## Watch out\n')
  for (const item of watchOut) body.push(`- ${item}`)
  body.push('')

  body.push('# Task\n')
  body.push('[步骤序列由 getSteps() 提供]')
  body.push('')
  steps.forEach((step, i) => body.push(`### 第 ${i + 1} 步：${step}`))
  body.push('')

  body.push('# Output\n')
  body.push('```')
  body.push(buildOutput)
  body.push('```')

  return `${fm.join('\n')}\n\n${body.join('\n')}\n`
}

// ===== Workflow 渲染（3 字段 frontmatter + 完整正文 H1/H2 段）=====
//
// 与 renderAgent 的差异：
// - frontmatter 仅 3 字段（name / description / argument-hint）
// - 不渲染 @config 7 字段
// - 不渲染 3 hook 段（Should do / Should not / Watch out）
// - 不渲染步骤编号 `第 N 步：<name>`——由子类 buildOutput() 完全控制正文结构
// - 正文 = summary() + buildOutput()（子类负责组织 H2 段落）
// - 产物落 .pi/prompts/

function renderWorkflow(input: RenderInput): string {
  const { name, description, argumentHint, summary, buildOutput } = input

  const fm: string[] = ['---']
  fm.push(`name: ${name}`)
  fm.push(`description: ${description}`)
  if (argumentHint) fm.push(`argument-hint: ${argumentHint}`)
  fm.push('---')

  const body: string[] = []
  body.push(`# ${name}\n`)
  body.push(summary)
  body.push('')

  if (buildOutput) {
    body.push(buildOutput)
    body.push('')
  }

  return `${fm.join('\n')}\n\n${body.join('\n')}\n`
}

function compileAll(): void {
  const projectRoot = process.cwd()
  const agentOutputDir = resolve(projectRoot, '.pi/agents')
  const workflowOutputDir = resolve(projectRoot, '.pi/prompts')
  mkdirSync(agentOutputDir, { recursive: true })
  mkdirSync(workflowOutputDir, { recursive: true })

  console.log(`[compile] project root: ${projectRoot}`)
  console.log(`[compile] agents → ${agentOutputDir}`)
  console.log(`[compile] workflows → ${workflowOutputDir}`)
  console.log(`[compile] total: ${agents.length}`)

  for (const AgentClass of agents) {
    const instance = new AgentClass()
    const meta = (instance as any).compileOutput() as AgentMeta
    const className = AgentClass.name
    const kebabName = kebab(className)
    const agentName = meta.agentName ?? kebabName

    if (instance instanceof WorkflowBase) {
      // workflow 分支——产物落 .pi/prompts/
      const fileBase = agentName
      const md = renderWorkflow({ ...meta, name: agentName, kebab: fileBase })
      const fp = join(workflowOutputDir, `${fileBase}.md`)
      writeFileSync(fp, md, 'utf-8')
      console.log(`[compile] ✓ [workflow] ${className} → ${fp}`)
    } else {
      // agent 分支——产物落 .pi/agents/（原行为）
      const fileBase = agentName
      const md = renderAgent({ ...meta, name: agentName, kebab: fileBase })
      const fp = join(agentOutputDir, `${fileBase}.md`)
      writeFileSync(fp, md, 'utf-8')
      console.log(`[compile] ✓ [agent]    ${className} → ${fp}${meta.agentName && meta.agentName !== kebabName ? ` (agentName: ${meta.agentName})` : ''}`)
    }
  }

  console.log(`[compile] Done. ${agents.length} file(s) written.`)
}

compileAll()
