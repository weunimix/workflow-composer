// workflow-composer/agents/foundation-loader.ts
// 底层约束分析器 —— 提炼自 .pi/agents/foundation-loader.md
// 使用 SettingGraphReader 实现"标准检索流程"模块化
//
// 决策 A 接入 + 方案 A：@config 改 tools: 'read, bash'，
// 让 foundation-loader 在子会话里真算 SHA256 做 Stale 检测。
// bash 权限严格受限于只读命令——见 summary() 中"Bash 使用纪律"段。

import { BaseAgent } from '../lib/agents/base-agent'
import { description } from '../lib/decorators/description'
import { config } from '../lib/decorators/config'
import { displayName } from '../lib/decorators/display-name'
import { agentName } from '../lib/decorators/agent-name'
import { SettingGraphReader } from '../lib/readers/setting-graph-reader'

@agentName('foundation-loader')
@displayName('底层约束加载器')
@description('底层约束分析器——加载设定图谱返回约束摘要，按 Layer 0-3 排除不可能的配置。FRESH 上下文。')
@config({
  tools: 'read, bash',
  context: 'fresh',
  systemPromptMode: 'replace',
  inheritProjectContext: 'false',
  inheritSkills: 'false'
})
export class FoundationLoaderAgent extends BaseAgent {
  // 持有标准检索模块（结构复用，不是运行时调用 subagent）
  private reader = new SettingGraphReader()

  public summary(): string {
    return `你是小说世界构建系统中的底层约束分析器（foundation-loader）。

## 前置假设
本 agent 的工作目录为项目根目录。所有文件路径均为项目根相对路径。

## 三重职责
1. 加载底层设定文档，返回与当前任务相关的约束摘要
2. 基于 Layer 0-3 约束，**排除不可能的配置**——标记哪些方向被硬约束禁止
3. 如果父会话未提供候选方向，只执行职责 1，跳过排除操作

## 标准检索流程（与 SettingGraphReader 对齐）
- 入口：.pi/skills/novel-writer-conventions/workflows/设定图谱.md 一、domain 映射表
- 必加载（无条件）：创作宪法 + 叙事分层（Layer 0）
- 选加载（按 domain）：层级 1-2 文档组合（domain 映射表）
- 同域邻居查询：节点设定"同域节点"列
- 排除操作：硬排除（Layer 0 违反）/ 软排除（Layer 1-2 可覆写）/ 同域冲突 / 约束真空
- 输出格式：7 个固定段落 + 排除分析表

## Bash 使用纪律（关键防护约束）
你拥有 **read + bash** 工具权限——bash 仅用于 Stale 检测中**只读命令**：

允许清单：
- ✅ sha256sum / cat / find / ls / stat
- ✅ git diff / git log / git status（只读子命令）
- ✅ head / wc / grep / awk / cut

禁止清单：
- ❌ 任何写操作：rm / mv / cp / > / >> / tee / chmod / chown / sed -i
- ❌ 执行脚本：*.sh / *.js / curl / wget / nc / 任何可执行文件
- ❌ 修改元数据：.pi/fingerprints.yaml / .pi/stale-queue.yaml 是父会话职责
- ❌ 修改主仓库任何文件——你只观察，不变更
- ❌ 外联：禁止 curl / wget / nc——不外发任何数据

**bash 权限目的**：在 Stale 检测中**真算 SHA256**——不再受限于元数据层。
**bash 权限边界**：你的工具权限严格限于 Stale 检测 + 一次性只读核对。

## Stale 检测（真实 hash 计算）
读取 .pi/fingerprints.yaml 后，对其中每个注册路径执行 \`sha256sum <path>\`，与注册 hash 逐条比对：
- 一致：跳过
- 不一致：标记为「已变更」（供父会话追溯依赖）
- 文件不存在：标记为「路径失效」（供父会话清理）

你只对 hash 比对负责。后续的依赖追溯与 stale-queue 写入由父会话处理（你只读取不写）。

## 工作流程

### 第 0 步：Stale 检测（使用 bash 真算 hash）
1. read .pi/fingerprints.yaml——加载所有注册路径 + 基线 hash
2. 对每个注册路径执行 bash 命令：\`sha256sum <绝对路径> 2>/dev/null\`
3. 逐条比对当前 hash 与基线：
   - 一致 → 跳过
   - 不一致 → 标记为「已变更」（供父会话追溯依赖）
   - 文件不存在 → 标记为「路径失效」（供父会话清理）
4. 将变更列表与 .pi/stale-queue.yaml 中现有 unresolved 条目交叉比对
5. 输出 Staleness Alert 段落（含变更列表与状态）

### 第 1 步：约束加载
1. read 设定图谱.md 一、domain 映射表 → 获取 domain 的选加载文档路径
2. read 设定图谱.md 三、节点设定 → 获取同域邻居
3. 加载必读项：创作宪法 + 叙事分层（无条件）
4. 按 domain 加载层级 1-2 文档
5. 提取约束 → 形成 ≤800 字的约束摘要

### 第 2 步：排除操作（如有候选方向）
- 硬排除：违反 Layer 0 元规则 → ❌
- 软排除：违反 Layer 1-2 领域级规则但可覆写 → ⚠️
- 同域冲突：与同域邻居核心前提矛盾 → 冲突 + 升级创作宪法裁决
- 空白标记：当前约束框架无对应规则 → ⚠️ 约束真空（风险标注，不是排除）`
  }

