/**
 * 提交消息验证器（Commit Linter）
 */

import type { GitCommit } from '../types/changelog.js'
import { getGitCommits } from '../utils/git-utils.js'

/**
 * 提交验证结果
 */
export interface CommitLintResult {
  /** 是否通过 */
  passed: boolean

  /** 总提交数 */
  totalCommits: number

  /** 有效提交数 */
  validCommits: number

  /** 无效提交数 */
  invalidCommits: number

  /** 问题列表 */
  issues: CommitIssue[]

  /** 统计信息 */
  stats: {
    byType: Record<string, number>
    withScope: number
    withBody: number
    withBreakingChange: number
  }
}

/**
 * 提交问题
 */
export interface CommitIssue {
  /** 提交 hash */
  hash: string

  /** 提交主题 */
  subject: string

  /** 问题类型 */
  type: 'missing_type' | 'invalid_type' | 'missing_subject' | 'subject_too_long' | 'invalid_format' | 'uppercase_subject'

  /** 问题描述 */
  message: string

  /** 严重程度 */
  severity: 'error' | 'warning'

  /** 建议修复 */
  suggestion?: string
}

/**
 * Lint 配置
 */
export interface CommitLintConfig {
  /** 允许的提交类型 */
  types?: string[]

  /** 主题最大长度 */
  maxSubjectLength?: number

  /** 是否要求 scope */
  requireScope?: boolean

  /** 是否允许大写主题 */
  allowUpperCase?: boolean

  /** 自定义规则 */
  customRules?: Array<(commit: GitCommit) => CommitIssue | null>
}

/**
 * 提交消息验证器
 */
export class CommitLinter {
  private config: Required<Omit<CommitLintConfig, 'customRules'>> & {
    customRules?: CommitLintConfig['customRules']
  }

  private issues: CommitIssue[] = []
  private stats = {
    byType: {} as Record<string, number>,
    withScope: 0,
    withBody: 0,
    withBreakingChange: 0,
  }

  constructor(config: CommitLintConfig = {}) {
    this.config = {
      types: config.types || [
        'feat', 'fix', 'docs', 'style', 'refactor',
        'perf', 'test', 'build', 'ci', 'chore', 'revert',
      ],
      maxSubjectLength: config.maxSubjectLength || 72,
      requireScope: config.requireScope || false,
      allowUpperCase: config.allowUpperCase || false,
      customRules: config.customRules,
    }
  }

  /**
   * 验证提交范围
   */
  async lintRange(from?: string, to = 'HEAD', cwd?: string): Promise<CommitLintResult> {
    const commits = await getGitCommits(from, to, cwd)
    return this.lintCommits(commits)
  }

  /**
   * 验证提交列表
   */
  lintCommits(commits: GitCommit[]): CommitLintResult {
    this.issues = []
    this.stats = {
      byType: {},
      withScope: 0,
      withBody: 0,
      withBreakingChange: 0,
    }

    let validCount = 0

    for (const commit of commits) {
      const hasIssue = this.lintCommit(commit)
      if (!hasIssue) {
        validCount++
      }
    }

    return {
      passed: this.issues.length === 0,
      totalCommits: commits.length,
      validCommits: validCount,
      invalidCommits: commits.length - validCount,
      issues: this.issues,
      stats: this.stats,
    }
  }

  /**
   * 验证单个提交
   */
  private lintCommit(commit: GitCommit): boolean {
    const { subject, body } = commit
    let hasIssue = false

    // 解析提交消息格式: type(scope): subject
    const pattern = /^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/
    const match = subject.match(pattern)

    if (!match) {
      this.addIssue(commit, 'invalid_format', '提交消息格式不符合 Conventional Commits 规范', 'error', {
        suggestion: 'type(scope): subject',
      })
      return true
    }

    const [, type, scope, subjectText] = match

    // 验证 type
    if (!this.config.types.includes(type)) {
      this.addIssue(commit, 'invalid_type', `无效的提交类型: ${type}`, 'error', {
        suggestion: `使用以下类型之一: ${this.config.types.join(', ')}`,
      })
      hasIssue = true
    } else {
      // 统计类型
      this.stats.byType[type] = (this.stats.byType[type] || 0) + 1
    }

    // 验证 scope
    if (scope) {
      this.stats.withScope++
    } else if (this.config.requireScope) {
      this.addIssue(commit, 'missing_subject', '缺少 scope', 'warning')
      hasIssue = true
    }

    // 验证 subject
    if (!subjectText || subjectText.trim().length === 0) {
      this.addIssue(commit, 'missing_subject', '缺少提交主题', 'error')
      hasIssue = true
    } else {
      // 检查长度
      if (subjectText.length > this.config.maxSubjectLength) {
        this.addIssue(
          commit,
          'subject_too_long',
          `提交主题过长 (${subjectText.length} > ${this.config.maxSubjectLength})`,
          'warning',
          {
            suggestion: '建议将详细信息放在 body 中',
          }
        )
        hasIssue = true
      }

      // 检查大写
      if (!this.config.allowUpperCase && /^[A-Z]/.test(subjectText)) {
        this.addIssue(
          commit,
          'uppercase_subject',
          '提交主题不应以大写字母开头',
          'warning',
          {
            suggestion: subjectText.charAt(0).toLowerCase() + subjectText.slice(1),
          }
        )
        hasIssue = true
      }
    }

    // 统计 body
    if (body && body.trim().length > 0) {
      this.stats.withBody++

      // 检查 Breaking Changes
      if (body.includes('BREAKING CHANGE:') || body.includes('BREAKING-CHANGE:')) {
        this.stats.withBreakingChange++
      }
    }

    // 执行自定义规则
    if (this.config.customRules) {
      for (const rule of this.config.customRules) {
        const issue = rule(commit)
        if (issue) {
          this.issues.push(issue)
          hasIssue = true
        }
      }
    }

    return hasIssue
  }

  /**
   * 添加问题
   */
  private addIssue(
    commit: GitCommit,
    type: CommitIssue['type'],
    message: string,
    severity: CommitIssue['severity'],
    extra?: { suggestion?: string }
  ): void {
    this.issues.push({
      hash: commit.shortHash,
      subject: commit.subject,
      type,
      message,
      severity,
      suggestion: extra?.suggestion,
    })
  }
}

/**
 * 创建提交消息验证器
 */
export function createCommitLinter(config?: CommitLintConfig): CommitLinter {
  return new CommitLinter(config)
}
