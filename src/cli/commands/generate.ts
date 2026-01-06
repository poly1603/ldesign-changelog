/**
 * Generate 命令
 */

import { Command } from 'commander'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { createMultiLangTranslator } from '../../core/MultiLangTranslator.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'
import { multiSelect, confirm, editText } from '../../utils/interactive.js'
import type { ChangelogCommit } from '../../types/changelog.js'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * 创建 generate 命令
 */
export function createGenerateCommand(): Command {
  const command = new Command('generate')

  command
    .description('生成 Changelog')
    .option('--version <version>', '指定版本号')
    .option('--from <tag>', '起始标签')
    .option('--to <tag>', '结束标签', 'HEAD')
    .option('--output <file>', '输出文件')
    .option('--format <format>', '输出格式 (markdown|json|html)')
    .option('--template <file>', '自定义模板路径')
    .option('--config <file>', '配置文件路径')
    .option('--no-write', '不写入文件，仅输出到控制台')
    .option('--interactive', '交互式选择提交')
    .option('--edit', '编辑生成的 Changelog')
    .option('--track-deps', '追踪依赖变更')
    .option('--languages <langs>', '生成多语言版本，用逗号分隔 (例如: zh-CN,en-US,ja-JP)')
    .option('--glossary <file>', '术语表文件路径 (JSON 格式)')
    .option('--translate-commits', '翻译提交消息 (需要 AI 配置)')
    .option('--translate-sections', '翻译章节标题')
    .action(async (options) => {
      try {
        const spinner = logger.startSpinner('正在生成 Changelog...')

        // 加载配置
        const config = await loadConfig(options.config)

        // 合并命令行选项
        if (options.output) config.output = options.output
        if (options.format) config.format = options.format
        if (options.template) config.template = options.template

        // 创建生成器
        const generator = createChangelogGenerator(config)

        // 启用依赖追踪（如果指定）
        if (options.trackDeps) {
          generator.enableDependencyTracking(true)
          logger.debug('已启用依赖追踪')
        }

        // 生成 Changelog
        const version = options.version || 'Unreleased'
        let content = await generator.generate(version, options.from, options.to)

        logger.stopSpinner(true)

        // 交互式选择提交
        if (options.interactive) {
          content = await interactiveSelectCommits(content)
        }

        // 格式化内容
        let formatted = generator.format(content)

        // 编辑模式
        if (options.edit) {
          formatted = await editText(
            formatted,
            '您可以编辑生成的 Changelog，输入 "END" 结束编辑'
          )
        }

        if (options.write === false) {
          // 仅输出到控制台
          console.log('\n' + formatted)
        } else {
          // 写入文件
          await generator.write(content)
          logger.success(`Changelog 已生成: ${config.output}`)
        }

        // 多语言生成
        if (options.languages) {
          await generateMultiLanguageChangelogs(
            content,
            options,
            config
          )
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('生成 Changelog 失败', error)
        process.exit(1)
      }
    })

  return command
}

/**
 * 生成多语言 Changelog
 */
async function generateMultiLanguageChangelogs(
  content: any,
  options: any,
  config: any
): Promise<void> {
  try {
    // 解析语言列表
    const languages = options.languages.split(',').map((lang: string) => lang.trim())

    logger.info(`正在生成 ${languages.length} 种语言版本...`)

    // 加载术语表（如果提供）
    let glossary: Record<string, Record<string, string>> | undefined
    if (options.glossary) {
      try {
        const glossaryContent = await fs.readFile(options.glossary, 'utf-8')
        glossary = JSON.parse(glossaryContent)
        logger.debug(`已加载术语表: ${options.glossary}`)
      } catch (error) {
        logger.warn(`无法加载术语表: ${options.glossary}`)
      }
    }

    // 创建翻译器
    const translator = createMultiLangTranslator({
      targetLanguages: languages,
      provider: 'ai',
      glossary,
      outputPattern: options.output
        ? options.output.replace(/\.md$/, '.{lang}.md')
        : 'CHANGELOG.{lang}.md',
      translateCommits: options.translateCommits || false,
      translateSections: options.translateSections !== false, // 默认翻译章节
      aiConfig: config.ai, // 从配置中获取 AI 配置
    })

    // 执行翻译
    const outputDir = options.output
      ? path.dirname(options.output)
      : process.cwd()

    const results = await translator.translate(content, outputDir)

    // 写入翻译后的文件
    for (const result of results) {
      if (result.error) {
        logger.warn(`${result.language} 翻译失败: ${result.error}`)
        continue
      }

      // 格式化翻译后的内容
      const generator = createChangelogGenerator(config)
      const formatted = generator.format(result.content)

      // 写入文件
      await fs.writeFile(result.outputPath, formatted, 'utf-8')

      logger.success(
        `${result.language} 版本已生成: ${result.outputPath} (耗时 ${result.duration}ms)`
      )
    }

    logger.success(`所有语言版本生成完成`)
  } catch (error: any) {
    logger.error('多语言生成失败', error)
    throw error
  }
}

/**
 * 交互式选择提交
 */
async function interactiveSelectCommits(content: any): Promise<any> {
  console.log('\n')

  // 按类型选择
  const typeChoices = content.sections.map((section: any) => ({
    value: section.type,
    label: `${section.title} (${section.commits.length} 个提交)`,
  }))

  const selectedTypes = await multiSelect<string>(
    '选择要包含的提交类型:',
    typeChoices
  )

  if (selectedTypes.length === 0) {
    return content
  }

  // 过滤章节
  const filteredSections = content.sections.filter((section: any) =>
    selectedTypes.includes(section.type)
  )

  // 选择具体提交
  const shouldSelectCommits = await confirm('是否需要选择具体的提交?', false)

  if (shouldSelectCommits) {
    for (const section of filteredSections) {
      const commitChoices = section.commits.map((commit: ChangelogCommit) => ({
        value: commit.hash,
        label: `${commit.shortHash} - ${commit.subject}`,
        description: commit.author?.name,
      }))

      const selectedHashes = await multiSelect<string>(
        `选择 ${section.title} 中的提交:`,
        commitChoices
      )

      if (selectedHashes.length > 0) {
        section.commits = section.commits.filter((c: ChangelogCommit) =>
          selectedHashes.includes(c.hash)
        )
      }
    }
  }

  // 重新构建 commits 数组
  const allCommits = filteredSections.flatMap((s: any) => s.commits)

  return {
    ...content,
    sections: filteredSections,
    commits: allCommits,
  }
}

