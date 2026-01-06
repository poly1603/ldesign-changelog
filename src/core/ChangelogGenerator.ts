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
import { DependencyTracker } from './DependencyTracker.js'
import { SecurityScanner } from './SecurityScanner.js'
import type { SecurityIssue } from './SecurityScanner.js'
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
import { logger, toError } from '../utils/logger.js'

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
  private dependencyTracker: DependencyTracker
  private securityScanner: SecurityScanner
  private repoInfo: RepositoryInfo | null = null
  private trackDependencies: boolean = false
  private scanSecurity: boolean = false

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

    // 初始化依赖追踪器
    this.dependencyTracker = new DependencyTracker({
      cwd: this.config.cwd,
    })

    // 初始化安全扫描器
    this.securityScanner = new SecurityScanner()

    // 从配置中读取依赖追踪设置
    this.trackDependencies = config.trackDependencies ?? false

    // 从配置中读取安全扫描设置
    this.scanSecurity = config.scanSecurity ?? false

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
   * 启用依赖追踪
   */
  enableDependencyTracking(enabled: boolean = true): void {
    this.trackDependencies = enabled
    logger.debug(`依赖追踪已${enabled ? '启用' : '禁用'}`)
  }

  /**
   * 启用安全扫描
   */
  enableSecurityScanning(enabled: boolean = true): void {
    this.scanSecurity = enabled
    logger.debug(`安全扫描已${enabled ? '启用' : '禁用'}`)
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
    let sections = this.createSections(commits)

    // 如果启用了安全扫描，添加安全章节
    let securityIssues: SecurityIssue[] = []
    if (this.scanSecurity) {
      try {
        logger.debug('正在扫描安全问题...')
        securityIssues = await this.securityScanner.scan(commits)

        if (securityIssues.length > 0) {
          const securitySection = this.createSecuritySection(securityIssues, commits)
          // 将安全章节添加到最前面（优先级最高）
          sections = [securitySection, ...sections]
          logger.debug(`检测到 ${securityIssues.length} 个安全问题`)
        } else {
          logger.debug('未检测到安全问题')
        }
      } catch (error) {
        logger.warn('安全扫描失败', toError(error))
      }
    }

    // 如果启用了依赖追踪，添加依赖变更章节
    if (this.trackDependencies) {
      try {
        logger.debug('正在追踪依赖变更...')
        const dependencyChanges = await this.dependencyTracker.extractChanges(commits)

        if (dependencyChanges.length > 0) {
          const dependencySection = this.dependencyTracker.formatChanges(dependencyChanges)
          // 将依赖章节添加到安全章节之后
          const insertIndex = this.scanSecurity && securityIssues.length > 0 ? 1 : 0
          sections.splice(insertIndex, 0, dependencySection)
          logger.debug(`检测到 ${dependencyChanges.length} 个依赖变更`)
        } else {
          logger.debug('未检测到依赖变更')
        }
      } catch (error) {
        logger.warn('依赖追踪失败', toError(error))
      }
    }

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
   * 创建安全章节
   */
  private createSecuritySection(
    securityIssues: SecurityIssue[],
    commits: ChangelogCommit[]
  ): ChangelogSection {
    // 获取安全相关的提交
    const securityCommitHashes = new Set(securityIssues.map(issue => issue.commitHash))
    const securityCommits = commits.filter(commit => securityCommitHashes.has(commit.hash))

    // 为安全提交添加徽章和 CVE 链接
    const commitsWithBadges = securityCommits.map(commit => {
      const issue = securityIssues.find(i => i.commitHash === commit.hash)
      if (!issue) return commit

      // 添加安全徽章到 subject
      const badge = this.getSecurityBadge(issue.severity)
      let subject = `${badge} ${commit.subject}`

      // 如果有 CVE ID，添加链接到 subject
      if (issue.cveId && issue.cveLink) {
        subject = `${subject} ([${issue.cveId}](${issue.cveLink}))`
      }

      return {
        ...commit,
        subject,
        isSecurity: true,
      }
    })

    return {
      title: '🔒 安全更新',
      type: 'security',
      commits: commitsWithBadges,
      priority: -1, // 最高优先级
    }
  }

  /**
   * 获取安全徽章
   */
  private getSecurityBadge(severity: SecurityIssue['severity']): string {
    const badges = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
    }
    return badges[severity] || '🔒'
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

