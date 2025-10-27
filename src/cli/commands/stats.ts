/**
 * Stats 命令
 */

import { Command } from 'commander'
import Table from 'cli-table3'
import chalk from 'chalk'
import { createCommitParser } from '../../core/CommitParser.js'
import { createStatsAnalyzer } from '../../core/StatsAnalyzer.js'
import { getGitCommits, getLatestTag, getRepositoryInfo } from '../../utils/git-utils.js'
import { logger } from '../../utils/logger.js'

/**
 * 创建 stats 命令
 */
export function createStatsCommand(): Command {
  const command = new Command('stats')

  command
    .description('显示 Changelog 统计信息')
    .option('--from <tag>', '起始标签')
    .option('--to <tag>', '结束标签', 'HEAD')
    .option('--format <format>', '输出格式 (table|json)', 'table')
    .action(async (options) => {
      try {
        const spinner = logger.startSpinner('正在分析提交统计...')

        // 如果没有指定 from，尝试获取最新 tag
        let from = options.from
        if (!from) {
          from = await getLatestTag() || undefined
        }

        // 获取提交
        const gitCommits = await getGitCommits(from, options.to)
        logger.debug(`获取到 ${gitCommits.length} 个提交`)

        // 获取仓库信息
        const repoInfo = await getRepositoryInfo().catch(() => null)

        // 解析提交
        const parser = createCommitParser({
          includeAllCommits: false,
          repositoryInfo: repoInfo || undefined,
        })
        const commits = parser.parse(gitCommits)

        // 统计分析
        const analyzer = createStatsAnalyzer({
          includeCommits: false,
          calculatePercentage: true,
          analyzeFrequency: true,
        })
        const stats = analyzer.analyze(commits)

        logger.stopSpinner(true, '统计分析完成')

        // 输出统计结果
        if (options.format === 'json') {
          console.log(JSON.stringify(stats, null, 2))
        } else {
          displayStatsTable(stats)
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('统计分析失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 显示统计表格
 */
function displayStatsTable(stats: any): void {
  console.log('\n' + chalk.bold.blue('📊 Changelog Statistics'))
  console.log(chalk.gray('─'.repeat(60)) + '\n')

  // 基本统计
  console.log(chalk.bold('📈 Overview'))
  const overviewTable = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    colWidths: [30, 30],
  })

  overviewTable.push(
    ['Total Commits', chalk.green(stats.totalCommits)],
    ['Contributors', chalk.green(stats.contributors.length)],
    ['Duration (days)', chalk.green(stats.frequency.durationDays)],
    ['Commits per Day', chalk.green(stats.frequency.commitsPerDay.toFixed(2))],
    ['Commits per Week', chalk.green(stats.frequency.commitsPerWeek.toFixed(2))],
  )

  console.log(overviewTable.toString() + '\n')

  // 按类型统计
  console.log(chalk.bold('📝 Commits by Type'))
  const typeTable = new Table({
    head: [chalk.cyan('Type'), chalk.cyan('Count'), chalk.cyan('Percentage')],
    colWidths: [20, 15, 15],
  })

  for (const typeStats of stats.byType) {
    typeTable.push([
      typeStats.type,
      chalk.green(typeStats.count),
      chalk.yellow(`${typeStats.percentage}%`),
    ])
  }

  console.log(typeTable.toString() + '\n')

  // 贡献者排行
  console.log(chalk.bold('👥 Top Contributors'))
  const contributorTable = new Table({
    head: [chalk.cyan('Name'), chalk.cyan('Email'), chalk.cyan('Commits'), chalk.cyan('Percentage')],
    colWidths: [20, 30, 12, 12],
  })

  const topContributors = stats.contributors.slice(0, 10)
  for (const contributor of topContributors) {
    contributorTable.push([
      contributor.name,
      contributor.email,
      chalk.green(contributor.commitCount),
      chalk.yellow(`${contributor.percentage}%`),
    ])
  }

  console.log(contributorTable.toString() + '\n')

  // 引用统计
  if (stats.references.issueCount > 0 || stats.references.prCount > 0) {
    console.log(chalk.bold('🔗 References'))
    const refTable = new Table({
      head: [chalk.cyan('Type'), chalk.cyan('Count')],
      colWidths: [30, 30],
    })

    refTable.push(
      ['Issues Closed', chalk.green(stats.references.issueCount)],
      ['Pull Requests', chalk.green(stats.references.prCount)],
    )

    console.log(refTable.toString() + '\n')
  }

  // 活跃度
  if (stats.frequency.mostActiveDay || stats.frequency.mostActiveWeek) {
    console.log(chalk.bold('⚡ Activity'))
    const activityTable = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value')],
      colWidths: [30, 30],
    })

    if (stats.frequency.mostActiveDay) {
      activityTable.push([
        'Most Active Day',
        `${stats.frequency.mostActiveDay.date} (${chalk.green(stats.frequency.mostActiveDay.count)} commits)`,
      ])
    }

    if (stats.frequency.mostActiveWeek) {
      activityTable.push([
        'Most Active Week',
        `${stats.frequency.mostActiveWeek.week} (${chalk.green(stats.frequency.mostActiveWeek.count)} commits)`,
      ])
    }

    console.log(activityTable.toString() + '\n')
  }
}

