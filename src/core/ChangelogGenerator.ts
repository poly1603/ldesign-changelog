/**
 * Changelog 生成器
 */

import { join } from 'path'
import type {
  ChangelogConfig,
} from '../types/config.js'
import { DEFAULT_CONFIG } from '../types/config.js'
import type {
  ChangelogContent,
  ChangelogSection,
  ChangelogCommit,
  BreakingChange,
  Contributor,
  RepositoryInfo,
} from '../types/changelog.js'
import { CommitParser } from './CommitParser.js'
import { StatsAnalyzer } from './StatsAnalyzer.js'
import {
  createMarkdownFormatter,
  createJsonFormatter,
  createHtmlFormatter,
} from '../formatters/index.js'
import {
  getGitCommits,
  getLatestTag,
  getRepositoryInfo,
  generateCompareLink,
} from '../utils/git-utils.js'
import {
  readFileContent,
  writeFileContent,
  fileExists,
  backupFile,
} from '../utils/file.js'
import { logger } from '../utils/logger.js'

/**
 * Changelog 生成器
 */
export class ChangelogGenerator {
  private config: Required<Omit<ChangelogConfig, 'template' | 'repositoryUrl' | 'formatOptions'>> & {
    template?: string
    repositoryUrl?: string
    formatOptions?: ChangelogConfig['formatOptions']
  }
  private parser: CommitParser
  private analyzer: StatsAnalyzer
  private repoInfo: RepositoryInfo | null = null

  constructor(config: ChangelogConfig = {}) {
    // 合并默认配置
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }

    // 初始化解析器和分析器
    this.parser = new CommitParser({
      includeAllCommits: this.config.includeAllCommits,
      hiddenTypes: this.config.types
        .filter(t => t.hidden)
        .map(t => t.type),
    })

    this.analyzer = new StatsAnalyzer({
      calculatePercentage: true,
      analyzeFrequency: true,
    })