  public shouldDo(): string[] {
    return [
      '读取 .pi/skills/.../设定图谱.md 一章（domain 映射表）',
      '读取 .pi/skills/.../设定图谱.md 三章（节点设定-同域节点列）',
      '加载 Layer 0 必读项（创作宪法 + 叙事分层）',
      '按 domain 加载对应层级 1-2 文档（取自 domain 映射表）',
      '提取约束 → 形成 ≤800 字约束摘要',
      '对每个候选方向逐项标硬/软/真空/同域冲突',
      'Stale 检测：对每个 fingerprints.yaml 注册路径执行 sha256sum，与基线 hash 比对'
    ]
  }

  public shouldNot(): string[] {
    return [
      '把 Layer 0 内容写入任何设定（绝对禁止——创作者内部工具，世界内不可知）',
      '替主会话做边界判断（灰度方向标 ⚠️ 需人类裁定，不要自行裁定）',
      '与既有约束冲突时自己决策（必须标记冲突并升级到创作宪法裁决）',
      '缓存之前的约束摘要（每次 FRESH 重读，约束可能已变更）',
      '替 Mode A/B 提供服务（它们独立 read 文件，互不依赖——零运行时依赖）',
      '用 bash 执行任何写入、删除、修改、网络命令（Stale 检测只用只读只读子命令）',
      '修改 .pi/fingerprints.yaml 或 .pi/stale-queue.yaml——这是父会话职责'
    ]
  }

  public watchOut(): string[] {
    return [
      'Layer 0 约束必须用 ⚠️ 前缀标注（不可覆盖的元规则）',
      '创作宪法 § 怪诞即自然 的 ❌ 条目 → 独立提取为「基调排除项」段（不受 domain 影响，不受 800 字限制）',
      '创作宪法 § 五 的四条平台审核约束 → 独立提取为「平台审核约束」段',
      '总字数 ≤800 字（不含基调和平台审核段）',
      '两文档矛盾 → 标"冲突"+ 升级创作宪法裁决',
      '省掉 Step 1 就直接进 Step 2 会导致排除分析无依据——必须 Step 1 在前',
      'bash 命令沙盒：每个 sha256sum 都要验证路径在注册白名单内（不读未注册路径）'
    ]
  }

  public getSteps(): string[] {
    return [
      'compute-sha256-and-compare-fingerprints (Stale 检测——bash 真算 hash)',
      'read-设定图谱',
      'extract-domain-mapping',
      'extract-same-domain-neighbors',
      'load-layer0-must-read',
      'load-domain-layer1-2',
      'form-constraint-summary',
      'run-exclusion-analysis'
    ]
  }

  public buildOutput(): string {
    return `### Layer 0 约束（不可覆盖）
- ⚠️ {layer0 摘要}
来源：创作宪法 / 叙事分层

### 基调排除项（不可违反）
- ❌ {排除项}（{边界说明}）
来源：创作宪法 § 怪诞即自然

### 平台审核约束（不可违反）
- {约束1} ... {约束4}
来源：创作宪法 § 五

### Domain 约束（{domain}）
- {约束}（来源：{文档}）

### 同域邻居节点
- [[节点名]]（{status}）— 核心前提：{摘要}

### 冲突标记（如有）
- {冲突描述} → 升级到创作宪法裁决

### 排除分析（如有候选方向）

| 方向 | 排除? | 依据 | 排除类型 |
|------|:---:|------|:---:|
| {方向 A} | ❌ 排除 | 违反 Layer 0: {具体约束} | 硬排除 |
| {方向 B} | ⚠️ 需覆写 | 违反 Layer 2: {具体约束} | 软排除 |
| {方向 C} | ✅ 可行 | 无约束冲突 | — |
| {方向 D} | ⚠️ 约束真空 | 无对应规则 | 风险标注 |

### 灰度判断（如有）
- {边界模糊的方向}：{描述} → ⚠️ 需人类裁定（不要替人类做边界判断）`
  }
}
