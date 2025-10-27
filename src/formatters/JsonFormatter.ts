/**
 * JSON 格式化器
 */

import type { ChangelogContent } from '../types/changelog.js'
import type { JsonFormatOptions } from '../types/config.js'

/**
 * JSON 格式化器配置
 */
export interface JsonFormatterConfig {
  /** 格式选项 */
  options?: JsonFormatOptions
}

/**
 * JSON 格式化器
 */
export class JsonFormatter {
  private config: Required<JsonFormatterConfig>

  constructor(config: JsonFormatterConfig = {}) {
    this.config = {
      options: {
        pretty: true,
        indent: 2,
        includeMetadata: true,
      },
      ...config,
      options: {
        pretty: true,
        indent: 2,
        includeMetadata: true,
        ...config.options,
      },
    }
  }

  /**
   * 格式化 Changelog
   */
  format(content: ChangelogContent): string {
    const data = this.prepareData(content)

    if (this.config.options.pretty) {
      return JSON.stringify(data, null, this.config.options.indent)
    }

    return JSON.stringify(data)
  }

  /**
   * 格式化完整 Changelog
   */
  formatComplete(contents: ChangelogContent[]): string {
    const data = {
      versions: contents.map(c => this.prepareData(c)),
    }

    if (this.config.options.includeMetadata) {
      data['metadata'] = {
        generatedAt: new Date().toISOString(),
        totalVersions: contents.length,
        totalCommits: contents.reduce((sum, c) => sum + c.commits.length, 0),
      }
    }

    if (this.config.options.pretty) {
      return JSON.stringify(data, null, this.config.options.indent)
    }

    return JSON.stringify(data)
  }

  /**
   * 准备数据
   */
  private prepareData(content: ChangelogContent): any {
    const data: any = {
      version: content.version,
      date: content.date,
      sections: content.sections.map(section => ({
        title: section.title,
        type: section.type,
        commits: section.commits.map(commit => ({
          hash: commit.hash,
          shortHash: commit.shortHash,
          type: commit.type,
          scope: commit.scope,
          subject: commit.subject,
          author: commit.author,
          pr: commit.pr,
          prLink: commit.prLink,
          issues: commit.issues,
          issueLinks: commit.issueLinks,
          breaking: commit.breaking,
          date: commit.date,
          commitLink: commit.commitLink,
        })),
      })),
      commits: content.commits.map(commit => ({
        hash: commit.hash,
        shortHash: commit.shortHash,
        type: commit.type,
        scope: commit.scope,
        subject: commit.subject,
        author: commit.author,
        pr: commit.pr,
        breaking: commit.breaking,
        date: commit.date,
      })),
    }

    if (content.breakingChanges && content.breakingChanges.length > 0) {
      data.breakingChanges = content.breakingChanges.map(bc => ({
        description: bc.description,
        commit: {
          hash: bc.commit.hash,
          subject: bc.commit.subject,
        },
        migration: bc.migration,
      }))
    }

    if (content.contributors) {
      data.contributors = content.contributors.map(c => ({
        name: c.name,
        email: c.email,
        username: c.username,
        commitCount: c.commitCount,
        contributionTypes: c.contributionTypes,
      }))
    }

    if (content.stats) {
      data.stats = content.stats
    }

    if (content.compareUrl) {
      data.compareUrl = content.compareUrl
    }

    if (this.config.options.includeMetadata) {
      data.metadata = {
        generatedAt: new Date().toISOString(),
      }
    }

    return data
  }
}

/**
 * 创建 JSON 格式化器
 */
export function createJsonFormatter(config?: JsonFormatterConfig): JsonFormatter {
  return new JsonFormatter(config)
}

