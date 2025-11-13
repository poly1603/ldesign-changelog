/**
 * Commit 解析器
 */

import type { GitCommit, ChangelogCommit, RepositoryInfo } from '../types/index.js'
import { generatePRLink, generateIssueLink, generateCommitLink } from '../utils/git-utils.js'

/**
 * Commit 解析器配置
 */
export interface CommitParserConfig {
  /** 是否包含所有提交 */
  includeAllCommits?: boolean

  /** 隐藏的类型 */
  hiddenTypes?: string[]

  /** 仓库信息 */
  repositoryInfo?: RepositoryInfo

  /** scope 过滤 */
  scopeFilter?: string[]

  /** 是否标记依赖更新 */
  markDependencies?: boolean

  /** 是否标记安全修复 */
  markSecurity?: boolean
}

/**
 * Conventional Commits 正则表达式
 * 格式: type(scope): subject
 */
const COMMIT_REGEX = /^(\w+)(?:\(([^)]+)\))?: (.+)$/

/**
 * PR 引用正则表达式
 */
const PR_REGEX = /#(\d+)/g

/**
 * Issue 引用正则表达式
 */
const ISSUE_REGEX = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi

/**
 * Breaking Change 标记
 */
const BREAKING_MARKERS = ['BREAKING CHANGE:', 'BREAKING CHANGES:', 'BREAKING:']

/**
 * Commit 解析器
 */
export class CommitParser {
  private config: Required<Omit<CommitParserConfig, 'repositoryInfo' | 'scopeFilter' | 'markDependencies' | 'markSecurity'>> & {
    repositoryInfo?: RepositoryInfo
    scopeFilter?: string[]
    markDependencies?: boolean
    markSecurity?: boolean
  }

  constructor(config: CommitParserConfig = {}) {
    this.config = {
      includeAllCommits: false,
      hiddenTypes: [],
      repositoryInfo: undefined,
      scopeFilter: undefined,
      markDependencies: false,
      markSecurity: false,
      ...config,
    }
  }

  /**
   * 解析提交列表
   */
  parse(commits: GitCommit[]): ChangelogCommit[] {
    const parsed: ChangelogCommit[] = []

    for (const commit of commits) {
      const changelogCommit = this.parseCommit(commit)

      if (changelogCommit) {
        parsed.push(changelogCommit)
      }
    }

    return parsed
  }

  /**
   * 解析单个提交
   */
  parseCommit(commit: GitCommit): ChangelogCommit | null {
    const match = commit.subject.match(COMMIT_REGEX)

    // 如果不匹配 Conventional Commits 格式且不包含所有提交，则跳过
    if (!match && !this.config.includeAllCommits) {
      return null
    }

    let type = 'other'
    let scope: string | undefined
    let subject = commit.subject

    if (match) {
      type = match[1]
      scope = match[2]
      subject = match[3]
    }

    // 检查是否为隐藏类型
    if (this.config.hiddenTypes.includes(type)) {
      return null
    }

    // scope 过滤
    if (this.config.scopeFilter && this.config.scopeFilter.length > 0) {
      if (!scope || !this.config.scopeFilter.includes(scope)) {
        return null
      }
    }

    // 提取 PR 编号
    const pr = this.extractPR(subject)

    // 提取 Issues
    const issues = this.extractIssues(commit.body || '')

    // 检查 breaking change
    const breaking = this.isBreakingChange(commit.body || '')
    const breakingDescription = breaking ? this.extractBreakingDescription(commit.body || '') : undefined

    // 生成链接
    const prLink = pr && this.config.repositoryInfo ? generatePRLink(pr, this.config.repositoryInfo) : undefined
    const issueLinks = issues.length > 0 && this.config.repositoryInfo
      ? issues.map(issue => generateIssueLink(issue, this.config.repositoryInfo!))
      : undefined
    const commitLink = this.config.repositoryInfo ? generateCommitLink(commit.hash, this.config.repositoryInfo) : undefined

    // 检测是否为依赖更新
    const isDependency = this.config.markDependencies ? this.isDependencyUpdate(scope, subject) : undefined

    // 检测是否为安全修复
    const isSecurity = this.config.markSecurity ? this.isSecurityFix(scope, subject, commit.body) : undefined

    return {
      hash: commit.hash,
      shortHash: commit.shortHash,
      type,
      scope,
      subject,
      body: commit.body,
      author: {
        name: commit.authorName,
        email: commit.authorEmail,
      },
      pr,
      prLink,
      issues: issues.length > 0 ? issues : undefined,
      issueLinks,
      breaking,
      breakingDescription,
      date: commit.date,
      commitLink,
      isDependency,
      isSecurity,
    }
  }

  /**
   * 提取 PR 编号
   */
  private extractPR(text: string): string | undefined {
    const match = text.match(PR_REGEX)
    if (match && match.length > 0) {
      // 返回第一个匹配的 PR 编号
      return match[0].replace('#', '')
    }
    return undefined
  }

  /**
   * 提取 Issues
   */
  private extractIssues(text: string): string[] {
    const issues: string[] = []
    let match: RegExpExecArray | null

    // 重置正则表达式
    ISSUE_REGEX.lastIndex = 0

    while ((match = ISSUE_REGEX.exec(text)) !== null) {
      issues.push(match[1])
    }

    return issues
  }

  /**
   * 判断是否为 Breaking Change
   */
  private isBreakingChange(body: string): boolean {
    return BREAKING_MARKERS.some(marker => body.includes(marker))
  }

  /**
   * 提取 Breaking Change 描述
   */
  private extractBreakingDescription(body: string): string | undefined {
    for (const marker of BREAKING_MARKERS) {
      const index = body.indexOf(marker)
      if (index !== -1) {
        const description = body.substring(index + marker.length).trim()
        // 提取第一段描述
        const lines = description.split('\n')
        return lines[0].trim()
      }
    }
    return undefined
  }

  /**
   * 判断是否为依赖更新
   */
  private isDependencyUpdate(scope?: string, subject?: string): boolean {
    const depKeywords = ['deps', 'dependencies', 'dep', 'dependency', 'package']
    const scopeMatch = scope && depKeywords.some(kw => scope.toLowerCase().includes(kw))
    const subjectMatch = subject && (
      subject.toLowerCase().includes('bump') ||
      subject.toLowerCase().includes('update') && depKeywords.some(kw => subject.toLowerCase().includes(kw))
    )
    return !!(scopeMatch || subjectMatch)
  }

  /**
   * 判断是否为安全修复
   */
  private isSecurityFix(scope?: string, subject?: string, body?: string): boolean {
    const securityKeywords = ['security', 'vulnerability', 'cve', 'xss', 'csrf', 'injection', 'exploit']
    const text = `${scope || ''} ${subject || ''} ${body || ''}`.toLowerCase()
    return securityKeywords.some(kw => text.includes(kw))
  }

  /**
   * 按类型分组提交
   */
  groupByType(commits: ChangelogCommit[]): Map<string, ChangelogCommit[]> {
    const groups = new Map<string, ChangelogCommit[]>()

    for (const commit of commits) {
      if (!groups.has(commit.type)) {
        groups.set(commit.type, [])
      }
      groups.get(commit.type)!.push(commit)
    }

    return groups
  }

  /**
   * 提取 Breaking Changes
   */
  extractBreakingChanges(commits: ChangelogCommit[]): ChangelogCommit[] {
    return commits.filter(commit => commit.breaking)
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<CommitParserConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * 创建 Commit 解析器
 */
export function createCommitParser(config?: CommitParserConfig): CommitParser {
  return new CommitParser(config)
}

