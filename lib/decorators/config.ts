// workflow-composer/lib/decorators/config.ts
// @config 装饰器（TS 5+ stage 3）——把运行时配置塞到类的静态字段

export type AgentConfig = Record<string, string>

export function config(spec: AgentConfig) {
  return (target: Function, _ctx: ClassDecoratorContext) => {
    ;(target as any).config = spec
  }
}
