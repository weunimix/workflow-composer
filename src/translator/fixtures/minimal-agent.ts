/**
 * 最简 fixture（仅用于验证 Phase 1.2 解析骨架能跑）
 *
 * 不是 prototype 阶段的真 OO agent 模板
 * 真正的 OO agent 模板（带 .ts class 表达）由用户主导设计
 */

export class MinimalAgent {
  private name: string
  public count: number = 0

  constructor(name: string) {
    this.name = name
  }

  doSomething(x: string): void {}

  static createEmpty(): MinimalAgent {
    return new MinimalAgent('empty')
  }
}
