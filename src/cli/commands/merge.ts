/**
 * Merge 命令
 * 
 * 合并多个 changelog 文件
 */

import { Command } from 'commander'
import { createChangelogMerger, type MergeSource, type MergeOptions } from '../../core/ChangelogMerger.js'
import { createMarkdownFormatter } from '../../formatters/MarkdownFormatter.js'
import { createJsonFormatter } from '../../formatters/JsonFormatter.js'
import { logger } from '../../utils/logger.js'
import { writeFile } from 'fs/promises'
import { resolve } from 'path'

/**
 * 创建 merge 命令
 */
export function createMergeCommand(): Command {
  const command = new Command('merge')

  command
    .description('合并多个 changelog 文件')
    .argument('<files...>', 'changelog 文件路径列表')
    .option('--output <file>', '输出文件路径', 'CHANGELOG.merged.md')
    .option('--strategy <strategy>', '合并策略 (by-date|by-version|by-package)', 'by-date')
    .option('--format <format>', '输出格式 (markdown|json)', 'markdown')
    .option('--no-deduplicate', '不去重')
    .option('--deduplicate-key <key>', '去重键 (hash|message|both)', 'hash')
    .option('--preserve-package-prefix', '保留包名前缀')
    .option('--package-names <names>', '包名列表（逗号分隔，与文件顺序对应）')
    .option('--no-write', '不写入文件，仅输出到控制台')
    .action(async (files: string[], options) => {
      try {
        const spinner = logger.startSpinner(`正在合并 ${files.length} 个 changelog 文件...`)

        // 验证文件数量
        if (files.length < 2) {
          logger.stopSpinner(false)
          logger.error('至少需要 2 个文件进行合并')
          process.exit(1)
        }

        // 解析包名列表
        const packageNames = options.packageNames
          ? options.packageNames.split(',').map((n: string) => n.trim())
          : []

        // 创建合并源
        const sources: MergeSource[] = files.map((file, index) => ({
          path: resolve(process.cwd(), file),
          packageName: packageNames[index],
          format: 'auto' as const,
        }))

        // 创建合并选项
        const mergeOptions: MergeOptions = {
          strategy: options.strategy as MergeOptions['strategy'],
          deduplicate: options.deduplicate !== false,
          deduplicateKey: options.deduplicateKey as MergeOptions['deduplicateKey'],
          preservePackagePrefix: options.preservePackagePrefix === true,
          outputFormat: options.format as 'markdown' | 'json',
        }

        // 创建合并器
        const merger = createChangelogMerger()

        // 执行合并
        const merged = await merger.merge(sources, mergeOptions)

        logger.stopSpinner(true)

        // 格式化输出
        let output: string
        if (options.format === 'json') {
          const formatter = createJsonFormatter({
            options: {
              pretty: true,
              indent: 2,
              includeMetadata: true,
            },
          })
          output = formatter.format(merged)
        } else {
          const formatter = createMarkdownFormatter({
            includeAuthors: true,
            includePRLinks: true,
            includeCommitHash: true,
          })
          output = `# Changelog\n\n${formatter.format(merged)}`
        }

        if (options.write === false) {
          // 仅输出到控制台
          console.log('\n' + output)
        } else {
          // 写入文件
          const outputPath = resolve(process.cwd(), options.output)
          await writeFile(outputPath, output, 'utf-8')
          logger.success(`合并后的 changelog 已生成: ${outputPath}`)
        }

        // 显示统计信息
        logger.info(`版本: ${merged.version}`)
        logger.info(`总提交数: ${merged.commits.length}`)
        logger.info(`章节数: ${merged.sections.length}`)
        if (merged.contributors && merged.contributors.length > 0) {
          logger.info(`贡献者: ${merged.contributors.length} 人`)
        }
        if (merged.breakingChanges && merged.breakingChanges.length > 0) {
          logger.info(`破坏性变更: ${merged.breakingChanges.length} 个`)
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('合并 changelog 失败', error)
        process.exit(1)
      }
    })

  return command
}
