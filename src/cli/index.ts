#!/usr/bin/env node

/**
 * CLI 入口
 */

import { Command } from 'commander'
import boxen from 'boxen'
import chalk from 'chalk'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createGenerateCommand } from './commands/generate.js'
import { createReleaseCommand } from './commands/release.js'
import { createStatsCommand } from './commands/stats.js'
import { createInitCommand } from './commands/init.js'
import { createValidateCommand } from './commands/validate.js'
import { createLintCommand } from './commands/lint.js'
import { createPreviewCommand } from './commands/preview.js'
import { createDiffCommand } from './commands/diff.js'
import { logger } from '../utils/logger.js'

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 获取版本号
 */
async function getVersion(): Promise<string> {
  try {
    const packageJsonPath = join(__dirname, '../../package.json')
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
    return packageJson.version
  } catch {
    return '1.0.0'
  }
}

/**
 * 显示欢迎信息
 */
function showWelcome(): void {
  const message = chalk.bold.blue('📝 @ldesign/changelog\n') +
    chalk.gray('自动化的版本管理工具')

  console.log('\n' + boxen(message, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'blue',
  }) + '\n')
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const version = await getVersion()

  const program = new Command()

  program
    .name('ldesign-changelog')
    .description('📝 自动化的版本管理工具，让变更日志维护变得轻松')
    .version(version, '-v, --version', '显示版本号')
    .option('-d, --debug', '启用调试模式')
    .option('--silent', '静默模式')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts()

      if (opts.debug) {
        logger.setConfig({ debug: true })
      }

      if (opts.silent) {
        logger.setConfig({ silent: true })
      }

      if (!opts.silent && process.argv.length === 2) {
        showWelcome()
      }
    })

  // 注册命令
  program.addCommand(createGenerateCommand())
  program.addCommand(createReleaseCommand())
  program.addCommand(createStatsCommand())
  program.addCommand(createInitCommand())
  program.addCommand(createValidateCommand())
  program.addCommand(createLintCommand())
  program.addCommand(createPreviewCommand())
  program.addCommand(createDiffCommand())

  // 解析命令行参数
  await program.parseAsync(process.argv)
}

// 运行主函数
main().catch((error) => {
  logger.error('发生错误', error)
  process.exit(1)
})

