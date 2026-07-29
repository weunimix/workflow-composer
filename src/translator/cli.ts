import { parseAgentFile } from './parser.js'
import { renderAgent } from './renderer.js'

/**
 * Phase 1.4 CLI 入口
 *
 * 用法：
 *   tsx src/translator/cli.ts <path-to-agent-ts-file>            # 输出 procedural markdown
 *   tsx src/translator/cli.ts --json <path-to-agent-ts-file>    # 输出 ParsedAgent JSON
 */

const args = process.argv.slice(2)
const mode = args[0] === '--json' ? 'json' : 'md'
const filePath = mode === 'json' ? args[1] : args[0]

if (!filePath) {
  console.error('用法：')
  console.error('  tsx src/translator/cli.ts <path-to-agent-ts-file>           # 输出 procedural markdown')
  console.error('  tsx src/translator/cli.ts --json <path-to-agent-ts-file>   # 输出 ParsedAgent JSON')
  process.exit(1)
}

const parsed = parseAgentFile(filePath)

if (mode === 'json') {
  console.log(JSON.stringify(parsed, null, 2))
} else {
  console.log(renderAgent(parsed))
}
