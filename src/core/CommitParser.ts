/**
 * Commit 解析器
 */

import type { GitCommit, ChangelogCommit, RepositoryInfo } from '../types/index.js'
import { generatePRLink, generateIssueLink, generateCommitLink } from '../utils/git-utils.js'

/**
 * 提交消息模板配置
 * @description 定义提交消息的格式规范和验证规则
 */
export interface CommitTemplate {
  /**
   * 模板正则表达式
   * @description 用于匹配和解析提交消息的正则表达式
   * @example /^(\w+)(?:\(([^)]+)\))?: (.+)$/
   */
  pattern: RegExp

  /**
   * 允许的提交类型列表
   * @example ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore']
   */
  allowedTypes?: string[]

  /**
   * 允许的 scope 列表（白名单）
   * @example ['core', 'ui', 'api', 'docs']
   */
  allowedScopes?: string[]

  /**
   * 主题最大长度
   * @default 72
   */
  maxSubjectLength?: number

  /**
   * 是否要求 scope
   * @default false
   */
  requireScope?: boolean

  /**
   * 是否要求 body
   * @default false
   */
  requireBody?: boolean

  /**
   * 自定义验证函数
   * @param commit - 完整的提交消息
   * @returns 验证结果
   */
  customValidation?: (commit: string) => ValidationResult
}

/**
 * 验证结果
 * @description 提交消息验证的结果对象
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean

  /** 验证错误列表 */
  errors?: ValidationError[]

  /** 警告列表（不影响验证结果） */
  warnings?: string[]

  /** 修复建议列表 */
  suggestions?: string[]
}

/**
 * 验证错误
 * @description 描述单个验证错误的详细信息
 */
export interface ValidationError {
  /** 错误类型 */
  type: 'format' | 'type' | 'scope' | 'length' | 'custom'

  /** 错误消息 */
  message: string

  /** 错误在提交消息中的位置 */
  position?: { start: number; end: number }

  /** 期望的值 */
  expected?: string

