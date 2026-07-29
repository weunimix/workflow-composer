import * as ts from 'typescript'
import { readFileSync } from 'node:fs'

/**
 * Phase 1.2 解析骨架
 *
 * 职责：解析 agent .ts 文件，提取 OO 结构信息
 * 不负责：渲染 procedural prompt（由 prototype 阶段主导）
 */

export interface AgentMember {
  kind: 'property' | 'method' | 'constructor'
  name: string
  type?: string
  visibility: 'public' | 'private' | 'protected'
  isStatic: boolean
  isAbstract: boolean
  signature?: string
  initializer?: string
}

export interface ParsedAgent {
  sourceFile: string
  className: string | null
  baseClasses: string[]
  members: AgentMember[]
}

/**
 * 解析 agent .ts 文件
 *
 * 当前假设一个文件一个顶层 class（OO agent 模板的典型形态）
 */
export function parseAgentFile(filePath: string): ParsedAgent {
  const sourceCode = readFileSync(filePath, 'utf-8')

  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS
  )

  let className: string | null = null
  const baseClasses: string[] = []
  const members: AgentMember[] = []

  for (const stmt of sourceFile.statements) {
    if (ts.isClassDeclaration(stmt)) {
      className = stmt.name?.text ?? null

      for (const clause of stmt.heritageClauses ?? []) {
        for (const t of clause.types) {
          if (ts.isExpressionWithTypeArguments(t) && ts.isIdentifier(t.expression)) {
            baseClasses.push(t.expression.text)
          }
        }
      }

      for (const m of stmt.members) {
        const member = parseMember(m)
        if (member) members.push(member)
      }

      break  // 假设一个文件一个类
    }
  }

  return { sourceFile: filePath, className, baseClasses, members }
}

/**
 * 解析类成员
 *
 * 当前支持：property / method / constructor
 * 不支持：getter / setter / abstract method（待 prototype 决定）
 */
function parseMember(node: ts.ClassElement): AgentMember | null {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined
  const isStatic = modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword) ?? false
  const isAbstract = modifiers?.some(m => m.kind === ts.SyntaxKind.AbstractKeyword) ?? false
  const visibility: 'public' | 'private' | 'protected' =
    modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) ? 'private'
    : modifiers?.some(m => m.kind === ts.SyntaxKind.ProtectedKeyword) ? 'protected'
    : 'public'

  if (ts.isPropertyDeclaration(node)) {
    return {
      kind: 'property',
      name: node.name.getText(),
      type: node.type?.getText() ?? undefined,
      visibility,
      isStatic,
      isAbstract,
      initializer: node.initializer?.getText()
    }
  }

  if (ts.isMethodDeclaration(node)) {
    const params = (node.parameters ?? []).map(p =>
      p.name.getText() + (p.type ? ': ' + p.type.getText() : '')
    ).join(', ')
    const returnType = node.type ? ' => ' + node.type.getText() : ''
    const signature = `${node.name.getText()}(${params})${returnType}`
    return {
      kind: 'method',
      name: node.name.getText(),
      type: node.type?.getText() ?? undefined,
      visibility,
      isStatic,
      isAbstract,
      signature
    }
  }

  if (ts.isConstructorDeclaration(node)) {
    return {
      kind: 'constructor',
      name: 'constructor',
      visibility,
      isStatic,
      isAbstract
    }
  }

  return null
}
