// workflow-composer/lib/decorators/display-name.ts
// @displayName 装饰器（TS 5+ stage 3）
//
// 用途：显式指定 agent 的中文 / 人类友好名。
// 编译器优先用它做文件名 + frontmatter `name`，未声明时回退到 kebab(className)。
//
// 设计动机：OOP 源保持英文命名规范（代码层），编译产物用中文（用户层），
// 决策 A 的"代码 / 用户层边界分离"由此装饰器落地。

export function displayName(name: string) {
  return (target: Function, _ctx: ClassDecoratorContext) => {
    ;(target as any).displayName = name
  }
}
