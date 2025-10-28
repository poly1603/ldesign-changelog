/**
 * 内置插件
 */

import { createPlugin } from '../core/PluginManager.js'
import type { ChangelogCommit } from '../types/changelog.js'

/**
 * Emoji 增强插件
 * 为提交消息添加更多 emoji
 */
export const emojiEnhancerPlugin = createPlugin(
  'emoji-enhancer',
  {
    afterParse: (commits) => {
      const emojiMap: Record<string, string> = {
        feat: '✨',
        fix: '🐛',
        docs: '📝',
        style: '💄',
        refactor: '♻️',
        perf: '⚡',
        test: '✅',
        build: '📦',
        ci: '👷',
        chore: '🔧',
        revert: '⏪',
      }

      return commits.map(commit => {
        const emoji = emojiMap[commit.type]
        if (emoji && !commit.subject.startsWith(emoji)) {
          return {
            ...commit,
            subject: `${emoji} ${commit.subject}`,
          }
        }
        return commit
      })
    },
  },
  {
    version: '1.0.0',
    description: '为提交消息添加 emoji',
  }
)

/**
 * 提交去重插件
 * 移除重复的提交
 */
export const deduplicatePlugin = createPlugin(
  'deduplicate',
  {
    afterParse: (commits) => {
      const seen = new Set<string>()
      const unique: ChangelogCommit[] = []

      for (const commit of commits) {
        if (!seen.has(commit.hash)) {
          seen.add(commit.hash)
          unique.push(commit)
        }
      }

      return unique
    },
  },
  {
    version: '1.0.0',
    description: '移除重复的提交',
  }
)

/**
 * 提交排序插件
 * 按日期降序排序提交
 */
export const sortByDatePlugin = createPlugin(
  'sort-by-date',
  {
    afterParse: (commits) => {
      return [...commits].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      })
    },
  },
  {
    version: '1.0.0',
    description: '按日期降序排序提交',
  }
)

/**
 * Breaking Changes 高亮插件
 * 为 Breaking Changes 添加醒目标记
 */
export const breakingChangesHighlightPlugin = createPlugin(
  'breaking-changes-highlight',
  {
    afterParse: (commits) => {
      return commits.map(commit => {
        if (commit.breaking) {
          return {
            ...commit,
            subject: `⚠️ BREAKING: ${commit.subject}`,
          }
        }
        return commit
      })
    },
  },
  {
    version: '1.0.0',
    description: '为 Breaking Changes 添加醒目标记',
  }
)

/**
 * 链接增强插件
 * 自动为常见关键词添加链接
 */
export const linkEnhancerPlugin = createPlugin(
  'link-enhancer',
  {
    afterFormat: (formatted, content) => {
      // 为常见关键词添加链接
      let enhanced = formatted

      // Issue 链接
      enhanced = enhanced.replace(
        /#(\d+)/g,
        (match, num) => `[#${num}](https://github.com/owner/repo/issues/${num})`
      )

      // PR 链接
      enhanced = enhanced.replace(
        /PR #(\d+)/gi,
        (match, num) => `[PR #${num}](https://github.com/owner/repo/pull/${num})`
      )

      return enhanced
    },
  },
  {
    version: '1.0.0',
    description: '自动为常见关键词添加链接',
  }
)

/**
 * 统计增强插件
 * 在 Changelog 末尾添加详细统计信息
 */
export const statsEnhancerPlugin = createPlugin(
  'stats-enhancer',
  {
    afterFormat: (formatted, content) => {
      if (!content.stats) {
        return formatted
      }

      const statsLines = [
        '\n---\n',
        '\n## 📊 本次发布统计\n',
        `\n- 总提交数: **${content.stats.totalCommits}**`,
        `- 贡献者数: **${content.stats.contributorCount}**`,
      ]

      if (content.stats.issueCount) {
        statsLines.push(`- 关联 Issue: **${content.stats.issueCount}**`)
      }

      if (content.stats.prCount) {
        statsLines.push(`- 关联 PR: **${content.stats.prCount}**`)
      }

      if (content.stats.durationDays) {
        statsLines.push(`- 开发周期: **${content.stats.durationDays}** 天`)
      }

      if (content.stats.commitsPerDay) {
        statsLines.push(`- 平均提交频率: **${content.stats.commitsPerDay.toFixed(2)}** 次/天`)
      }

      // 按类型统计
      if (content.stats.commitsByType && Object.keys(content.stats.commitsByType).length > 0) {
        statsLines.push('\n### 按类型分布\n')
        for (const [type, count] of Object.entries(content.stats.commitsByType)) {
          const percentage = ((count / content.stats.totalCommits) * 100).toFixed(1)
          statsLines.push(`- ${type}: ${count} (${percentage}%)`)
        }
      }

      return formatted + statsLines.join('\n')
    },
  },
  {
    version: '1.0.0',
    description: '在 Changelog 末尾添加详细统计信息',
  }
)

/**
 * 所有内置插件
 */
export const builtinPlugins = [
  emojiEnhancerPlugin,
  deduplicatePlugin,
  sortByDatePlugin,
  breakingChangesHighlightPlugin,
  linkEnhancerPlugin,
  statsEnhancerPlugin,
]
