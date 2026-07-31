// workflow-composer/lib/decorators/description.ts
// @description 装饰器（TS 5+ stage 3）——把字符串塞到类的静态字段，运行时可读

export function description(text: string) {
  return (target: Function, _ctx: ClassDecoratorContext) => {
    ;(target as any).description = text
  }
}
