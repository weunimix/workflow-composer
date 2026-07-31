// workflow-composer/agents.config.ts
// 用户级配置：列出要被编译的所有 agent 类

import { WebResearcher } from './agents/researcher'
import { Worker } from './agents/worker'
import { FoundationLoaderAgent } from './agents/foundation-loader'
import { SystemAuditAgent } from './agents/system-audit-agent'
import { NodeReviewAgent } from './agents/node-review-agent'

export const agents = [
  WebResearcher,
  Worker,
  FoundationLoaderAgent,
  SystemAuditAgent,
  NodeReviewAgent
]
