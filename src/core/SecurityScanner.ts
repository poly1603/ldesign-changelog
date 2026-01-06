/**
 * 安全扫描器
 * 检测提交中的安全相关变更
 */

import type { ChangelogCommit } from '../types/index.js'

/**
 * 安全问题类型
 */
export type SecurityIssueType = 'fix' | 'vulnerability' | 'advisory'

/**
 * 安全严重性级别
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * 安全问题
 */
export interface SecurityIssue {
  /** 提交 hash */
  commitHash: string
  /** 问题类型 */
  type: SecurityIssueType
  /** 严重性级别 */
  severity: SecuritySeverity
  /** CVE ID */
  cveId?: string
  /** 描述 */
  description: string
  /** 受影响的组件 */
  affectedComponent?: string
  /** CVE 链接 */
  cveLink?: string
}

/**
 * CVE 详情
 */
export interface CveDetails {
  /** CVE ID */
  id: string
  /** 描述 */
  description: string
  /** 严重性 */
  severity: SecuritySeverity
  /** CVSS 评分 */
  cvssScore?: number
  /** 发布日期 */
  publishedDate?: string
  /** 链接 */
  url: string
}

/**
 * 安全报告
 */
export interface SecurityReport {
  /** 安全问题列表 */
  issues: SecurityIssue[]
  /** 总数 */
  total: number
  /** 按严重性分组 */
  bySeverity: Record<SecuritySeverity, SecurityIssue[]>
  /** 按类型分组 */
  byType: Record<SecurityIssueType, SecurityIssue[]>
  /** 是否有高危问题 */
  hasCritical: boolean
}

/**
 * 安全扫描器配置
 */
export interface SecurityScannerOptions {
  /** 安全关键词列表 */
  keywords?: string[]
  /** CVE 模式匹配 */
  cvePattern?: RegExp
  /** 是否查询 CVE 数据库获取详情 */
  fetchCveDetails?: boolean
  /** 严重性关键词映射 */
  severityKeywords?: Record<SecuritySeverity, string[]>
}

/**
 * 默认安全关键词
 */
const DEFAULT_SECURITY_KEYWORDS = [
  'security',
  'vulnerability',
  'cve',
  'xss',
  'csrf',
  'sql injection',
  'injection',
  'exploit',
  'attack',
  'malicious',
  'dos',
  'ddos',
  'authentication',
  'authorization',
  'privilege',
  'escalation',
  'bypass',
  'leak',
  'exposure',
  'sanitize',
  'validate',
  'escape',
]

/**
 * 默认 CVE 模式
 */
const DEFAULT_CVE_PATTERN = /CVE-\d{4}-\d{4,}/gi

/**
 * 默认严重性关键词映射
 */
const DEFAULT_SEVERITY_KEYWORDS: Record<SecuritySeverity, string[]> = {
  critical: ['critical', 'severe', 'urgent', 'rce', 'remote code execution'],
  high: ['high', 'important', 'dangerous', 'exploit'],
  medium: ['medium', 'moderate', 'warning'],
  low: ['low', 'minor', 'info'],
}

/**
 * 安全扫描器
 */
export class SecurityScanner {
  private options: Required<SecurityScannerOptions>

  constructor(options: SecurityScannerOptions = {}) {
    this.options = {
      keywords: options.keywords || DEFAULT_SECURITY_KEYWORDS,
      cvePattern: options.cvePattern || DEFAULT_CVE_PATTERN,
      fetchCveDetails: options.fetchCveDetails ?? false,
      severityKeywords: options.severityKeywords || DEFAULT_SEVERITY_KEYWORDS,
    }
  }

  /**
   * 扫描提交中的安全问题
   */
  async scan(commits: ChangelogCommit[]): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = []

    for (const commit of commits) {
      const issue = await this.scanCommit(commit)
      if (issue) {
        issues.push(issue)
      }
    }