  /** 实际的值 */
  actual?: string
}

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

  /** 提交消息模板 */
  template?: CommitTemplate

  /** 是否启用验证 */
  enableValidation?: boolean

  /** 是否提供修复建议 */
  provideSuggestions?: boolean
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
  private config: Required<Omit<CommitParserConfig, 'repositoryInfo' | 'scopeFilter' | 'markDependencies' | 'markSecurity' | 'template' | 'enableValidation' | 'provideSuggestions'>> & {
    repositoryInfo?: RepositoryInfo
    scopeFilter?: string[]
    markDependencies?: boolean
    markSecurity?: boolean
    template?: CommitTemplate
    enableValidation?: boolean
    provideSuggestions?: boolean
  }

  constructor(config: CommitParserConfig = {}) {
    this.config = {
      includeAllCommits: false,
      hiddenTypes: [],
      repositoryInfo: undefined,
      scopeFilter: undefined,
      markDependencies: false,
      markSecurity: false,
      template: undefined,
      enableValidation: false,
      provideSuggestions: false,
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

  /**
   * 验证提交消息
   */
  validate(commitMessage: string): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // 使用自定义模板或默认正则
    const pattern = this.config.template?.pattern || COMMIT_REGEX
    const match = commitMessage.match(pattern)

    // 格式验证
    if (!match) {
      errors.push({
        type: 'format',
        message: 'Commit message does not match the required format',
        expected: 'type(scope): subject',
        actual: commitMessage,
      })

      if (this.config.provideSuggestions) {
        suggestions.push('Use format: type(scope): subject')
        suggestions.push('Example: feat(auth): add user login')
      }

      return { valid: false, errors, warnings, suggestions }
    }

    const type = match[1]
    const scope = match[2]
    const subject = match[3]

    // 类型验证
    if (this.config.template?.allowedTypes && !this.config.template.allowedTypes.includes(type)) {
      errors.push({
        type: 'type',
        message: `Invalid commit type: ${type}`,
        expected: this.config.template.allowedTypes.join(', '),
        actual: type,
      })

      if (this.config.provideSuggestions) {
        const suggestion = this.findClosestMatch(type, this.config.template.allowedTypes)
        if (suggestion) {
          suggestions.push(`Did you mean '${suggestion}'?`)
        }
      }
    }

    // Scope 验证
    if (this.config.template?.allowedScopes && scope && !this.config.template.allowedScopes.includes(scope)) {
      errors.push({
        type: 'scope',
        message: `Invalid scope: ${scope}`,
        expected: this.config.template.allowedScopes.join(', '),
        actual: scope,
      })

      if (this.config.provideSuggestions) {
        const suggestion = this.findClosestMatch(scope, this.config.template.allowedScopes)
        if (suggestion) {
          suggestions.push(`Did you mean '${suggestion}'?`)
        }
      }
    }

    // Scope 必需验证
    if (this.config.template?.requireScope && !scope) {
      errors.push({
        type: 'scope',
        message: 'Scope is required but missing',
        expected: 'type(scope): subject',
        actual: commitMessage,
      })

      if (this.config.provideSuggestions) {
        suggestions.push('Add a scope to your commit message')
        suggestions.push(`Example: ${type}(scope): ${subject}`)
      }
    }

    // 主题长度验证
    const maxLength = this.config.template?.maxSubjectLength || 72
    if (subject && subject.length > maxLength) {
      errors.push({
        type: 'length',
        message: `Subject is too long: ${subject.length} characters (max: ${maxLength})`,
        expected: `<= ${maxLength} characters`,
        actual: `${subject.length} characters`,
      })

      if (this.config.provideSuggestions) {
        suggestions.push(`Shorten the subject to ${maxLength} characters or less`)
        suggestions.push(`Current: ${subject.substring(0, 50)}...`)
      }
    }

    // 自定义验证
    if (this.config.template?.customValidation) {
      const customResult = this.config.template.customValidation(commitMessage)
      if (!customResult.valid) {
        errors.push(...(customResult.errors || []))
        warnings.push(...(customResult.warnings || []))
        suggestions.push(...(customResult.suggestions || []))
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  /**
   * 查找最接近的匹配（用于建议）
   */
  private findClosestMatch(input: string, options: string[]): string | undefined {
    if (options.length === 0) return undefined

    let minDistance = Infinity
    let closest: string | undefined

    for (const option of options) {
      const distance = this.levenshteinDistance(input.toLowerCase(), option.toLowerCase())
      if (distance < minDistance) {
        minDistance = distance
        closest = option
      }
    }

    // 只在距离较小时返回建议
    return minDistance <= 3 ? closest : undefined
  }

  /**
   * 计算 Levenshtein 距离（编辑距离）
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    return matrix[b.length][a.length]
  }

  /**
   * 生成修复建议
   */
  generateFixSuggestions(commitMessage: string): string[] {
    const suggestions: string[] = []
    const validation = this.validate(commitMessage)

    if (validation.valid) {
      return ['Commit message is valid']
    }

    // 基于错误类型生成建议
    if (validation.errors) {
      for (const error of validation.errors) {
        switch (error.type) {
          case 'format':
            suggestions.push('Fix format: Use "type(scope): subject" pattern')
            suggestions.push('Common types: feat, fix, docs, style, refactor, test, chore')
            break
          case 'type':
            if (error.expected) {
              suggestions.push(`Use one of these types: ${error.expected}`)
            }
            break
          case 'scope':
            if (error.expected && error.message.includes('Invalid scope')) {
              suggestions.push(`Use one of these scopes: ${error.expected}`)
            } else if (error.message.includes('required')) {
              suggestions.push('Add a scope in parentheses after the type')
            }
            break
          case 'length':
            suggestions.push('Shorten the subject line')
            suggestions.push('Move details to the commit body')
            break
        }
      }
    }

    // 添加验证结果中的建议
    if (validation.suggestions) {
      suggestions.push(...validation.suggestions)
    }

    return suggestions
  }
}

/**
 * 创建 Commit 解析器
 */
export function createCommitParser(config?: CommitParserConfig): CommitParser {
  return new CommitParser(config)
}

