/**
 * Init 命令
 */

import { Command } from 'commander'
import { join } from 'path'
import { writeFileContent, fileExists } from '../../utils/file.js'
import { logger } from '../../utils/logger.js'

/**
 * 默认配置模板
 */
const CONFIG_TEMPLATE = `/**
 * @ldesign/changelog 配置文件
 * @see https://github.com/ldesign/tools/changelog
 */

module.exports = {
  // 输出文件路径
  output: 'CHANGELOG.md',

  // 输出格式 (markdown | json | html)
  format: 'markdown',

  // 提交类型配置
  types: [
    { type: 'feat', section: '✨ 新功能', priority: 1 },
    { type: 'fix', section: '🐛 Bug 修复', priority: 2 },
    { type: 'perf', section: '⚡ 性能优化', priority: 3 },
    { type: 'refactor', section: '♻️ 代码重构', priority: 4 },
    { type: 'docs', section: '📝 文档更新', priority: 5 },
    { type: 'style', section: '💄 代码样式', priority: 6 },
    { type: 'test', section: '✅ 测试', priority: 7 },
    { type: 'build', section: '📦 构建系统', priority: 8 },
    { type: 'ci', section: '👷 CI/CD', priority: 9 },
    { type: 'chore', section: '🔧 其他', priority: 10, hidden: true },
  ],

  // 是否按类型分组
  groupByType: true,

  // 是否包含作者
  includeAuthors: true,

  // 是否包含 PR 链接
  includePRLinks: true,

  // 是否包含 commit hash
  includeCommitHash: true,

  // 是否包含所有提交（包括不符合 Conventional Commits 规范的）
  includeAllCommits: false,

  // 日期格式
  dateFormat: 'YYYY-MM-DD',

  // 语言 (zh-CN | en-US | ja-JP)
  language: 'zh-CN',

  // 标题格式
  headerFormat: '## [{version}] - {date}',

  // 版本号格式
  versionFormat: 'v{version}',

  // 格式选项
  formatOptions: {
    // Markdown 选项
    markdown: {
      generateToc: false,
      headingLevel: 2,
      useEmoji: true,
    },

    // JSON 选项
    json: {
      pretty: true,
      indent: 2,
      includeMetadata: true,
    },

    // HTML 选项
    html: {
      title: 'Changelog',
      includeStyles: true,
      includeSearch: true,
      theme: 'light',
    },
  },
}
`

/**
 * 创建 init 命令
 */
export function createInitCommand(): Command {
  const command = new Command('init')

  command
    .description('生成配置文件')
    .option('--force', '强制覆盖已存在的配置文件')
    .action(async (options) => {
      try {
        const cwd = process.cwd()
        const configPath = join(cwd, 'changelog.config.js')

        // 检查文件是否已存在
        if (fileExists(configPath) && !options.force) {
          logger.warn('配置文件已存在: changelog.config.js')
          logger.info('使用 --force 参数强制覆盖')
          process.exit(1)
        }

        // 写入配置文件
        await writeFileContent(configPath, CONFIG_TEMPLATE)

        logger.success('配置文件已生成: changelog.config.js')
        logger.info('\n后续步骤:')
        logger.info('1. 编辑配置文件以自定义设置')
        logger.info('2. 运行 ldesign-changelog generate 生成 Changelog')
      } catch (error: any) {
        logger.error('生成配置文件失败', error)
        process.exit(1)
      }
    })

  return command
}

