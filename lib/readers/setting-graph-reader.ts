// workflow-composer/lib/readers/setting-graph-reader.ts
// 标准检索流程模块 —— 提炼自 foundation-loader 的核心职责
// 所有"使用设定图谱"的 agent 都应通过本模块完成，而非 inline 重复实现

// ========== 数据类型 ==========

export interface DomainLoadSpec {
  domain: string
  /** 该 domain 对应的层级 1/2 必加载文档 */
  loadingPaths: string[]
}

export interface NodeSummary {
  name: string
  domain: string
  status: 'confirmed' | 'skeleton' | 'filling' | 'pending'
  corePremise: string
}

export interface ConstraintSummary {
  domain: string
  /** Layer 0 元规则（不可覆盖） */
  layer0: string[]
  /** 基调排除项（创作宪法 § 怪诞即自然 中的 ❌ 条目） */
  baseToneExclusions: string[]
  /** 平台审核约束（创作宪法 § 五 的四条） */
  platformReviewConstraints: string[]
  /** Domain 约束（来自层级 1-2 文档） */
  domainConstraints: { source: string; constraint: string }[]
  /** 同域邻居节点 */
  sameDomainNeighbors: NodeSummary[]
  /** 文档间冲突标记 */
  conflicts: string[]
}

// ========== 静态数据（MVP：从设定图谱.md 提炼）==========

const DOMAIN_LOADING: Record<string, string[]> = {
  '科学': ['另类科学体系'],
  '宗教': ['神圣性论证', '设定系统/设定语法/宗教系统设计'],
  '社会': ['势力关系元定义'],
  '种族': ['另类科学体系', '势力关系元定义'],
  '城市': ['创作宪法#世界设定'],
  '角色': ['势力关系元定义'],
  '历史': [],
  '自然': ['现实物理（隐式）', '意识场', '因果流']
}

const LAYER0_RULES: string[] = [
  '世界内在一致性优先',
  '基调（怪诞中性、叙事口吻）',
  '叙事结构',
  '文风操作规范',
  '留白原则',
  'Layer 0 内容绝对不能写入任何设定（创作者内部工具，世界内不可知）'
]

const NODES_BY_DOMAIN: Record<string, NodeSummary[]> = {
  '科学': [
    { name: '科技水平', domain: '科学', status: 'confirmed', corePremise: '科学技术水平基线' },
    { name: '生物学', domain: '科学', status: 'confirmed', corePremise: '另类生物学领域基础' },
    { name: '灵魂学', domain: '科学', status: 'confirmed', corePremise: '灵魂现象的另类科学解释' }
  ],
  '宗教': [
    { name: '正教', domain: '宗教', status: 'confirmed', corePremise: '正统宗教机构与教义基础' }
  ],
  '社会': [
    { name: '社会结构', domain: '社会', status: 'confirmed', corePremise: '社会层级与势力基础' },
    { name: '经济', domain: '社会', status: 'confirmed', corePremise: '经济体系与贸易基础' }
  ],
  '种族': [
    { name: '种族', domain: '种族', status: 'confirmed', corePremise: '种族定义与生理基础' }
  ],
  '城市': [
    { name: '城市', domain: '城市', status: 'confirmed', corePremise: '城市形态与运转逻辑' },
    { name: '地理', domain: '城市', status: 'confirmed', corePremise: '地理环境基础' }
  ],
  '历史': [
    { name: '历史', domain: '历史', status: 'confirmed', corePremise: '历史脉络（P0 无依赖）' }
  ]
}

// ========== Reader 主类 ==========

export class SettingGraphReader {
  // A. 入口：domain → 加载组合
  getLoadingCombination(domain: string): string[] {
    return DOMAIN_LOADING[domain] ?? []
  }

  // D. 邻居查询：domain → 同域活跃节点
  getActiveNodesByDomain(domain: string): NodeSummary[] {
    return NODES_BY_DOMAIN[domain] ?? []
  }

  // E. 主流程：domain → 约束摘要
  loadConstraintsByDomain(domain: string): ConstraintSummary {
    return {
      domain,
      layer0: [...LAYER0_RULES],
      baseToneExclusions: [],            // 创作宪法 § 怪诞即自然 ❌ 条目（待具体化）
      platformReviewConstraints: [],    // 创作宪法 § 五 的四条（待具体化）
      domainConstraints: [],             // 实际工程需要按 loadingCombination 读文件后逐条提取
      sameDomainNeighbors: this.getActiveNodesByDomain(domain),
      conflicts: []
    }
  }

  // 渲染约束摘要为可读 markdown
  renderConstraintSummary(summary: ConstraintSummary): string {
    const lines: string[] = []
    lines.push(`### Layer 0 约束（不可覆盖）`)
    for (const r of summary.layer0) lines.push(`- ⚠️ ${r}`)
    lines.push('')
    lines.push(`### 同域邻居节点（${summary.domain}）`)
    if (summary.sameDomainNeighbors.length === 0) {
      lines.push(`- （无）`)
    } else {
      for (const n of summary.sameDomainNeighbors) {
        lines.push(`- [[${n.name}]]（${n.status}）— 核心前提：${n.corePremise}`)
      }
    }
    lines.push('')
    lines.push(`### Domain 加载组合`)
    const lc = this.getLoadingCombination(summary.domain)
    if (lc.length === 0) {
      lines.push(`- （无专用底层设定）`)
    } else {
      for (const p of lc) lines.push(`- ${p}`)
    }
    return lines.join('\n')
  }
}
