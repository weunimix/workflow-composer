// workflow-composer/src/compiler.ts
// 编译器（Runtime 派）：import → 实例化 → 调方法 → 渲染 → 写文件
// 不做任何 AST 静态分析。让 TS 自己做 OOP 求值。

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { agents } from '../agents.config'
import type { AgentMeta } from '../lib/agents/base-agent'

function kebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/_/g, '-').toLowerCase()
}

interface RenderInput extends AgentMeta {
  name: string
  kebab: string
}

function renderAgent(input: RenderInput): string {
  const { kebab: name, description, config, summary, shouldDo, shouldNot, watchOut, steps, buildOutput } = input

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

function compileAll(): void {
  const projectRoot = process.cwd()
  const outputDir = resolve(projectRoot, '.pi/agents')
  mkdirSync(outputDir, { recursive: true })

  console.log(`[compile] project root: ${projectRoot}`)
  console.log(`[compile] output: ${outputDir}`)
  console.log(`[compile] agents: ${agents.length}`)

  for (const AgentClass of agents) {
    const instance = new AgentClass()
    const meta = (instance as any).compileOutput() as AgentMeta
    const className = AgentClass.name
    const kebabName = kebab(className)
    const md = renderAgent({ ...meta, name: className, kebab: kebabName })
    const fp = join(outputDir, `${kebabName}.md`)
    writeFileSync(fp, md, 'utf-8')
    console.log(`[compile] ✓ ${className} → ${fp}`)
  }

  console.log(`[compile] Done. ${agents.length} agent(s) written.`)
}

compileAll()
