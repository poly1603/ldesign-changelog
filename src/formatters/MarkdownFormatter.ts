/**
 * Markdown 格式化器
 */

import type { ChangelogContent, ChangelogSection } from '../types/changelog.js'
import type { MarkdownFormatOptions } from '../types/config.js'

/**
 * Markdown 格式化器配置
 */
export interface MarkdownFormatterConfig {
  /** 是否包含作者 */
  includeAuthors?: boolean

  /** 是否包含 PR 链接 */
  includePRLinks?: boolean

  /** 是否包含 commit hash */
  includeCommitHash?: boolean

  /** 标题格式 */
  headerFormat?: string

  /** 格式选项 */
  options?: MarkdownFormatOptions
}

/**
 * Markdown 格式化器
 */
export class MarkdownFormatter {
  private config: Required<MarkdownFormatterConfig>

  constructor(config: MarkdownFormatterConfig = {}) {
    this.config = {
      includeAuthors: true,
      includePRLinks: true,
      includeCommitHash: true,
      headerFormat: '## [{version}] - {date}',
      options: {
        generateToc: false,
        headingLevel: 2,
        useEmoji: true,
      },
      ...config,
      options: {
        generateToc: false,
        headingLevel: 2,
        useEmoji: true,
        ...config.options,
      },
    }
  }

  /**
   * 格式化 Changelog
   */
  format(content: ChangelogContent): string {
    const lines: string[] = []

    // 标题
    const header = this.formatHeader(content)
    lines.push(header, '')

    // 比较链接
    if (content.compareUrl) {
      lines.push(`**Full Changelog**: ${content.compareUrl}`, '')
    }

    // Breaking Changes
    if (content.breakingChanges && content.breakingChanges.length > 0) {
      lines.push(this.formatHeading('💥 Breaking Changes', 3), '')
      for (const bc of content.breakingChanges) {
        lines.push(`- ${bc.description}`)
        if (bc.migration) {
          lines.push(`  - **Migration**: ${bc.migration}`)
        }
      }
      lines.push('')
    }

    // 按类型分组的提交
    for (const section of content.sections) {
      if (section.commits.length === 0) continue

      lines.push(this.formatSection(section), '')
    }

    // 贡献者
    if (content.contributors && content.contributors.length > 0) {
      lines.push(this.formatHeading('👥 Contributors', 3), '')
      const contributorList = content.contributors
        .map(c => c.username ? `@${c.username}` : c.name)
        .join(', ')
      lines.push(contributorList, '')
    }

    // 统计信息
    if (content.stats) {
      lines.push(this.formatHeading('📊 Statistics', 3), '')
      lines.push(`- Total Commits: **${content.stats.totalCommits}**`)
      lines.push(`- Contributors: **${content.stats.contributorCount}**`)
      if (content.stats.prCount) {
        lines.push(`- Pull Requests: **${content.stats.prCount}**`)
      }
      if (content.stats.issueCount) {
        lines.push(`- Issues Closed: **${content.stats.issueCount}**`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 格式化标题
   */
  private formatHeader(content: ChangelogContent): string {
    return this.config.headerFormat
      .replace('{version}', content.version)
      .replace('{date}', content.date)
  }

  /**
   * 格式化章节
   */
  private formatSection(section: ChangelogSection): string {
    const lines: string[] = []

    lines.push(this.formatHeading(section.title, 3))
    lines.push('')

    for (const commit of section.commits) {
      let line = '- '

      // Scope
      if (commit.scope) {
        line += `**${commit.scope}**: `
      }

      // 主题
      line += commit.subject

      // PR 链接
      if (this.config.includePRLinks && commit.pr && commit.prLink) {
        line += ` ([#${commit.pr}](${commit.prLink}))`
      }

      // Commit hash
      if (this.config.includeCommitHash && commit.commitLink) {
        line += ` ([${commit.shortHash}](${commit.commitLink}))`
      }

      // 作者
      if (this.config.includeAuthors) {
        const authorName = commit.author.username || commit.author.name
        line += ` - @${authorName}`
      }

      lines.push(line)
    }

    return lines.join('\n')
  }

  /**
   * 格式化标题
   */
  private formatHeading(text: string, level: number): string {
    const actualLevel = this.config.options.headingLevel + level - 2
    const prefix = '#'.repeat(Math.max(1, Math.min(6, actualLevel)))
    return `${prefix} ${text}`
  }

  /**
   * 生成完整 Changelog
   */
  formatComplete(contents: ChangelogContent[], title = 'Changelog'): string {
    const lines: string[] = []

    // 标题
    lines.push(`# ${title}`, '')

    // 目录（如果启用）
    if (this.config.options.generateToc) {
      lines.push(this.generateToc(contents), '')
    }

    // 各版本内容
    for (const content of contents) {
      lines.push(this.format(content), '')
    }

    return lines.join('\n')
  }

  /**
   * 生成目录
   */
  private generateToc(contents: ChangelogContent[]): string {
    const lines: string[] = ['## Table of Contents', '']

    for (const content of contents) {
      const anchor = content.version.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      lines.push(`- [${content.version}](#${anchor})`)
    }

    return lines.join('\n')
  }
}

/**
 * 创建 Markdown 格式化器
 */
export function createMarkdownFormatter(config?: MarkdownFormatterConfig): MarkdownFormatter {
  return new MarkdownFormatter(config)
}

