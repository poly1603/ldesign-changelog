/**
 * UI 命令 - 启动可视化界面
 */

import { Command } from 'commander'
import { spawn } from 'child_process'
import { logger } from '../../utils/logger.js'
import { createUIServer } from '../../ui-server/index.js'

/**
 * 创建 ui 命令
 */
export function createUICommand(): Command {
  const command = new Command('ui')

  command
    .description('启动可视化管理界面')
    .option('--port <port>', '服务端口', '3000')
    .option('--no-open', '不自动打开浏览器')
    .action(async (options) => {
      try {
        const port = parseInt(options.port)
        
        logger.info('🚀 启动 Changelog 可视化界面...')

        // 启动 UI 服务器 (包含 API 和前端页面)
        await createUIServer(port)

        const url = `http://localhost:${port}`
        
        logger.success(`\n✨ 可视化界面已启动!`)
        logger.info(`   地址: ${url}`)
        logger.info(`\n   按 Ctrl+C 停止服务器\n`)

        // 自动打开浏览器
        if (options.open !== false) {
          openBrowser(url)
        }

        // 保持进程运行
        await new Promise(() => {})
      } catch (error: any) {
        logger.error('启动失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 打开浏览器
 */
function openBrowser(url: string): void {
  const platform = process.platform
  let cmd: string

  switch (platform) {
    case 'darwin':
      cmd = 'open'
      break
    case 'win32':
      cmd = 'start'
      break
    default:
      cmd = 'xdg-open'
  }

  spawn(cmd, [url], { shell: true, detached: true }).unref()
}

// 处理进程退出
process.on('SIGINT', () => {
  logger.info('\n正在停止服务器...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  process.exit(0)
})
