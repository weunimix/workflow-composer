/**
 * agent 基类的 mandatory 块（4 条硬约束）
 *
 * X 方案：作为独立常量导出，由 translator 静态 import 注入到产物 prompt
 * 不依赖 abstract class 字段——避免运行时实例化问题
 */
export const AGENT_MANDATORY: readonly string[] = [
  '1. 显式文件列表：需要读取的文件必须逐文件列出完整项目根相对路径。',
  '2. 上下文利用条款：你有 1M 上下文窗口可用，必须完整读取以上所有文件。',
  '3. 不确定性声明：输出末尾必须包含不确定性声明段落。',
  '4. Subagent 调用安全：禁止同时设置 async:false、concurrency>1、output:false、progress:false。'
]