    return issues
  }

  /**
   * 扫描单个提交
   */
  private async scanCommit(commit: ChangelogCommit): Promise<SecurityIssue | null> {
    const text = this.getCommitText(commit)
    const lowerText = text.toLowerCase()

    // 检查是否包含安全关键词
    const hasSecurityKeyword = this.options.keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    )

    if (!hasSecurityKeyword) {
      return null
    }

    // 提取 CVE ID
    const cveId = this.extractCveId(text)

    // 确定问题类型
    const type = this.determineType(lowerText, cveId)

    // 确定严重性
    const severity = this.determineSeverity(lowerText)

    // 提取受影响的组件
    const affectedComponent = commit.scope

    // 生成 CVE 链接
    const cveLink = cveId ? this.generateCveLink(cveId) : undefined

    // 如果需要获取 CVE 详情
    if (cveId && this.options.fetchCveDetails) {
      const details = await this.getCveDetails(cveId)
      if (details) {
        return {
          commitHash: commit.hash,
          type,
          severity: details.severity,
          cveId,
          description: commit.subject,
          affectedComponent,
          cveLink: details.url,
        }
      }
    }

    return {
      commitHash: commit.hash,
      type,
      severity,
      cveId,
      description: commit.subject,
      affectedComponent,
      cveLink,
    }
  }

  /**
   * 获取提交的完整文本
   */
  private getCommitText(commit: ChangelogCommit): string {
    return `${commit.type} ${commit.scope || ''} ${commit.subject} ${commit.body || ''}`
  }

  /**
   * 提取 CVE ID
   */
  private extractCveId(text: string): string | undefined {
    const match = text.match(this.options.cvePattern)
    if (match && match.length > 0) {
      return match[0].toUpperCase()
    }
    return undefined
  }

  /**
   * 确定问题类型
   */
  private determineType(lowerText: string, cveId?: string): SecurityIssueType {
    if (cveId) {
      return 'vulnerability'
    }

    if (lowerText.includes('fix') || lowerText.includes('patch')) {
      return 'fix'
    }

    if (lowerText.includes('advisory') || lowerText.includes('alert')) {
      return 'advisory'
    }

    return 'fix'
  }

  /**
   * 确定严重性级别
   */
  private determineSeverity(lowerText: string): SecuritySeverity {
    // 按优先级检查（从高到低）
    for (const severity of ['critical', 'high', 'medium', 'low'] as SecuritySeverity[]) {
      const keywords = this.options.severityKeywords[severity]
      if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
        return severity
      }
    }

    // 默认为 medium
    return 'medium'
  }

  /**
   * 生成 CVE 链接
   */
  private generateCveLink(cveId: string): string {
    return `https://cve.mitre.org/cgi-bin/cvename.cgi?name=${cveId}`
  }

  /**
   * 获取 CVE 详情
   * 注意：这是一个占位实现，实际应该调用 CVE 数据库 API
   */
  async getCveDetails(cveId: string): Promise<CveDetails | null> {
    // 这里应该调用实际的 CVE API，例如 NVD API
    // 由于这需要网络请求和 API 密钥，这里只返回基本信息
    return {
      id: cveId,
      description: `Security vulnerability ${cveId}`,
      severity: 'medium',
      url: this.generateCveLink(cveId),
    }
  }

  /**
   * 生成安全报告
   */
  generateReport(issues: SecurityIssue[]): SecurityReport {
    const bySeverity: Record<SecuritySeverity, SecurityIssue[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    }

    const byType: Record<SecurityIssueType, SecurityIssue[]> = {
      fix: [],
      vulnerability: [],
      advisory: [],
    }

    for (const issue of issues) {
      bySeverity[issue.severity].push(issue)
      byType[issue.type].push(issue)
    }

    return {
      issues,
      total: issues.length,
      bySeverity,
      byType,
      hasCritical: bySeverity.critical.length > 0 || bySeverity.high.length > 0,
    }
  }

  /**
   * 设置配置
   */
  setOptions(options: Partial<SecurityScannerOptions>): void {
    this.options = { ...this.options, ...options }
  }
}

/**
 * 创建安全扫描器
 */
export function createSecurityScanner(options?: SecurityScannerOptions): SecurityScanner {
  return new SecurityScanner(options)
}
