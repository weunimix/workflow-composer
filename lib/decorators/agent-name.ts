// workflow-composer/lib/decorators/agent-name.ts
// @agentName 装饰器（TS 5+ stage 3）
//
// 用途：显式指定 agent 在 frontmatter 中的 `name:` 字段。
// 默认 = kebab(className)（英文）；当与 className kebab 不一致（如审查引擎）
// 或需要与已存在的老 .md 对齐时显式声明。
//
// 与 @displayName 的分工：
// - @agentName → 控制 frontmatter `name:` 字段（PI runtime 查找 key）
// - @displayName → class metadata（不影响产物文件名 / frontmatter name）
//
// 决策 A1 接入策略：name 字段与已存在的老 .md 保持一致以最小改动接入。

export function agentName(value: string) {
  return (target: Function, _ctx: ClassDecoratorContext) => {
    ;(target as any).agentName = value
  }
}
