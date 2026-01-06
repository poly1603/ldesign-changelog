/**
 * Analyze 命令 - 变更影响分析
 */

import { Command } from 'commander'
import Table from 'cli-table3'
import chalk from 'chalk'
import { createDiffAnalyzer } from '../../core/DiffAnalyzer.js'
import { getLatestTag } from '../../utils/git-utils.js'
import { logger } from '../../utils/logger.js'

/**
 * 创建 analyze 命令
 */
export function createAnalyzeCommand(): Command {
  const command = new Command('analyze')

  command
    .description('分析变更影响和风险')
    .option('--from <ref>', '起始版本/标签/提交')
    .option('--to <ref>', '结束版本/标签/提交', 'HEAD')
    .option('--format <format>', '输出格式 (table|json|markdown)', 'table')
    .option('--detailed', '显示详细信息', false)
    .option('--core-patterns <patterns>', '核心模块路径模式（逗号分隔）')
    .option('--threshold <number>', '大型重构阈值（文件数）', '20')
    .action(async (options) => {
      try {
        const spinner = logger.startSpinner('正在分析变更影响...')

        // 如果没有指定 from，尝试获取最新 tag
        let from = options.from
        if (!from) {
          from = await getLatestTag() || undefined
          if (!from) {
            logger.stopSpinner(false)
            logger.error('未找到起始版本，请使用 --from 指定')
            process.exit(1)
          }
        }

        // 解析配置
        const coreModulePatterns = options.corePatterns
          ? options.corePatterns.split(',').map((p: string) => p.trim())
          : undefined

        const largeRefactorThreshold = parseInt(options.threshold, 10)

        // 创建分析器
        const analyzer = createDiffAnalyzer({
          coreModulePatterns,
          largeRefactorThreshold,
        })

        // 分析变更影响
        const impact = await analyzer.analyze(from, options.to)

        logger.stopSpinner(true, '分析完成')

        // 输出结果
        if (options.format === 'json') {
          console.log(JSON.stringify(impact, null, 2))
        } else if (options.format === 'markdown') {
          console.log(analyzer.generateSummary(impact))
        } else {
          displayImpactTable(impact, options.detailed)
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('变更影响分析失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 显示影响分析表格
 */
function displayImpactTable(impact: any, detailed: boolean): void {
  console.log('\n' + chalk.bold.blue('📊 Change Impact Analysis'))
  console.log(chalk.gray('─'.repeat(60)) + '\n')

  // 风险等级显示
  const riskLevelColor = getRiskLevelColor(impact.riskLevel)
  const riskLevelIcon = getRiskLevelIcon(impact.riskLevel)

  console.log(chalk.bold('⚠️  Risk Assessment'))
  const riskTable = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    colWidths: [30, 30],
  })

  riskTable.push(
    ['Risk Level', riskLevelColor(`${riskLevelIcon} ${impact.riskLevel.toUpperCase()}`)],
    ['Risk Score', getRiskScoreDisplay(impact.riskScore)],
  )

  console.log(riskTable.toString() + '\n')

  // 变更统计
  console.log(chalk.bold('📈 Change Statistics'))
  const statsTable = new Table({
    head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    colWidths: [30, 30],
  })

  const netChange = impact.linesAdded - impact.linesRemoved
  const netChangeDisplay = netChange > 0
    ? chalk.green(`+${netChange}`)
    : netChange < 0
      ? chalk.red(`${netChange}`)
      : chalk.gray('0')

  statsTable.push(
    ['Files Changed', chalk.yellow(impact.filesChanged)],
    ['Lines Added', chalk.green(`+${impact.linesAdded}`)],
    ['Lines Removed', chalk.red(`-${impact.linesRemoved}`)],
    ['Net Change', netChangeDisplay],
  )

  console.log(statsTable.toString() + '\n')

  // 受影响的模块
  if (impact.affectedModules.length > 0) {
    console.log(chalk.bold('📦 Affected Modules'))
    const moduleTable = new Table({
      head: [chalk.cyan('Module'), chalk.cyan('Type')],
      colWidths: [40, 20],
    })

    for (const module of impact.affectedModules) {
      const isCore = module.includes('core') || module.includes('lib')
      const typeDisplay = isCore
        ? chalk.red('⚠️  Core')
        : chalk.gray('Feature')

      moduleTable.push([module, typeDisplay])
    }

    console.log(moduleTable.toString() + '\n')
  }

  // 风险因素
  if (impact.riskFactors.length > 0) {
    console.log(chalk.bold('🔍 Risk Factors'))
    for (const factor of impact.riskFactors) {
      console.log(chalk.yellow('  • ') + factor)
    }
    console.log()
  }

  // 详细信息
  if (detailed) {
    console.log(chalk.bold('💡 Recommendations'))
    const recommendations = generateRecommendations(impact)
    for (const rec of recommendations) {
      console.log(chalk.cyan('  • ') + rec)
    }
    console.log()
  }
}

/**
 * 获取风险等级颜色
 */
function getRiskLevelColor(level: string): (text: string) => string {
  switch (level) {
    case 'high':
      return chalk.red.bold
    case 'medium':
      return chalk.yellow.bold
    case 'low':
      return chalk.green.bold
    default:
      return chalk.gray
  }
}

/**
 * 获取风险等级图标
 */
function getRiskLevelIcon(level: string): string {
  switch (level) {
    case 'high':
      return '🔴'
    case 'medium':
      return '🟡'
    case 'low':
      return '🟢'
    default:
      return '⚪'
  }
}

/**
 * 获取风险评分显示
 */
function getRiskScoreDisplay(score: number): string {
  const barLength = 20
  const filledLength = Math.round((score / 100) * barLength)
  const emptyLength = barLength - filledLength

  const color = score >= 70 ? chalk.red : score >= 40 ? chalk.yellow : chalk.green

  const bar = color('█'.repeat(filledLength)) + chalk.gray('░'.repeat(emptyLength))

  return `${bar} ${color(score)}/100`
}

/**
 * 生成建议
 */
function generateRecommendations(impact: any): string[] {
  const recommendations: string[] = []

  if (impact.riskLevel === 'high') {
    recommendations.push('Consider thorough code review and testing before release')
    recommendations.push('Plan for gradual rollout or feature flags')
  }

  if (impact.riskLevel === 'medium') {
    recommendations.push('Ensure adequate test coverage for changed areas')
    recommendations.push('Review breaking changes with stakeholders')
  }

  if (impact.affectedModules.some((m: string) => m.includes('core') || m.includes('lib'))) {
    recommendations.push('Core modules affected - verify backward compatibility')
    recommendations.push('Update integration tests for core functionality')
  }

  if (impact.filesChanged > 50) {
    recommendations.push('Large refactor detected - consider splitting into smaller releases')
  }

  if (impact.riskFactors.some((f: string) => f.includes('Breaking changes'))) {
    recommendations.push('Document migration path for breaking changes')
    recommendations.push('Provide clear upgrade instructions')
  }

  if (impact.riskFactors.some((f: string) => f.includes('Security'))) {
    recommendations.push('Prioritize security testing and validation')
    recommendations.push('Consider security advisory if needed')
  }

  if (recommendations.length === 0) {
    recommendations.push('Changes look safe - proceed with standard review process')
  }

  return recommendations
}
