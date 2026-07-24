---
name: workflow-composer
description: OOP workflow and agent template compiler. Use `workflow-composer build` to compile templates, `workflow-composer init` to set up a project.
---

# workflow-composer — OOP 工作流模板编译器

## 何时使用

- 创建新的工作流模块（如联网搜索、对照实验）
- 创建新的 agent 模板
- 修改现有模块的提示词（通过模板而非直接改编译产物）
- 编译模板产生 pi 可加载的工作流/agent 文件
- 初始化项目的模板目录结构

## 核心理念

工作流是函数的集合。`/workflow` 命令将用户文本中的关键词展开为预置模块的完整内容。

工作流模块本身使用 OOP 构建——`extends`/`slots`/`mandatory`——消除模块间的重复内容。

## 文件布局

```
workflow-composer/            ← 包自身
├── lib/
│   ├── workflows/            ← 工作流基类（abstract）
│   └── agents/               ← agent 基类（工作流委派步骤的依赖）
├── src/                      ← 编译器源码
├── prompts/                  ← `/workflow` 入口
└── skills/                   ← AI 操作手册

项目/.pi/
├── agent-templates/
│   ├── workflows/            ← 工作流模板源文件
│   └── agents/               ← agent 模板源文件
├── workflows/                ← 编译输出 + _index.md
└── agents/                   ← agent 编译输出
```

## 命令

### `workflow-composer build`

编译 workflow 和 agent 模板。

```bash
workflow-composer build
workflow-composer build --agents   # 仅 agent
```

### `workflow-composer init`

初始化模板目录。

## 模板语法

与 agent 模板相同：`extends`/`slots`/`mandatory`/`overrides`。

工作流模板特有 frontmatter 字段：
- `trigger` — 触发关键词（用于 `/workflow` 展开）
- `name` — 模块名（输出文件名）
