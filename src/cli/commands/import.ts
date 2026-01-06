/**
 * Import 命令
 * 
 * 导入现有的 changelog 文件
 */

import { Command } from 'commander'
import { createChangelogImporter, type ImportSource, type ImportOptions } from '../../core/ChangelogImporter.js'
import { createMarkdownFormatter } from '../../formatters/MarkdownFormatter.js'
import { createJsonFormatter } from '../../formatters/JsonFormatter.js'
import { logger } from '../../utils/logger.js'
import { writeFile } from 'fs/promises'
import { resolve } from 'path'

/**
 * 创建 import 命令
 */
export function createImportCommand(): Command {
  const command = new Command('import')

  command
    .description('导入现有的 changelog 文件')
    .argument('<file>', 'changelog 文件路径')
    .option('--format <format>', '指定格式 (keep-a-changelog|conventional-changelog|plain-markdown|auto)', 'auto')
    .option('--output <file>', '输出文件路径', 'CHANGELOG.imported.md')
    .option('--output-format <format>', '输出格式 (markdown|json)', 'markdown')
    .option('--preserve-dates', '保留原始日期', true)
    .option('--preserve-versions', '保留原始版本号', true)
    .option('--date-format <format>', '日期格式', 'YYYY-MM-DD')
    .option('--version-prefix <prefix>', '版本号前缀', '')
    .option('--no-write', '不写入文件，仅输出到控制台')
    .action(async (file: string, options) => {
      try {
        const spinner = logger.startSpinner(`正在导入 changelog: ${file}`)

        // 创建导入源
        const source: ImportSource = {
          path: resolve(process.cwd(), file),
          format: options.format as ImportSource['format'],
        }

        // 创建导入选项
        const importOptions: ImportOptions = {
          preserveDates: options.preserveDates !== false,
          preserveVersions: options.preserveVersions !== false,
          dateFormat: options.dateFormat,
          versionPrefix: options.versionPrefix,
        }

        // 创建导入器
        const importer = createChangelogImporter()

        // 执行导入
        const result = await importer.import(source, importOptions)

        logger.stopSpinner(result.success)

        if (!result.success) {
          logger.error('导入失败')

          // 显示错误
          if (result.errors.length > 0) {
            logger.error('错误:')
            for (const error of result.errors) {
              logger.error(`  - ${error.message}`)
            }
          }

          // 显示警告
          if (result.warnings.length > 0) {
            logger.warn('警告:')
            for (const warning of result.warnings) {
              logger.warn(`  - ${warning}`)
            }
          }

          process.exit(1)
        }

        // 验证导入结果
        const validation = importer.validate(result)
        if (!validation.valid) {
          logger.warn('导入结果验证失败')
          for (const error of validation.errors) {
            logger.error(`  - ${error}`)
          }
        }

        // 显示警告
        if (validation.warnings.length > 0) {
          logger.warn('警告:')
          for (const warning of validation.warnings) {
            logger.warn(`  - ${warning}`)
          }
        }

        // 格式化输出
        let output = ''

        if (options.outputFormat === 'json') {
          const formatter = createJsonFormatter({
            options: {
              pretty: true,
              indent: 2,
              includeMetadata: true,
            },
          })

          // 导出所有版本
          const allVersions = result.entries.map(entry => formatter.format(entry)).join('\n')
          output = `[\n${allVersions}\n]`
        } else {
          const formatter = createMarkdownFormatter({
            includeAuthors: true,
            includePRLinks: true,
            includeCommitHash: true,
          })

          output = '# Changelog\n\n'

          // 导出所有版本
          for (const entry of result.entries) {
            output += formatter.format(entry) + '\n\n'
          }
        }

        if (options.write === false) {
          // 仅输出到控制台
          console.log('\n' + output)
        } else {
          // 写入文件
          const outputPath = resolve(process.cwd(), options.output)
          await writeFile(outputPath, output, 'utf-8')
          logger.success(`导入的 changelog 已生成: ${outputPath}`)
        }

        // 显示统计信息
        logger.info(`成功导入 ${result.entries.length} 个版本`)

        const totalCommits = result.entries.reduce((sum, entry) => sum + entry.commits.length, 0)
        logger.info(`总提交数: ${totalCommits}`)

        const totalSections = result.entries.reduce((sum, entry) => sum + entry.sections.length, 0)
        logger.info(`总章节数: ${totalSections}`)

        // 列出版本
        if (result.entries.length > 0) {
          logger.info('导入的版本:')
          for (const entry of result.entries) {
            logger.info(`  - ${entry.version} (${entry.date})`)
          }
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('导入 changelog 失败', error)
        process.exit(1)
      }
    })

  return command
}
