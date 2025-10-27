/**
 * Generate 命令
 */

import { Command } from 'commander'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'

/**
 * 创建 generate 命令
 */
export function createGenerateCommand(): Command {
  const command = new Command('generate')

  command
    .description('生成 Changelog')
    .option('--version <version>', '指定版本号')
    .option('--from <tag>', '起始标签')
    .option('--to <tag>', '结束标签', 'HEAD')
    .option('--output <file>', '输出文件')
    .option('--format <format>', '输出格式 (markdown|json|html)')
    .option('--template <file>', '自定义模板路径')
    .option('--config <file>', '配置文件路径')
    .option('--no-write', '不写入文件，仅输出到控制台')
    .action(async (options) => {
      try {
        const spinner = logger.startSpinner('正在生成 Changelog...')

        // 加载配置
        const config = await loadConfig(options.config)

        // 合并命令行选项
        if (options.output) config.output = options.output
        if (options.format) config.format = options.format
        if (options.template) config.template = options.template

        // 创建生成器
        const generator = createChangelogGenerator(config)

        // 生成 Changelog
        const version = options.version || 'Unreleased'
        const content = await generator.generate(version, options.from, options.to)

        if (options.write === false) {
          // 仅输出到控制台
          spinner.stop()
          const formatted = generator.format(content)
          console.log('\n' + formatted)
        } else {
          // 写入文件
          await generator.write(content)
          logger.stopSpinner(true, `Changelog 已生成: ${config.output}`)
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('生成 Changelog 失败', error)
        process.exit(1)
      }
    })

  return command
}

