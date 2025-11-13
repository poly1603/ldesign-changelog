/**
 * Generate 命令
 */

import { Command } from 'commander'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'
import { multiSelect, confirm, editText } from '../../utils/interactive.js'
import type { ChangelogCommit } from '../../types/changelog.js'

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
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('生成 Changelog 失败', error)
        process.exit(1)
      }
    })

  return command
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

