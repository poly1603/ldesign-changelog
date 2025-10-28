/**
 * Validate 命令
 */

import { Command } from 'commander'
import { join } from 'path'
import chalk from 'chalk'
import Table from 'cli-table3'
import { createChangelogValidator } from '../../core/ChangelogValidator.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'

/**
 * 创建 validate 命令
 */
export function createValidateCommand(): Command {
  const command = new Command('validate')

  command
    .description('验证 Changelog 文件格式')
    .argument('[file]', 'Changelog 文件路径', 'CHANGELOG.md')
    .option('--config <file>', '配置文件路径')
    .option('--strict', '严格模式（将警告视为错误）', false)
    .option('--json', '以 JSON 格式输出结果', false)
    .action(async (file: string, options) => {
      try {
        const spinner = logger.startSpinner('正在验证 Changelog...')

        // 加载配置
        const config = await loadConfig(options.config)

        // 获取文件路径
        const filePath = join(config.cwd || process.cwd(), file)

        // 创建验证器
        const validator = createChangelogValidator()

        // 验证文件
        const result = await validator.validateFile(filePath)

        logger.stopSpinner(result.valid)

        if (options.json) {
          // JSON 输出
          console.log(JSON.stringify(result, null, 2))
        } else {
          // 友好输出
          displayValidationResult(result, options.strict)
        }

        // 设置退出码
        if (!result.valid || (options.strict && result.warnings.length > 0)) {
          process.exit(1)
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('验证失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 显示验证结果
 */
function displayValidationResult(result: any, strict: boolean): void {
  console.log()

  // 显示统计信息
  if (result.stats) {
    const table = new Table({
      head: [chalk.cyan('统计项'), chalk.cyan('数量')],
      style: { head: [], border: [] },
    })

    table.push(
      ['总版本数', result.stats.totalVersions],
      ['总提交数', result.stats.totalCommits],
      ['缺少日期', result.stats.missingDates],
      ['无效版本', result.stats.invalidVersions]
    )

    console.log(table.toString())
    console.log()
  }

  // 显示错误
  if (result.errors.length > 0) {
    console.log(chalk.red.bold(`\n❌ 发现 ${result.errors.length} 个错误:\n`))

    for (const error of result.errors) {
      const location = error.line ? chalk.gray(` (第 ${error.line} 行)`) : ''
      console.log(`  ${chalk.red('•')} ${error.message}${location}`)
    }
    console.log()
  }

  // 显示警告
  if (result.warnings.length > 0) {
    const warningLabel = strict ? chalk.red.bold('❌') : chalk.yellow.bold('⚠️')
    console.log(`${warningLabel} 发现 ${result.warnings.length} 个警告:\n`)

    for (const warning of result.warnings) {
      const location = warning.line ? chalk.gray(` (第 ${warning.line} 行)`) : ''
      const icon = strict ? chalk.red('•') : chalk.yellow('•')
      console.log(`  ${icon} ${warning.message}${location}`)
    }
    console.log()
  }

  // 显示结果
  if (result.valid && result.warnings.length === 0) {
    console.log(chalk.green.bold('✓ Changelog 验证通过！\n'))
  } else if (result.valid) {
    console.log(chalk.yellow.bold(`⚠️ Changelog 验证通过，但有 ${result.warnings.length} 个警告\n`))
  } else {
    console.log(chalk.red.bold('✗ Changelog 验证失败\n'))
  }
}
