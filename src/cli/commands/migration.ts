/**
 * Migration 命令
 * 
 * 生成版本迁移指南
 */

import { Command } from 'commander'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { createMigrationGenerator } from '../../core/MigrationGenerator.js'
import { createAIEnhancer } from '../../core/AIEnhancer.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'
import { writeFile } from 'fs/promises'
import { resolve } from 'path'

/**
 * 创建 migration 命令
 */
export function createMigrationCommand(): Command {
  const command = new Command('migration')

  command
    .description('生成版本迁移指南')
    .option('--version <version>', '指定版本号')
    .option('--from <tag>', '起始标签')
    .option('--to <tag>', '结束标签', 'HEAD')
    .option('--output <file>', '输出文件路径', 'MIGRATION.md')
    .option('--format <format>', '输出格式 (markdown|json)', 'markdown')
    .option('--config <file>', '配置文件路径')
    .option('--use-ai', '使用 AI 增强迁移指南')
    .option('--no-code-examples', '不包含代码示例')
    .option('--no-write', '不写入文件，仅输出到控制台')
    .action(async (options) => {
      try {
        const spinner = logger.startSpinner('正在生成迁移指南...')

        // 加载配置
        const config = await loadConfig(options.config)

        // 创建 changelog 生成器
        const changelogGenerator = createChangelogGenerator(config)

        // 生成 changelog 内容
        const version = options.version || 'Unreleased'
        const content = await changelogGenerator.generate(version, options.from, options.to)

        // 检查是否有破坏性变更
        if (!content.breakingChanges || content.breakingChanges.length === 0) {
          logger.stopSpinner(true)
          logger.info('没有检测到破坏性变更，无需生成迁移指南')
          return
        }

        // 创建 AI 增强器（如果需要）
        let aiEnhancer
        if (options.useAi) {
          // 从环境变量或配置中获取 AI 配置
          const aiConfig = {
            provider: (process.env.AI_PROVIDER || 'openai') as 'openai' | 'anthropic' | 'local',
            apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
            model: process.env.AI_MODEL,
            baseUrl: process.env.AI_BASE_URL,
          }

          if (aiConfig.apiKey) {
            aiEnhancer = createAIEnhancer(aiConfig)
            logger.debug('已启用 AI 增强')
          } else {
            logger.warn('未配置 AI API Key，将使用基础版本')
          }
        }

        // 创建迁移生成器
        const migrationGenerator = createMigrationGenerator({
          useAI: options.useAi && !!aiEnhancer,
          format: options.format,
          includeCodeExamples: options.codeExamples !== false,
          aiEnhancer,
        })

        // 生成迁移指南
        const entries = await migrationGenerator.generate(content)

        logger.stopSpinner(true)

        if (entries.length === 0) {
          logger.info('没有生成迁移指南')
          return
        }

        // 渲染迁移指南
        const rendered = migrationGenerator.render(entries)

        if (options.write === false) {
          // 仅输出到控制台
          console.log('\n' + rendered)
        } else {
          // 写入文件
          const outputPath = resolve(process.cwd(), options.output)
          await writeFile(outputPath, rendered, 'utf-8')
          logger.success(`迁移指南已生成: ${outputPath}`)
        }

        // 显示统计信息
        const entry = entries[0]
        logger.info(`版本: ${entry.version}`)
        logger.info(`破坏性变更: ${entry.breakingChanges.length} 个`)
        logger.info(`迁移步骤: ${entry.migrationSteps.length} 个`)
        if (entry.codeExamples.length > 0) {
          logger.info(`代码示例: ${entry.codeExamples.length} 个`)
        }
        if (entry.affectedApis.length > 0) {
          logger.info(`受影响的 API: ${entry.affectedApis.join(', ')}`)
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('生成迁移指南失败', error)
        process.exit(1)
      }
    })

  return command
}
