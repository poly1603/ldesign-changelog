/**
 * Interactive 命令
 * 启动交互式 CLI 模式
 */

import { Command } from 'commander'
import { createInteractiveCLI } from '../InteractiveCLI.js'
import { loadConfig } from '../config-loader.js'
import { logger } from '../../utils/logger.js'

/**
 * 创建 interactive 命令
 * 实现需求 5.1: 交互式 CLI 向导和主题配置
 */
export function createInteractiveCommand(): Command {
  const command = new Command('interactive')

  command
    .alias('i')
    .description('启动交互式模式')
    .option('--theme <theme>', '主题 (default|minimal|colorful)', 'default')
    .option('--no-hints', '不显示帮助提示')
    .option('--config <file>', '配置文件路径')
    .action(async (options) => {
      try {
        // 加载配置
        const config = await loadConfig(options.config)

        // 验证主题选项
        const validThemes = ['default', 'minimal', 'colorful']
        if (!validThemes.includes(options.theme)) {
          logger.warn(`无效的主题: ${options.theme}，使用默认主题`)
          options.theme = 'default'
        }

        // 创建交互式 CLI
        const cli = createInteractiveCLI({
          theme: options.theme,
          showHints: options.hints !== false,
          config,
        })

        // 启动交互式模式
        await cli.start()
      } catch (error: any) {
        logger.error('交互式模式启动失败', error)
        process.exit(1)
      }
    })

  return command
}
