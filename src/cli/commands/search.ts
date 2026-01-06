/**
 * Search 命令
 */

import { Command } from 'commander'
import Table from 'cli-table3'
import chalk from 'chalk'
import { SearchEngine } from '../../core/SearchEngine.js'
import type { SearchQuery } from '../../core/SearchEngine.js'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { getLatestTag } from '../../utils/git-utils.js'
import { logger } from '../../utils/logger.js'

/**
 * 创建 search 命令
 */
export function createSearchCommand(): Command {
  const command = new Command('search')

  command
    .description('搜索和过滤 Changelog 条目')
    .argument('[keyword]', '搜索关键词')
    .option('--from <tag>', '起始标签')
    .option('--to <tag>', '结束标签', 'HEAD')
    .option('--type <types...>', '按类型过滤 (feat, fix, docs, etc.)')
    .option('--scope <scopes...>', '按作用域过滤')
    .option('--author <authors...>', '按作者过滤')
    .option('--date-from <date>', '起始日期 (YYYY-MM-DD)')
    .option('--date-to <date>', '结束日期 (YYYY-MM-DD)')
    .option('--sort-by <field>', '排序字段 (date, type, relevance)', 'date')
    .option('--sort-order <order>', '排序方向 (asc, desc)', 'desc')
    .option('--page <number>', '页码', '1')
    .option('--page-size <number>', '每页大小', '20')
    .option('--format <format>', '输出格式 (table, json, list)', 'table')
    .option('--highlight', '高亮匹配的关键词')
    .action(async (keyword, options) => {
      try {
        const spinner = logger.startSpinner('正在搜索 Changelog...')

        // 如果没有指定 from，尝试获取最新 tag
        let from = options.from
        if (!from) {
          from = await getLatestTag() || undefined
        }

        // 生成 changelog 内容
        const generator = createChangelogGenerator()
        const content = await generator.generate('search', from, options.to)

        // 创建搜索引擎并建立索引
        const engine = new SearchEngine({
          caseSensitive: false,
          defaultPageSize: parseInt(options.pageSize, 10),
        })
        engine.buildIndex(content)

        // 构建搜索查询
        const query: SearchQuery = {
          keyword,
          types: options.type,
          scopes: options.scope,
          authors: options.author,
          sortBy: options.sortBy,
          sortOrder: options.sortOrder,
          pagination: {
            page: parseInt(options.page, 10),
            pageSize: parseInt(options.pageSize, 10),
          },
        }

        // 添加日期范围过滤
        if (options.dateFrom || options.dateTo) {
          query.dateRange = {
            from: options.dateFrom ? new Date(options.dateFrom) : undefined,
            to: options.dateTo ? new Date(options.dateTo) : undefined,
          }
        }

        // 执行搜索
        const result = engine.search(query)

        logger.stopSpinner(true, `找到 ${result.total} 个结果`)

        // 输出结果
        if (result.total === 0) {
          console.log(chalk.yellow('\n⚠️  没有找到匹配的结果'))
          return
        }

        if (options.format === 'json') {
          console.log(JSON.stringify(result, null, 2))
        } else if (options.format === 'list') {
          displayResultList(result, keyword, options.highlight)
        } else {
          displayResultTable(result, keyword, options.highlight)
        }

        // 显示分页信息
        if (result.hasMore) {
          console.log(
            chalk.gray(
              `\n💡 显示第 ${result.page} 页，共 ${Math.ceil(result.total / result.pageSize)} 页。` +
              `使用 --page ${result.page + 1} 查看下一页。`
            )
          )
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('搜索失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 显示结果表格
 */
function displayResultTable(result: any, keyword?: string, highlight = false): void {
  console.log('\n' + chalk.bold.blue(`🔍 Search Results (${result.total} found)`))
  console.log(chalk.gray('─'.repeat(100)) + '\n')

  const table = new Table({
    head: [
      chalk.cyan('Type'),
      chalk.cyan('Scope'),
      chalk.cyan('Subject'),
      chalk.cyan('Author'),
      chalk.cyan('Date'),
    ],
    colWidths: [10, 12, 40, 15, 12],
    wordWrap: true,
  })

  for (const entry of result.entries) {
    let subject = entry.subject

    // 高亮关键词
    if (highlight && keyword) {
      const regex = new RegExp(`(${keyword})`, 'gi')
      subject = subject.replace(regex, chalk.yellow.bold('$1'))
    }

    table.push([
      getTypeColor(entry.type),
      entry.scope || '-',
      subject,
      entry.author.name,
      formatDate(entry.date),
    ])
  }

  console.log(table.toString() + '\n')
}

/**
 * 显示结果列表
 */
function displayResultList(result: any, keyword?: string, highlight = false): void {
  console.log('\n' + chalk.bold.blue(`🔍 Search Results (${result.total} found)`))
  console.log(chalk.gray('─'.repeat(100)) + '\n')

  for (const entry of result.entries) {
    let subject = entry.subject

    // 高亮关键词
    if (highlight && keyword) {
      const regex = new RegExp(`(${keyword})`, 'gi')
      subject = subject.replace(regex, chalk.yellow.bold('$1'))
    }

    console.log(
      `${getTypeColor(entry.type)} ${entry.scope ? chalk.gray(`(${entry.scope})`) : ''} ${subject}`
    )
    console.log(
      chalk.gray(`  👤 ${entry.author.name} · 📅 ${formatDate(entry.date)} · 🔗 ${entry.shortHash}`)
    )

    if (entry.body) {
      const bodyPreview = entry.body.substring(0, 100) + (entry.body.length > 100 ? '...' : '')
      console.log(chalk.gray(`  ${bodyPreview}`))
    }

    console.log()
  }
}

/**
 * 获取类型颜色
 */
function getTypeColor(type: string): string {
  const colors: Record<string, (text: string) => string> = {
    feat: chalk.green,
    fix: chalk.red,
    docs: chalk.blue,
    style: chalk.magenta,
    refactor: chalk.yellow,
    test: chalk.cyan,
    chore: chalk.gray,
  }

  const colorFn = colors[type] || chalk.white
  return colorFn(type)
}

/**
 * 格式化日期
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}
