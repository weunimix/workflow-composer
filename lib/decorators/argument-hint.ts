// workflow-composer/lib/decorators/argument-hint.ts
// @argumentHint 装饰器（TS 5+ stage 3）——workflow 专用 frontmatter 字段
//
// 用途：把 argument-hint 字符串塞到类静态字段，渲染器读取后写入
// 产物的 frontmatter `argument-hint:` 行。
//
// 适用范围：仅 WorkflowBase 子类。其他 agent 不使用此装饰器。
//
// 与 @description 的分工：
// - @description → 写入 frontmatter `description`
// - @argumentHint → 写入 frontmatter `argument-hint`（仅在 workflow 场景生效）

export function argumentHint(hint: string) {
  return (target: Function, _ctx: ClassDecoratorContext) => {
    ;(target as any).argumentHint = hint
  }
}
