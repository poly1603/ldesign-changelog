/**
 * Lint 命令 - 检查提交消息规范
 */

import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { createCommitLinter } from '../../core/CommitLinter.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'

/**
 * 创建 lint 命令
 */
export function createLintCommand(): Command {
  const command = new Command('lint')

  command
    .description('检查提交消息是否符合 Conventional Commits 规范')
    .option('--from <tag>', '起始标签')
    .option('--to <tag>', '结束标签', 'HEAD')
    .option('--config <file>', '配置文件路径')
    .option('--strict', '严格模式（警告也会导致失败）', false)
    .option('--json', '以 JSON 格式输出结果', false)
    .option('--max-subject-length <length>', '主题最大长度', '72')
    .option('--require-scope', '要求提供 scope', false)
    .action(async (options) => {
      try {
        const spinner = logger.startSpinner('正在检查提交消息...')

        // 加载配置
        const config = await loadConfig(options.config)

        // 创建 linter
        const linter = createCommitLinter({
          types: config.types?.map(t => t.type),
          maxSubjectLength: Number.parseInt(options.maxSubjectLength, 10),
          requireScope: options.requireScope,
        })

        // 执行 lint
        const result = await linter.lintRange(options.from, options.to, config.cwd)

        logger.stopSpinner(result.passed)

        if (options.json) {
          // JSON 输出
          console.log(JSON.stringify(result, null, 2))
        } else {
          // 友好输出
          displayLintResult(result, options.strict)
        }

        // 设置退出码
        const hasErrors = result.issues.some(i => i.severity === 'error')
        const hasWarnings = result.issues.some(i => i.severity === 'warning')

        if (hasErrors || (options.strict && hasWarnings)) {
          process.exit(1)
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('检查失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 显示 lint 结果
 */
function displayLintResult(result: any, strict: boolean): void {
  console.log()

  // 显示统计信息
  const statsTable = new Table({
    head: [chalk.cyan('统计项'), chalk.cyan('数量')],
    style: { head: [], border: [] },
  })

  statsTable.push(
    ['总提交数', result.totalCommits],
    ['有效提交', chalk.green(result.validCommits.toString())],
    ['无效提交', result.invalidCommits > 0 ? chalk.red(result.invalidCommits.toString()) : '0']
  )

  console.log(statsTable.toString())
  console.log()

  // 显示类型统计
  if (Object.keys(result.stats.byType).length > 0) {
    const typeTable = new Table({
      head: [chalk.cyan('提交类型'), chalk.cyan('数量')],
      style: { head: [], border: [] },
    })

    for (const [type, count] of Object.entries(result.stats.byType)) {
      typeTable.push([type, count as number])
    }

    console.log(chalk.bold('提交类型分布:'))
    console.log(typeTable.toString())
    console.log()
  }

  // 显示详细统计
  const detailTable = new Table({
    head: [chalk.cyan('详细信息'), chalk.cyan('数量')],
    style: { head: [], border: [] },
  })

  detailTable.push(
    ['包含 scope', result.stats.withScope],
    ['包含 body', result.stats.withBody],
    ['Breaking Changes', result.stats.withBreakingChange]
  )

  console.log(detailTable.toString())
  console.log()

  // 显示问题列表
  if (result.issues.length > 0) {
    const errors = result.issues.filter((i: any) => i.severity === 'error')
    const warnings = result.issues.filter((i: any) => i.severity === 'warning')

    if (errors.length > 0) {
      console.log(chalk.red.bold(`\n❌ 发现 ${errors.length} 个错误:\n`))
      displayIssues(errors, 'error')
    }

    if (warnings.length > 0) {
      const warningLabel = strict ? chalk.red.bold('❌') : chalk.yellow.bold('⚠️')
      console.log(`${warningLabel} 发现 ${warnings.length} 个警告:\n`)
      displayIssues(warnings, strict ? 'error' : 'warning')
    }
  }

  // 显示结果
  console.log()
  if (result.passed) {
    console.log(chalk.green.bold('✓ 所有提交消息符合规范！\n'))
  } else {
    const errorCount = result.issues.filter((i: any) => i.severity === 'error').length
    const warningCount = result.issues.filter((i: any) => i.severity === 'warning').length
    console.log(chalk.red.bold(`✗ 发现 ${errorCount} 个错误, ${warningCount} 个警告\n`))
  }
}

/**
 * 显示问题列表
 */
function displayIssues(issues: any[], displayType: 'error' | 'warning'): void {
  for (const issue of issues) {
    const color = displayType === 'error' ? chalk.red : chalk.yellow
    const icon = color('•')

    console.log(`  ${icon} ${chalk.gray(issue.hash)} ${issue.message}`)
    console.log(`    ${chalk.gray('Subject:')} ${issue.subject}`)

    if (issue.suggestion) {
      console.log(`    ${chalk.cyan('建议:')} ${issue.suggestion}`)
    }
    console.log()
  }
}
