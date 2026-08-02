# OOP 概念方法论·综合指南

> 用途：未来构建 `workflow-composer` OOP agent 时参考
> 来源：
> - 项目自身设计：`docs/source-design-v1.md`（v1.2）、`docs/compiler-design-v1.md`
> - 通用 OOP 知识：SOLID 原则（Robert C. Martin）、Template Method / Hook（GoF）、.NET Framework Design Guidelines
>
> 文档定位：**不是教科书**——只记"与本项目 OOP 框架相关、可操作的"原则

---

## 1. 三大 OOP 框架模式在本项目的应用

### 1.1 Abstract Class + Template Method（核心骨架）

```
BaseAgent（abstract）
├── 直接继承：WebResearcher / Worker / FoundationLoaderAgent / NaturalistAgent
└── 中介继承：AuditBase
                ├── SystemAuditAgent
                └── NodeReviewAgent
```

**核心动作**：父类定算法骨架，子类填步骤——这就是 GoF 的 Template Method。

| 角色 | TS 形态 | 用途 |
|---|---|---|
| 算法骨架 | `compileOutput()`（concrete method）| 收集元数据 → 渲染产物 |
| abstract 步骤 | `summary()` / `getSteps()` / `buildOutput()` | 子类必须实现 |
| hook 步骤 | `shouldDo()` / `shouldNot()` / `watchOut()` | 子类可选 override（默认 `[]`）|

**为什么用 abstract class 而不是 interface**（依据 .NET Framework Design Guidelines）：
- ✅ 共享默认实现（hook 默认 `[]`、compileOutput 公共算法）
- ✅ 共享字段（HARD_CONSTRAINTS 实例常量）
- ✅ 类型层次是"is-a"（SystemAuditAgent *is-a* AuditAgent）
- ❌ interface 不提供 default 行为——会迫使所有类重写 5 段契约，丧失基类价值

### 1.2 Hook Method（默认实现 + 子类增量）

```ts
// BaseAgent 默认空实现
public shouldDo(): string[] { return [] }

// 子类覆盖——保留父类默认项再追加
class MyAgent extends BaseAgent {
  public shouldDo(): string[] {
    return [...super.shouldDo(), '我的规则 1', '我的规则 2']
  }
}
```

**这是 SRP 的微观体现**：基类只规定契约形状，子类掌握具体内容变化。

### 1.3 Has-a 共享（用普通类而非抽象）

```ts
// lib/readers/setting-graph-reader.ts
class SettingGraphReader { ... }

// agents/foundation-loader.ts
class FoundationLoaderAgent extends BaseAgent {
  private reader = new SettingGraphReader()  // has-a
}
```

**Has-a 准则**（依据项目 source-design §11.6）：
- 数据访问 / 服务调用 → 抽 has-a 普通类
- 共享行为 / 共享不变量 → 抽 is-a 抽象基类
- 当前未启用 Mixin（TS super.method() 语义冲突）

---

## 2. SOLID 五大原则在本项目

### 2.1 SRP（单一职责）

**原则**：一个类只对一种变化轴负责。

**本项目体现**：
- `BaseAgent`：只负责 agent 契约形状
- `AuditBase`：只负责审查类硬约束
- `SettingGraphReader`：只负责设定图谱检索
- 具体 agent：只负责具体行为（不可塞进审计逻辑）

**反模式警示**：把"涌现推理 + 路径枚举 + 输出格式化 + 不确定性声明生成"全塞在一个方法里——违反 SRP。

### 2.2 OCP（开闭原则）

**原则**：对扩展开放，对修改关闭。

**本项目体现**：
- `BaseAgent` 五段契约稳定，子类通过 override 扩展（不修改基类）
- 装饰器机制（`@description` / `@config` / `@displayName`）允许不修改基类而注入元数据
- 不允许修改 `BaseAgent` 已发布的方法签名（break v-table）

**反模式**：通过给 `BaseAgent` 加 if/else 判断"是否属于某子类"来扩展——破坏 OCP。

### 2.3 LSP（里氏替换）

**原则**：子类必须可替换父类而不破坏正确性。

**本项目体现**：
- `extends AuditBase` 任何审查类 → 可替换为 `BaseAgent` 视图
- 已锁定的 `protected → public` 修订（v1.1）：Runtime 派下 sibling 类跨类访问 → 必须保留 public
- 子类 override hook 不能抛异常或返回不一致类型

**反模式**：override hook 时悄悄添加"本类专属参数"——破坏 LSP 替换性。

### 2.4 ISP（接口隔离）

**原则**：不强迫客户端依赖它们不用的接口。

**本项目体现**：
- 5 段契约（summary / shouldDo / shouldNot / watchOut / getSteps / buildOutput）相互独立
- 没有"胖接口"——每段方法只承担一种职责
- 子类只 override 需要的段（hook 默认空实现，不强制重写）

### 2.5 DIP（依赖倒置）

