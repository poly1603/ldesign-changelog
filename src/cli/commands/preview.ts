/**
 * Preview 命令 - 预览 Changelog 内容
 */

import { Command } from 'commander'
import chalk from 'chalk'
import boxen from 'boxen'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'

/**
 * 创建 preview 命令
 */
export function createPreviewCommand(): Command {
  const command = new Command('preview')

  command
    .description('预览即将生成的 Changelog 内容（不写入文件）')
    .option('--version <version>', '指定版本号', 'Unreleased')
    .option('--from <tag>', '起始标签')
    .option('--to <tag>', '结束标签', 'HEAD')
    .option('--format <format>', '输出格式 (markdown|json|html)', 'markdown')
    .option('--config <file>', '配置文件路径')
    .option('--no-color', '禁用颜色输出', false)
    .option('--stats', '显示统计信息', false)
    .action(async (options) => {
      try {
        const spinner = logger.startSpinner('正在生成预览...')

        // 加载配置
        const config = await loadConfig(options.config)

        // 合并命令行选项
        if (options.format) config.format = options.format

        // 创建生成器
        const generator = createChangelogGenerator(config)

        // 生成 Changelog
        const content = await generator.generate(options.version, options.from, options.to)

        logger.stopSpinner(true)

        // 显示统计信息
        if (options.stats && content.stats) {
          displayStats(content.stats)
        }

        // 格式化并显示内容
        const formatted = generator.format(content)

        console.log()
        console.log(boxen(chalk.bold.blue('📝 Changelog 预览'), {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'blue',
        }))
        console.log()

        if (options.color === false) {
          console.log(formatted)
        } else {
          console.log(highlightMarkdown(formatted))
        }

        console.log()
        console.log(chalk.gray('💡 提示: 使用 generate 命令将内容写入文件'))
        console.log()
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('预览生成失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 显示统计信息
 */
function displayStats(stats: any): void {
  console.log()
  console.log(chalk.bold('📊 统计信息:'))
  console.log()
  console.log(`  ${chalk.cyan('总提交数:')} ${stats.totalCommits}`)
  console.log(`  ${chalk.cyan('贡献者数:')} ${stats.contributorCount}`)
  
  if (stats.issueCount) {
    console.log(`  ${chalk.cyan('关联 Issue:')} ${stats.issueCount}`)
  }
  
  if (stats.prCount) {
    console.log(`  ${chalk.cyan('关联 PR:')} ${stats.prCount}`)
  }

  if (stats.durationDays) {
    console.log(`  ${chalk.cyan('时间跨度:')} ${stats.durationDays} 天`)
  }

  if (stats.commitsPerDay) {
    console.log(`  ${chalk.cyan('平均提交:')} ${stats.commitsPerDay.toFixed(2)} 次/天`)
  }

  // 按类型统计
  if (stats.commitsByType && Object.keys(stats.commitsByType).length > 0) {
    console.log()
    console.log(chalk.bold('  按类型分布:'))
    for (const [type, count] of Object.entries(stats.commitsByType)) {
      const percentage = ((count as number / stats.totalCommits) * 100).toFixed(1)
      console.log(`    ${type}: ${count} (${percentage}%)`)
    }
  }

  console.log()
}

/**
 * 高亮 Markdown 内容
 */
function highlightMarkdown(content: string): string {
  const lines = content.split('\n')
  const highlighted: string[] = []

  for (const line of lines) {
    if (line.startsWith('# ')) {
      // 一级标题
      highlighted.push(chalk.bold.blue(line))
    } else if (line.startsWith('## ')) {
      // 二级标题
      highlighted.push(chalk.bold.cyan(line))
    } else if (line.startsWith('### ')) {
      // 三级标题
      highlighted.push(chalk.bold.green(line))
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // 列表项
      highlighted.push(chalk.white(line))
    } else if (line.match(/^\[.*\]/)) {
      // 链接
      highlighted.push(chalk.blue(line))
    } else {
      highlighted.push(line)
    }
  }

  return highlighted.join('\n')
}
