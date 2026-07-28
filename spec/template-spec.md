# workflow-composer 模板规范 v0.1

> 本文档的权威实现是 `src/rules.mjs`。如有出入，以代码为准。

## 一、资源类型

| 类型 | frontmatter | 编译器行为 |
|------|:---:|------|
| **abstract** | `abstract: true` | 不可编译为独立文件。仅作为 `extends` 目标存在 |
| **concrete** | 无 `abstract` 字段 | 正常编译输出 |

## 二、Frontmatter 字段

### agent 模板

| 字段 | 类型 | 必需 | 合并规则 | 说明 |
|------|------|:---:|------|------|
| `name` | string | ✅ | 子覆盖父 | 输出文件名 |
| `description` | string | ✅ | 子覆盖父 | |
| `tools` | string | ✅ | 子追加父（去重） | 逗号分隔 |
| `context` | string | ✅ | 子覆盖父 | `fresh` / `fork` |
| `systemPromptMode` | string | ✅ | 子覆盖父 | `replace` / `append` |
| `inheritProjectContext` | boolean | ✅ | 子覆盖父 | |
| `inheritSkills` | boolean | ✅ | 子覆盖父 | |
| `thinking` | string | | 子覆盖父 | |
| `maxExecutionTimeMs` | number | | 子覆盖父 | |
| `abstract` | boolean | | 不透传 | OOP 专用 |
| `extends` | string | | 不透传 | 基类路径 |
| `slots` | object | | 不透传 | `{name: value}` |
| `overrides` | string[] | | 不透传 | 有意覆写的字段 |
| `silent_overrides` | string[] | | 不透传 | 同上，不触发 warning |

### workflow 模板

| 字段 | 类型 | 必需 | 说明 |
|------|------|:---:|------|
| `name` | string | ✅ | 输出文件名 |
| `trigger` | string | ✅ | `/workflow` 关键词 |
| `description` | string | ✅ | |
| `abstract` | boolean | | |
| `extends` | string | | |
| `slots` | object | | |
| `overrides` | string[] | | |
| `silent_overrides` | string[] | | |

## 三、Body 语法

| 语法 | 位置 | 含义 |
|------|------|------|
| `{{slot:name}}` | 基类 body | 必需 slot。子类未填 → 编译 error |
| `{{slot:name?}}` | 基类 body | 可选 slot。子类未填 → 移除该行 |
| `<!-- mandatory:start -->`...`<!-- mandatory:end -->` | 基类 body | 强制注入块。编译器在输出后验证其完整存在于 resolved body 中 |

## 四、继承解析

### extends 路径解析

优先级：子文件所在目录 → 项目 templates 目录 → workflow-composer `lib/` 目录

### 合并流程

```
chain = [rootBase, ..., child]   ← 递归解析 extends

frontmatter:
  标量字段 → child 覆盖 parent
  列表字段 → child 追加 parent（去重）
  去除 OOP 字段

body:
  1. rootBase.body 为基线
  2. {{slot:name}} → chain 中最后声明该 slot 的值填充
  3. optional slot 未填 → 移除占位行
  4. child.body 追加到基线末尾
  5. mandatory 块保留在基线中（不可移除）
```

### override 验证

编译器对比 child 与 resolved base 的 frontmatter。变更未声明 → warning。声明了但未实际变更 → warning。`name` 字段自动豁免。

## 五、目录约定

```
workflow-composer/lib/
├── workflows/          ← 工作流基类 (abstract)
│   └── _workflow.md
├── agents/             ← agent 基类 (abstract)
│   └── _researcher.md
```

```
项目/.pi/agent-templates/
├── workflows/          ← 工作流模板源文件
├── agents/             ← agent 模板源文件
```

```
项目/.pi/
├── workflows/          ← 工作流编译输出 + _index.md
└── agents/             ← agent 编译输出
```

`_` 前缀文件、`base/` 目录在编译时自动跳过。
