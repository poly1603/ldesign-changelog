/**
 * Changelog 合并器
 * 
 * 支持合并多个 changelog 文件，包括 Markdown 和 JSON 格式
 */

import type {
  ChangelogContent,
  ChangelogSection,
  ChangelogCommit,
  BreakingChange,
  Contributor,
} from '../types/changelog.js'
import { readFileContent } from '../utils/file.js'
import { logger } from '../utils/logger.js'

/**
 * 合并源
 */
export interface MergeSource {
  /** 文件路径 */
  path: string
  /** 包名（可选） */
  packageName?: string
  /** 格式 */
  format: 'markdown' | 'json' | 'auto'
}

/**
 * 合并选项
 */
export interface MergeOptions {
  /** 合并策略 */
  strategy: 'by-date' | 'by-version' | 'by-package'
  /** 是否去重 */
  deduplicate: boolean
  /** 去重键 */
  deduplicateKey: 'hash' | 'message' | 'both'
  /** 是否保留包名前缀 */
  preservePackagePrefix: boolean
  /** 输出格式 */
  outputFormat: 'markdown' | 'json'
}

/**
 * 解析错误
 */
export class ParseError extends Error {
  constructor(message: string, public source: string) {
    super(message)
    this.name = 'ParseError'
  }
}

/**
 * Changelog 合并器
 */
export class ChangelogMerger {
  /**
   * 合并多个 changelog
   */
  async merge(sources: MergeSource[], options: MergeOptions): Promise<ChangelogContent> {
    logger.info(`正在合并 ${sources.length} 个 changelog 文件...`)

    // 解析所有源文件
    const contents: Array<{ content: ChangelogContent; source: MergeSource }> = []

    for (const source of sources) {
      try {
        const content = await this.parse(source)
        contents.push({ content, source })
        logger.debug(`成功解析: ${source.path}`)
      } catch (error) {
        if (error instanceof ParseError) {
          logger.error(`解析失败 ${source.path}: ${error.message}`)
          // 继续处理其他文件
          continue
        }
        throw error
      }
    }

    if (contents.length === 0) {
      throw new Error('没有成功解析的 changelog 文件')
    }

    // 合并内容
    const merged = this.mergeContents(contents, options)

    logger.success(`成功合并 ${contents.length} 个 changelog`)

    return merged
  }

  /**
   * 解析 changelog 文件
   */
  async parse(source: MergeSource): Promise<ChangelogContent> {
    try {
      const content = await readFileContent(source.path)

      // 自动检测格式
      let format = source.format
      if (format === 'auto') {
        format = this.detectFormat(content)
      }

      // 根据格式解析
      if (format === 'json') {
        return this.parseJson(content, source)
      } else {
        return this.parseMarkdown(content, source)
      }
    } catch (error) {
      throw new ParseError(
        `无法读取或解析文件: ${error instanceof Error ? error.message : String(error)}`,
        source.path
      )
    }
  }