    // 初始化仓库信息
    this.initializeRepository().catch(() => {
      logger.debug('无法获取仓库信息')
    })
  }

  /**
   * 初始化仓库信息
   */
  private async initializeRepository(): Promise<void> {
    try {
      if (this.config.repositoryUrl) {
        const url = this.config.repositoryUrl
        this.repoInfo = {
          url,
          type: this.detectRepoType(url),
        }
      } else {
        this.repoInfo = await getRepositoryInfo(this.config.cwd)
      }

      // 更新解析器的仓库信息
      this.parser.setConfig({ repositoryInfo: this.repoInfo })

      logger.debug(`仓库信息: ${this.repoInfo.type} - ${this.repoInfo.url}`)
    } catch (error) {
      logger.debug('无法获取仓库信息')
    }
  }

  /**
   * 检测仓库类型
   */
  private detectRepoType(url: string): RepositoryInfo['type'] {
    if (url.includes('github.com')) return 'github'
    if (url.includes('gitlab')) return 'gitlab'
    if (url.includes('gitee.com')) return 'gitee'
    if (url.includes('bitbucket')) return 'bitbucket'
    return 'other'
  }

  /**
   * 生成 Changelog
   */
  async generate(version: string, from?: string, to = 'HEAD'): Promise<ChangelogContent> {
    logger.info(`正在生成版本 ${version} 的 Changelog...`)

    // 如果没有指定 from，尝试获取最新 tag
    if (!from) {
      from = await getLatestTag(this.config.cwd) || undefined
    }

    // 获取提交
    const gitCommits = await getGitCommits(from, to, this.config.cwd)
    logger.debug(`获取到 ${gitCommits.length} 个提交`)

    // 解析提交
    const commits = this.parser.parse(gitCommits)
    logger.debug(`解析了 ${commits.length} 个有效提交`)

    // 按类型分组
    const sections = this.createSections(commits)

    // 提取 Breaking Changes
    const breakingChanges = this.extractBreakingChanges(commits)

    // 提取贡献者
    const contributors = this.extractContributors(commits)

    // 统计分析
    const stats = this.analyzer.analyze(commits)

    // 生成比较链接
    const compareUrl = this.generateCompareUrl(from, to)

    const content: ChangelogContent = {
      version,
      date: new Date().toISOString().split('T')[0],
      sections,
      commits,
      breakingChanges: breakingChanges.length > 0 ? breakingChanges : undefined,
      contributors: contributors.length > 0 ? contributors : undefined,
      stats: {
        totalCommits: stats.totalCommits,
        commitsByType: this.convertCommitsByType(stats.byType),
        contributorCount: stats.contributors.length,
        issueCount: stats.references.issueCount,
        prCount: stats.references.prCount,
        commitsPerDay: stats.frequency.commitsPerDay,
        durationDays: stats.frequency.durationDays,
      },
      compareUrl,
    }

    logger.success(`成功生成 Changelog，包含 ${commits.length} 个提交`)

    return content
  }

  /**
   * 创建章节
   */
  private createSections(commits: ChangelogCommit[]): ChangelogSection[] {
    if (!this.config.groupByType) {
      return [{
        title: '更新',
        type: 'all',
        commits,
      }]
    }

    const groups = this.parser.groupByType(commits)
    const sections: ChangelogSection[] = []

    for (const [type, typeCommits] of groups) {
      const typeConfig = this.config.types.find(t => t.type === type)
      const title = typeConfig?.section || type

      sections.push({
        title,
        type,
        commits: typeCommits,
        priority: typeConfig?.priority,
      })
    }

    // 按优先级排序
    sections.sort((a, b) => {
      const aPriority = a.priority ?? 999
      const bPriority = b.priority ?? 999
      return aPriority - bPriority
    })

    return sections
  }

  /**
   * 提取 Breaking Changes
   */
  private extractBreakingChanges(commits: ChangelogCommit[]): BreakingChange[] {
    return commits
      .filter(c => c.breaking)
      .map(c => ({
        description: c.breakingDescription || c.subject,
        commit: c,
      }))
  }

  /**
   * 提取贡献者
   */
  private extractContributors(commits: ChangelogCommit[]): Contributor[] {
    const contributorMap = new Map<string, Contributor>()

    for (const commit of commits) {
      const key = commit.author.email

      if (!contributorMap.has(key)) {
        contributorMap.set(key, {
          name: commit.author.name,
          email: commit.author.email,
          username: commit.author.username,
          commitCount: 0,
        })
      }

      const contributor = contributorMap.get(key)!
      contributor.commitCount++
    }

    return Array.from(contributorMap.values()).sort((a, b) => b.commitCount - a.commitCount)
  }

  /**
   * 转换提交统计
   */
  private convertCommitsByType(typeStats: any[]): Record<string, number> {
    const result: Record<string, number> = {}
    for (const stat of typeStats) {
      result[stat.type] = stat.count
    }
    return result
  }

  /**
   * 生成比较链接
   */
  private generateCompareUrl(from?: string, to = 'HEAD'): string | undefined {
    if (!this.repoInfo || !from) return undefined
    return generateCompareLink(from, to, this.repoInfo)
  }

  /**
   * 格式化 Changelog
   */
  format(content: ChangelogContent, format?: 'markdown' | 'json' | 'html'): string {
    const outputFormat = format || this.config.format

    switch (outputFormat) {
      case 'json': {
        const formatter = createJsonFormatter({
          options: this.config.formatOptions?.json,
        })
        return formatter.format(content)
      }

      case 'html': {
        const formatter = createHtmlFormatter({
          includeAuthors: this.config.includeAuthors,
          includePRLinks: this.config.includePRLinks,
          includeCommitHash: this.config.includeCommitHash,
          options: this.config.formatOptions?.html,
        })
        return formatter.format(content)
      }

      case 'markdown':
      default: {
        const formatter = createMarkdownFormatter({
          includeAuthors: this.config.includeAuthors,
          includePRLinks: this.config.includePRLinks,
          includeCommitHash: this.config.includeCommitHash,
          headerFormat: this.config.headerFormat,
          options: this.config.formatOptions?.markdown,
        })
        return formatter.format(content)
      }
    }
  }

  /**
   * 写入 Changelog
   */
  async write(content: ChangelogContent): Promise<void> {
    const outputPath = join(this.config.cwd, this.config.output)

    // 格式化内容
    const formatted = this.format(content)

    // 如果文件存在且不是重新生成模式，则合并内容
    if (fileExists(outputPath) && !this.config.regenerate) {
      await this.mergeChangelog(outputPath, formatted)
    } else {
      // 直接写入
      await this.writeNewChangelog(outputPath, formatted)
    }

    logger.success(`Changelog 已写入: ${outputPath}`)
  }

  /**
   * 写入新 Changelog
   */
  private async writeNewChangelog(path: string, content: string): Promise<void> {
    let finalContent = content

    // 如果是 Markdown 格式，添加标题
    if (this.config.format === 'markdown' && !content.startsWith('# ')) {
      finalContent = `# Changelog\n\n${content}`
    }

    await writeFileContent(path, finalContent)
  }

  /**
   * 合并 Changelog
   */
  private async mergeChangelog(path: string, newContent: string): Promise<void> {
    // 备份原文件
    await backupFile(path)

    const existingContent = await readFileContent(path)
    const updateMode = this.config.updateMode || 'prepend'

    let mergedContent: string

    if (updateMode === 'overwrite') {
      // 覆盖模式：直接使用新内容
      mergedContent = newContent
    } else if (this.config.format === 'markdown') {
      mergedContent = this.mergeMarkdownChangelog(existingContent, newContent, updateMode)
    } else if (this.config.format === 'json') {
      mergedContent = this.mergeJsonChangelog(existingContent, newContent, updateMode)
    } else {
      // HTML 格式：不支持合并，直接覆盖
      mergedContent = newContent
    }

    await writeFileContent(path, mergedContent)
  }

  /**
   * 合并 Markdown Changelog
   */
  private mergeMarkdownChangelog(
    existing: string,
    newContent: string,
    mode: 'prepend' | 'append'
  ): string {
    // 提取标题
    const headerMatch = existing.match(/^#\s+.+\n+/)
    const header = headerMatch ? headerMatch[0] : ''
    const existingBody = headerMatch ? existing.substring(header.length) : existing

    if (mode === 'prepend') {
      // 添加到顶部
      return header ? `${header}${newContent}\n\n${existingBody}` : `${newContent}\n\n${existingBody}`
    } else {
      // 添加到底部
      return header ? `${header}${existingBody}\n\n${newContent}` : `${existingBody}\n\n${newContent}`
    }
  }

  /**
   * 合并 JSON Changelog
   */
  private mergeJsonChangelog(
    existing: string,
    newContent: string,
    mode: 'prepend' | 'append'
  ): string {
    try {
      const existingData = JSON.parse(existing)
      const newData = JSON.parse(newContent)

      if (!existingData.versions) {
        existingData.versions = []
      }

      if (mode === 'prepend') {
        existingData.versions.unshift(newData)
      } else {
        existingData.versions.push(newData)
      }

      const indent = this.config.formatOptions?.json?.indent || 2
      return JSON.stringify(existingData, null, indent)
    } catch {
      return newContent
    }
  }

  /**
   * 生成并写入 Changelog
   */
  async generateAndWrite(version: string, from?: string, to = 'HEAD'): Promise<void> {
    const content = await this.generate(version, from, to)
    await this.write(content)
  }
}

/**
 * 创建 Changelog 生成器
 */
export function createChangelogGenerator(config?: ChangelogConfig): ChangelogGenerator {
  return new ChangelogGenerator(config)
}

