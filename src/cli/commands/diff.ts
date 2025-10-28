/**
 * Diff 命令 - 对比两个版本的 Changelog
 */

import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'
import type { ChangelogContent } from '../../types/changelog.js'

/**
 * 创建 diff 命令
 */
export function createDiffCommand(): Command {
  const command = new Command('diff')

  command
    .description('对比两个版本的 Changelog 差异')
    .argument('<from>', '起始版本')
    .argument('<to>', '结束版本')
    .option('--config <file>', '配置文件路径')
    .option('--format <format>', '输出格式 (text|json|table)', 'text')
    .option('--detailed', '显示详细差异', false)
    .action(async (from: string, to: string, options) => {
      try {
        const spinner = logger.startSpinner('正在对比版本...')

        // 加载配置
        const config = await loadConfig(options.config)

        // 创建生成器
        const generator = createChangelogGenerator(config)

        // 生成两个版本的内容
        const fromContent = await generator.generate('From', undefined, from)
        const toContent = await generator.generate('To', from, to)

        logger.stopSpinner(true)

        // 计算差异
        const diff = calculateDiff(fromContent, toContent)

        // 显示差异
        if (options.format === 'json') {
          console.log(JSON.stringify(diff, null, 2))
        } else if (options.format === 'table') {
          displayDiffTable(diff)
        } else {
          displayDiffText(diff, options.detailed, from, to)
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('对比失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 差异数据
 */
interface DiffResult {
  summary: {
    from: string
    to: string
    addedCommits: number
    removedCommits: number
    addedContributors: number
    changedTypes: Record<string, { added: number; removed: number }>
  }
  commits: {
    added: any[]
    removed: any[]
  }
  contributors: {
    added: any[]
    removed: any[]
  }
}

/**
 * 计算差异
 */
function calculateDiff(from: ChangelogContent, to: ChangelogContent): DiffResult {
  // 提取提交 hash 集合
  const fromHashes = new Set(from.commits.map(c => c.hash))
  const toHashes = new Set(to.commits.map(c => c.hash))

  // 计算新增和删除的提交
  const addedCommits = to.commits.filter(c => !fromHashes.has(c.hash))
  const removedCommits = from.commits.filter(c => !toHashes.has(c.hash))

  // 提取贡献者
  const fromContributors = new Set((from.contributors || []).map(c => c.email))
  const toContributors = new Set((to.contributors || []).map(c => c.email))

  const addedContributors = (to.contributors || []).filter(c => !fromContributors.has(c.email))
  const removedContributors = (from.contributors || []).filter(c => !toContributors.has(c.email))

  // 计算类型变化
  const changedTypes: Record<string, { added: number; removed: number }> = {}
  const allTypes = new Set([
    ...Object.keys(from.stats?.commitsByType || {}),
    ...Object.keys(to.stats?.commitsByType || {}),
  ])

  for (const type of allTypes) {
    const fromCount = from.stats?.commitsByType[type] || 0
    const toCount = to.stats?.commitsByType[type] || 0

    if (fromCount !== toCount) {
      changedTypes[type] = {
        added: Math.max(0, toCount - fromCount),
        removed: Math.max(0, fromCount - toCount),
      }
    }
  }

  return {
    summary: {
      from: from.version,
      to: to.version,
      addedCommits: addedCommits.length,
      removedCommits: removedCommits.length,
      addedContributors: addedContributors.length,
      changedTypes,
    },
    commits: {
      added: addedCommits,
      removed: removedCommits,
    },
    contributors: {
      added: addedContributors,
      removed: removedContributors,
    },
  }
}

/**
 * 以文本格式显示差异
 */
function displayDiffText(diff: DiffResult, detailed: boolean, from: string, to: string): void {
  console.log()
  console.log(chalk.bold(`📊 版本对比: ${chalk.cyan(from)} → ${chalk.green(to)}`))
  console.log()

  // 摘要
  console.log(chalk.bold('概览:'))
  console.log(`  ${chalk.green(`+ ${diff.summary.addedCommits} 个新提交`)}`)
  
  if (diff.summary.removedCommits > 0) {
    console.log(`  ${chalk.red(`- ${diff.summary.removedCommits} 个移除的提交`)}`)
  }
  
  console.log(`  ${chalk.cyan(`+ ${diff.summary.addedContributors} 位新贡献者`)}`)
  console.log()

  // 类型变化
  if (Object.keys(diff.summary.changedTypes).length > 0) {
    console.log(chalk.bold('提交类型变化:'))
    for (const [type, change] of Object.entries(diff.summary.changedTypes)) {
      if (change.added > 0) {
        console.log(`  ${type}: ${chalk.green(`+${change.added}`)}`)
      }
      if (change.removed > 0) {
        console.log(`  ${type}: ${chalk.red(`-${change.removed}`)}`)
      }
    }
    console.log()
  }

  // 详细信息
  if (detailed) {
    if (diff.commits.added.length > 0) {
      console.log(chalk.bold.green(`\n✨ 新增提交 (${diff.commits.added.length}):`))
      for (const commit of diff.commits.added.slice(0, 10)) {
        console.log(`  ${chalk.gray(commit.shortHash)} ${commit.type}: ${commit.subject}`)
      }
      if (diff.commits.added.length > 10) {
        console.log(chalk.gray(`  ... 还有 ${diff.commits.added.length - 10} 个提交`))
      }
    }

    if (diff.commits.removed.length > 0) {
      console.log(chalk.bold.red(`\n🗑️  移除的提交 (${diff.commits.removed.length}):`))
      for (const commit of diff.commits.removed.slice(0, 10)) {
        console.log(`  ${chalk.gray(commit.shortHash)} ${commit.type}: ${commit.subject}`)
      }
      if (diff.commits.removed.length > 10) {
        console.log(chalk.gray(`  ... 还有 ${diff.commits.removed.length - 10} 个提交`))
      }
    }

    if (diff.contributors.added.length > 0) {
      console.log(chalk.bold.green(`\n👥 新贡献者 (${diff.contributors.added.length}):`))
      for (const contributor of diff.contributors.added) {
        console.log(`  ${contributor.name} (${contributor.commitCount} 次提交)`)
      }
    }
  }

  console.log()
}

/**
 * 以表格格式显示差异
 */
function displayDiffTable(diff: DiffResult): void {
  console.log()

  const table = new Table({
    head: [chalk.cyan('指标'), chalk.cyan('变化')],
    style: { head: [], border: [] },
  })

  table.push(
    ['新增提交', chalk.green(`+${diff.summary.addedCommits}`)],
    ['移除提交', diff.summary.removedCommits > 0 ? chalk.red(`-${diff.summary.removedCommits}`) : '0'],
    ['新贡献者', chalk.cyan(`+${diff.summary.addedContributors}`)]
  )

  // 添加类型变化
  for (const [type, change] of Object.entries(diff.summary.changedTypes)) {
    if (change.added > 0 || change.removed > 0) {
      const value = change.added > 0 
        ? chalk.green(`+${change.added}`)
        : chalk.red(`-${change.removed}`)
      table.push([`${type} 类型`, value])
    }
  }

  console.log(table.toString())
  console.log()
}