**原则**：高层模块依赖抽象，不依赖具体。

**本项目体现**：
- **弱**：当前没有 interface，依赖链是 `具体 agent → abstract BaseAgent/AuditBase`，具体到抽象 ✓
- **弱**：`SettingGraphReader` 是具体类被 `FoundationLoaderAgent` 直接调用（违反严格 DIP）

**未来**（如果引入动态能力组合）：
- 把 `SettingGraphReader` 升级为 `interface ISettingReader` + 多实现
- 把"涌现推理"封装为 `interface IReasoningCapability`（如果未来真有多调用方）

**当前决策**：不过度为未来设计——保留 has-a 具体依赖，等第三个调用方出现再升级。

---

## 3. 模块化抽象·渐进四层

### 3.1 何时用哪种抽象？

| 场景 | 抽象方式 | 触发条件 |
|---|---|---|
| 角色专属行为差异 | subclass override | 仅一个 agent，但有清晰的"is-a"关系可扩展（如 future 审查类） |
| 共享不变量 / 硬约束 | abstract 基类（A → B → C） | ≥2 个具体类共用同一字符串/默认值（如 AuditBase.HARD_CONSTRAINTS） |
| 共享数据访问 / 服务 | has-a 普通类实例 | ≥2 个 agent 用到同一数据源（如 SettingGraphReader） |
| 共享方法 / 字符串常量 | `public static readonly` 字段或 `public` 方法 | ≥2 个不相干的类要复用但无 is-a 关系（如 NaturalistAgent.PRINCIPLES） |

### 3.2 项目内已应用的层级示例

| 抽象 | 文件 | 触发原因 |
|---|---|---|
| AuditBase（abstract 基类） | `lib/agents/audit-base.ts` | ≥2 个审查类共享 4 硬约束 |
| SettingGraphReader（has-a 普通类） | `lib/readers/setting-graph-reader.ts` | 跨 agent 共享图谱访问逻辑 |
| `NaturalistAgent.PRINCIPLES`（public static 常量） | `agents/naturalist.ts` | 涌现原则预期被其他"枚举型"流程复用 |
| `AuditBase.HARD_CONSTRAINTS`（protected 实例字段） | `lib/agents/audit-base.ts` | 4 硬约束字符串集中，子类用 `${this.HARD_CONSTRAINTS}` 引用 |

### 3.3 不该做的抽象

❌ **Mixin / Trait**：TS mixin 与 `super.method()` 语义冲突——除非有强需求
❌ **Strategy 模式**：agent 是 stateless 的，`tools` 字段已足够
❌ **State / Visitor / Observer / Chain**：agent 编译产物是静态文本，无需这些动态结构
❌ **Decorator 行为模式**：与元数据装饰器（`@description`）语义分离——前者管行为扩展，后者管元信息注入

---

## 4. 子类 override 协议（LSP 微观层）

### 4.1 hook 扩展的正确写法

```ts
class ChildAgent extends ParentAgent {
  public shouldDo(): string[] {
    return [...super.shouldDo(), '新增规则 1', '新增规则 2']  // 保留默认 + 增量
  }
}
```

不要直接 `return ['新规则']` 而丢掉父类默认项——除非你能论证父类默认值已不适用。

### 4.2 abstract 方法覆盖——必须实现

`summary()` / `getSteps()` / `buildOutput()` 是 abstract（强制实现）。子类必须返回字符串，不可省略。

### 4.3 跨类组合（Runtime 派原生）

```ts
class WorkerAgent extends BaseAgent {
  public researcher = new WebResearcherAgent()  // has-a 子 agent

  public someMethod(): void {
    const result = this.researcher.shouldDo()  // 直接跨类访问
  }
}
```

依据 source-design §7.6：Runtime 派下父类声明 `public`，子类不能改窄到 `protected`（TS variance 规则 + 跨 sibling 访问需要）。

---

## 5. 装饰器 vs OOP 抽象的边界

| 用途 | 实现 | 不是 OOP 抽象 |
|---|---|---|
| 元数据注入（class 静态字段）| `@description('...')` `@config({...})` `@displayName('...')` | ❌ 不参与继承树；不改运行时行为；不被 override |
| 行为扩展 | abstract 方法 + override | ✅ 是 OOP 核心 |

**装饰器只是 metadata 注入器**——它不能替代 OOP 抽象（如 abstract class / interface）。把"涌现推理原则"塞到某个装饰器里是**错误用法**。

---

## 6. 命名与文件协议

### 6.1 类名（英文 PascalCase）vs 文件名（中文 .md）

**当前项目决策**（决策 A 修订）：
- 源 `.ts` 类名：英文 PascalCase（如 `NaturalistAgent`）—— 保持代码规范
- 编译产物 `.md` 文件名：中文（自然化推理.md）—— 用户层友好
- 关联由 `@displayName('中文名')` 显式声明

