---
name: workflow-composer
description: PLACEHOLDER - 待完善。Pi agent 使用 workflow-composer 编译 TypeScript OO class 为 pi agent 可识别的 prompt 模板。
license: UNLICENSED
---

# workflow-composer

> **⚠️ 占位骨架（PLACEHOLDER）**
>
> 本 SKILL.md 当前是占位骨架，**不含可执行的技能说明**。完整内容将在后续议题中补全。
>
> 当前 workflow-composer 主要供 `npm run build` 手动调用，pi agent 运行时调用流程尚未稳定。

## 用途（规划）

帮助 pi agent：

- 用 TypeScript OO class（继承 `BaseAgent` 或 `GeneralBase`）编写 agent 定义
- 通过 `npm run build` 或 pi runtime 触发 workflow-composer 编译器
- 让产物落到使用方项目的 `.pi/agents/` 与 `.pi/prompts/` 供 pi agent 加载

## 当前状态

- 编译器代码：`src/compiler.ts`
- agent 源目录：`agents/*.ts`（7 个 agent 类）
- workflow 源目录：`workflows/*.ts`（4 个 workflow 类）
- 产物落点：使用方项目的 `.pi/agents/` 与 `.pi/prompts/`

## 已知 TODO

- [ ] 描述 pi agent 如何调用 workflow-composer 的具体步骤
- [ ] 描述如何在 agent 类中使用装饰器（@displayName、@description、@config）
- [ ] 描述 build 流程与产物校验