  /**
   * 检测格式
   */
  private detectFormat(content: string): 'markdown' | 'json' {
    const trimmed = content.trim()

    // 尝试解析为 JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed)
        return 'json'
      } catch {
        // 不是有效的 JSON
      }
    }

    // 默认为 Markdown
    return 'markdown'
  }

  /**
   * 解析 JSON 格式
   */
  private parseJson(content: string, source: MergeSource): ChangelogContent {
    try {
      const data = JSON.parse(content)

      // 如果是包含多个版本的格式
      if (data.versions && Array.isArray(data.versions)) {
        // 返回第一个版本（或合并所有版本）
        if (data.versions.length > 0) {
          return this.normalizeJsonData(data.versions[0], source)
        }
        throw new Error('JSON 文件不包含任何版本')
      }

      // 单个版本格式
      return this.normalizeJsonData(data, source)
    } catch (error) {
      throw new ParseError(
        `JSON 解析失败: ${error instanceof Error ? error.message : String(error)}`,
        source.path
      )
    }
  }

  /**
   * 规范化 JSON 数据
   */
  private normalizeJsonData(data: any, source: MergeSource): ChangelogContent {
    return {
      version: data.version || 'unknown',
      date: data.date || new Date().toISOString().split('T')[0],
      sections: data.sections || [],
      commits: data.commits || [],
      breakingChanges: data.breakingChanges,
      contributors: data.contributors,
      stats: data.stats,
      compareUrl: data.compareUrl,
    }
  }

  /**
   * 解析 Markdown 格式
   */
  private parseMarkdown(content: string, source: MergeSource): ChangelogContent {
    const lines = content.split('\n')

    let version = 'unknown'
    let date = new Date().toISOString().split('T')[0]
    const sections: ChangelogSection[] = []
    const commits: ChangelogCommit[] = []
    let currentSection: ChangelogSection | null = null
    let compareUrl: string | undefined

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // 跳过空行
      if (!line) continue

      // 解析版本标题 (## [version] - date 或 ## version - date)
      const versionMatch = line.match(/^##\s+\[?([^\]]+)\]?\s*-\s*(.+)/)
      if (versionMatch) {
        version = versionMatch[1].trim()
        date = versionMatch[2].trim()
        continue
      }

      // 解析比较链接
      if (line.includes('Full Changelog:')) {
        const urlMatch = line.match(/https?:\/\/[^\s)]+/)
        if (urlMatch) {
          compareUrl = urlMatch[0]
        }
        continue
      }

      // 解析章节标题 (### Title)
      const sectionMatch = line.match(/^###\s+(.+)/)
      if (sectionMatch) {
        const title = sectionMatch[1].trim()

        // 保存上一个章节
        if (currentSection && currentSection.commits.length > 0) {
          sections.push(currentSection)
        }

        // 创建新章节
        currentSection = {
          title,
          type: this.extractTypeFromTitle(title),
          commits: [],
        }
        continue
      }

      // 解析提交条目 (- **scope**: subject ...)
      if (line.startsWith('-')) {
        const commit = this.parseCommitLine(line)
        if (commit) {
          commits.push(commit)
          if (currentSection) {
            currentSection.commits.push(commit)
          }
        }
      }
    }

    // 保存最后一个章节
    if (currentSection && currentSection.commits.length > 0) {
      sections.push(currentSection)
    }

    return {
      version,
      date,
      sections,
      commits,
      compareUrl,
    }
  }

  /**
   * 从标题提取类型
   */
  private extractTypeFromTitle(title: string): string {
    // 移除 emoji 和空格
    const cleaned = title.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()

    // 常见类型映射
    const typeMap: Record<string, string> = {
      '新功能': 'feat',
      'Features': 'feat',
      'Bug 修复': 'fix',
      'Bug Fixes': 'fix',
      '性能优化': 'perf',
      'Performance': 'perf',
      '代码重构': 'refactor',
      'Code Refactoring': 'refactor',
      '文档更新': 'docs',
      'Documentation': 'docs',
      '安全更新': 'security',
      'Security': 'security',
      '依赖更新': 'dependencies',
      'Dependencies': 'dependencies',
    }

    for (const [key, value] of Object.entries(typeMap)) {
      if (cleaned.includes(key)) {
        return value
      }
    }

    return 'other'
  }

  /**
   * 解析提交行
   */
  private parseCommitLine(line: string): ChangelogCommit | null {
    // 移除开头的 "- "
    let content = line.substring(1).trim()

    // 提取 scope (如果有)
    let scope: string | undefined
    const scopeMatch = content.match(/^\*\*([^*]+)\*\*:\s*/)
    if (scopeMatch) {
      scope = scopeMatch[1]
      content = content.substring(scopeMatch[0].length)
    }

    // 提取 subject (到第一个链接或作者标记之前)
    let subject = content
    let pr: string | undefined
    let prLink: string | undefined
    let hash = ''
    let shortHash = ''
    let commitLink: string | undefined
    let authorName = 'unknown'

    // 提取 PR 链接 ([#123](url))
    const prMatch = content.match(/\(\[#(\d+)\]\(([^)]+)\)\)/)
    if (prMatch) {
      pr = prMatch[1]
      prLink = prMatch[2]
      subject = content.substring(0, content.indexOf(prMatch[0])).trim()
      content = content.substring(content.indexOf(prMatch[0]) + prMatch[0].length)
    }

    // 提取 commit hash ([abc123](url))
    const hashMatch = content.match(/\(\[([a-f0-9]{7,})\]\(([^)]+)\)\)/)
    if (hashMatch) {
      shortHash = hashMatch[1]
      hash = shortHash
      commitLink = hashMatch[2]
      if (!subject.includes(hashMatch[0])) {
        content = content.substring(content.indexOf(hashMatch[0]) + hashMatch[0].length)
      }
    }

    // 提取作者 (- @author)
    const authorMatch = content.match(/-\s*@([^\s]+)/)
    if (authorMatch) {
      authorName = authorMatch[1]
    }

    // 如果没有 hash，生成一个临时的
    if (!hash) {
      hash = this.generateTempHash(subject, scope)
      shortHash = hash.substring(0, 7)
    }

    return {
      hash,
      shortHash,
      type: 'unknown',
      scope,
      subject,
      author: {
        name: authorName,
        email: `${authorName}@unknown`,
        username: authorName,
      },
      pr,
      prLink,
      commitLink,
      date: new Date().toISOString().split('T')[0],
    }
  }

  /**
   * 生成临时 hash
   */
  private generateTempHash(subject: string, scope?: string): string {
    const str = `${scope || ''}${subject}`
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(40, '0')
  }

  /**
   * 合并内容
   */
  private mergeContents(
    contents: Array<{ content: ChangelogContent; source: MergeSource }>,
    options: MergeOptions
  ): ChangelogContent {
    // 收集所有提交
    let allCommits: ChangelogCommit[] = []

    for (const { content, source } of contents) {
      const commits = content.commits.map(commit => {
        // 如果需要保留包名前缀，添加到 scope
        if (options.preservePackagePrefix && source.packageName) {
          return {
            ...commit,
            scope: source.packageName + (commit.scope ? `/${commit.scope}` : ''),
          }
        }
        return commit
      })
      allCommits.push(...commits)
    }

    // 去重
    if (options.deduplicate) {
      allCommits = this.deduplicate(allCommits, options.deduplicateKey)
    }

    // 根据策略排序
    allCommits = this.sortByStrategy(allCommits, options.strategy)

    // 重新分组为 sections
    const sections = this.groupCommitsIntoSections(allCommits)

    // 合并其他信息
    const breakingChanges = this.mergeBreakingChanges(contents)
    const contributors = this.mergeContributors(contents)
    const stats = this.calculateMergedStats(allCommits, contributors)

    // 确定版本和日期
    const { version, date } = this.determineVersionAndDate(contents, options.strategy)

    return {
      version,
      date,
      sections,
      commits: allCommits,
      breakingChanges: breakingChanges.length > 0 ? breakingChanges : undefined,
      contributors: contributors.length > 0 ? contributors : undefined,
      stats,
    }
  }

  /**
   * 去重
   */
  deduplicate(commits: ChangelogCommit[], key: 'hash' | 'message' | 'both'): ChangelogCommit[] {
    const seen = new Set<string>()
    const result: ChangelogCommit[] = []

    for (const commit of commits) {
      let dedupeKey: string

      switch (key) {
        case 'hash':
          dedupeKey = commit.hash
          break
        case 'message':
          dedupeKey = `${commit.type}:${commit.scope || ''}:${commit.subject}`
          break
        case 'both':
          dedupeKey = `${commit.hash}:${commit.subject}`
          break
      }

      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey)
        result.push(commit)
      }
    }

    logger.debug(`去重: ${commits.length} -> ${result.length} 个提交`)

    return result
  }

  /**
   * 根据策略排序
   */
  private sortByStrategy(commits: ChangelogCommit[], strategy: MergeOptions['strategy']): ChangelogCommit[] {
    const sorted = [...commits]

    switch (strategy) {
      case 'by-date':
        // 按日期降序排序（最新的在前）
        sorted.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA
        })
        break

      case 'by-version':
        // 按版本排序（需要从 commit 中提取版本信息，这里简化为按日期）
        sorted.sort((a, b) => {
          const dateA = new Date(a.date).getTime()
          const dateB = new Date(b.date).getTime()
          return dateB - dateA
        })
        break

      case 'by-package':
        // 按包名（scope）排序
        sorted.sort((a, b) => {
          const scopeA = a.scope || ''
          const scopeB = b.scope || ''
          return scopeA.localeCompare(scopeB)
        })
        break
    }

    return sorted
  }

  /**
   * 将提交分组为 sections
   */
  private groupCommitsIntoSections(commits: ChangelogCommit[]): ChangelogSection[] {
    const groups = new Map<string, ChangelogCommit[]>()

    for (const commit of commits) {
      const type = commit.type || 'other'
      if (!groups.has(type)) {
        groups.set(type, [])
      }
      groups.get(type)!.push(commit)
    }

    const sections: ChangelogSection[] = []
    const typeOrder = ['security', 'feat', 'fix', 'perf', 'refactor', 'docs', 'dependencies', 'other']

    for (const type of typeOrder) {
      if (groups.has(type)) {
        sections.push({
          title: this.getDefaultSectionTitle(type),
          type,
          commits: groups.get(type)!,
        })
        groups.delete(type)
      }
    }

    // 添加剩余的类型
    for (const [type, commits] of groups) {
      sections.push({
        title: this.getDefaultSectionTitle(type),
        type,
        commits,
      })
    }

    return sections
  }

  /**
   * 获取默认章节标题
   */
  private getDefaultSectionTitle(type: string): string {
    const titles: Record<string, string> = {
      security: '🔒 安全更新',
      feat: '✨ 新功能',
      fix: '🐛 Bug 修复',
      perf: '⚡ 性能优化',
      refactor: '♻️ 代码重构',
      docs: '📝 文档更新',
      dependencies: '📦 依赖更新',
      other: '🔧 其他',
    }
    return titles[type] || `📌 ${type}`
  }

  /**
   * 合并 breaking changes
   */
  private mergeBreakingChanges(
    contents: Array<{ content: ChangelogContent; source: MergeSource }>
  ): BreakingChange[] {
    const all: BreakingChange[] = []

    for (const { content } of contents) {
      if (content.breakingChanges) {
        all.push(...content.breakingChanges)
      }
    }

    return all
  }

  /**
   * 合并贡献者
   */
  private mergeContributors(
    contents: Array<{ content: ChangelogContent; source: MergeSource }>
  ): Contributor[] {
    const contributorMap = new Map<string, Contributor>()

    for (const { content } of contents) {
      if (content.contributors) {
        for (const contributor of content.contributors) {
          const key = contributor.email

          if (!contributorMap.has(key)) {
            contributorMap.set(key, { ...contributor })
          } else {
            const existing = contributorMap.get(key)!
            existing.commitCount += contributor.commitCount
          }
        }
      }
    }

    return Array.from(contributorMap.values()).sort((a, b) => b.commitCount - a.commitCount)
  }

  /**
   * 计算合并后的统计信息
   */
  private calculateMergedStats(commits: ChangelogCommit[], contributors: Contributor[]) {
    const commitsByType: Record<string, number> = {}

    for (const commit of commits) {
      const type = commit.type || 'other'
      commitsByType[type] = (commitsByType[type] || 0) + 1
    }

    return {
      totalCommits: commits.length,
      commitsByType,
      contributorCount: contributors.length,
    }
  }

  /**
   * 确定版本和日期
   */
  private determineVersionAndDate(
    contents: Array<{ content: ChangelogContent; source: MergeSource }>,
    strategy: MergeOptions['strategy']
  ): { version: string; date: string } {
    if (contents.length === 0) {
      return {
        version: 'merged',
        date: new Date().toISOString().split('T')[0],
      }
    }

    // 使用第一个内容的版本和日期
    const first = contents[0].content

    if (strategy === 'by-package') {
      // 对于按包合并，使用 "merged" 作为版本
      return {
        version: 'merged',
        date: first.date,
      }
    }

    return {
      version: first.version,
      date: first.date,
    }
  }
}

/**
 * 创建 Changelog 合并器
 */
export function createChangelogMerger(): ChangelogMerger {
  return new ChangelogMerger()
}