**为什么不用类名直接 kebab 做文件名**：
- 类名英文 vs 产物中文——两者解耦让代码规范不受 UI 影响
- `@displayName` 让产物名与类名分离——一个文件改了不影响另一处

### 6.2 frontmatter 命名协议

```yaml
---
name: 自然化推理           # 中文显示名（与 @displayName 一致）
description: ...           # @description 装饰器注入
tools: read                 # @config 装饰器注入
context: fresh              # 同上
systemPromptMode: replace   # 同上
inheritProjectContext: false
inheritSkills: false
---
```

name 字段是 PI runtime 查找 key——**必须**与 `@displayName` 一致，否则 skill 层 `agent: "自然化推理"` 找不到。

### 6.3 access 默认修饰符

依据 source-design §7.6（v1.1 修订）：
- `BaseAgent` 类的 public 成员（5 段契约、3 hook）→ 子类保持 public
- 子类自定义成员 → 用户自选 private / protected / public
- 不要把父类 public 改窄到 protected —— TS 会拒绝（variance 规则）

---

## 7. 构建新 OOP agent 的检查清单

当你准备创建 `agents/X.ts` 时，按顺序检查：

- [ ] **基类**：`extends BaseAgent` 还是 `extends AuditBase`？
  - 含完整 4 硬约束段 → AuditBase
  - 不含 / 不重复 → BaseAgent
- [ ] **displayName**：中文产物名（用户层）
- [ ] **@description**：工具视角描述
- [ ] **@config**：tools / context / systemPromptMode / inheritProjectContext / inheritSkills
- [ ] **5 段契约**：summary / shouldDo / shouldNot / watchOut / getSteps / buildOutput 全部覆盖
- [ ] **是否有跨类复用片段**：如有 → `public static readonly` 字段或 `public` 方法
- [ ] **不创建抽象层**：除非 ≥3 个调用方出现
- [ ] **不引入 Mixin / Strategy / Visitor** 等当前未启用的模式

### 7.1 输出格式的处理准则

| 模式 | 用法 |
|---|---|
| `buildOutput()` 内联 | **特化场景**——输出格式只属于此 agent（决策 A） |
| `public static readonly` 输出模板常量 | 仅当 ≥2 个 agent 真正要复用此 schema（先写死，等 ≥3 个调用方再抽） |
| abstract method `outputTemplate()` hook | **不要做**——多一层间接无收益 |

### 7.2 不确定性声明协议

所有审计类 / 推理类 agent（任何对结论下断言的 agent）：**必须**在输出末尾包含不确定性声明段。

- AuditBase 子类：`this.uncertaintyTableTemplate()` 已有模板可用
- 直接 BaseAgent 子类：手写一份相同结构的不确定性表

---

## 8. 决策记录（v1.x 锁定的）

| 主题 | 决策 | 修订理由 |
|---|---|---|
| 装饰器 | `@description` `@config` `@displayName` 三种 | metadata 注入，不与 OOP 行为混淆 |
| 段粒度 | 3 段（identity / task / output）| 每段独立可复用 + 可演化 |
| abstract method | summary / getSteps / buildOutput | 与 3 段绑定 |
| hook | shouldDo / shouldNot / watchOut | 行为约束的归类（Should do / Should not / Watch out）|
| access | 父类 public → 子类必须 public | Runtime 派下 sibling 跨类访问需 public（v1.1）|
| 已锁 Template Method | `compileOutput()` 在 BaseAgent concrete | 公共入口，**不**允许子类替换 |
| 抽象根 | 仅 BaseAgent / AuditBase 两个 abstract | 避免抽象层膨胀 |
| 跨文件支持 | `extends` 跨文件 + `import` | 多文件场景支持（C 决策）|
| Mixin | 暂不启用 | TS 语义冲突，除非有强需求 |

---

## 9. 失败案例 / 反模式清单

❌ **把 prompt 形式化拆分为 N 段 TODO**——prompt 段落与 method 段不一一对应
❌ **没有调用方就抽 lib 子目录**——违反"不过度为未来设计"
❌ **装饰器里塞复杂逻辑**——装饰器只能是 metadata 注入
❌ **override hook 时丢弃父类默认**（无依据时）——违反 LSP
❌ **abstract class 写 public constructor**（.NET 警告适用）——本项目 framework 用 abstract 直接实例化时 TS 已阻止
❌ **在 super.method() 链中加仅子类专属参数**——破坏 v-table
❌ **创建 Strategy / Factory / Builder 当下没用**——DI 适用但需 ≥3 个变体
❌ **把 has-a 服务直接抽成 abstract 基类**——Has-a ≠ is-a（数据访问 ≠ 行为合约）

---

## 10. 总结：一句话版本

> **本项目 OOP 框架 = Template Method + Hook + Has-a 共享，三层渐进抽象。SOLID 中除 DIP 偏弱（待未来）外皆严格遵守。装饰器只用于元信息，不参与继承树。新 agent 设计时按检查清单 7.1 / 7.2 / 7.3 项逐项核验。**
