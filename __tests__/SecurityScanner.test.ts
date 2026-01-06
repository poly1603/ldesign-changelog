/**
 * SecurityScanner 测试
 * Feature: changelog-enhancement, Property 2: Security Issue Identification
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { SecurityScanner } from '../src/core/SecurityScanner'
import type { SecurityIssue, SecuritySeverity } from '../src/core/SecurityScanner'
import type { ChangelogCommit } from '../src/types/changelog'

/**
 * 生成随机的安全关键词
 */
const securityKeywordArbitrary = fc.constantFrom(
  'security',
  'vulnerability',
  'cve',
  'xss',
  'csrf',
  'sql injection',
  'injection',
  'exploit',
  'attack',
  'malicious'
)

/**
 * 生成随机的严重性关键词
 */
const severityKeywordArbitrary = fc.record({
  severity: fc.constantFrom<SecuritySeverity>('critical', 'high', 'medium', 'low'),
  keyword: fc.oneof(
    fc.constantFrom('critical', 'severe', 'urgent'),
    fc.constantFrom('high', 'important', 'dangerous'),
    fc.constantFrom('medium', 'moderate', 'warning'),
    fc.constantFrom('low', 'minor', 'info')
  ),
})

/**
 * 生成随机的 CVE ID
 */
const cveIdArbitrary = fc.tuple(
  fc.integer({ min: 1999, max: 2024 }),
  fc.integer({ min: 1000, max: 99999 })
).map(([year, num]) => `CVE-${year}-${num}`)

/**
 * 生成随机的提交
 */
const commitArbitrary = fc.record({
  hash: fc.string({ minLength: 40, maxLength: 40 }).map(s =>
    s.split('').map(c => '0123456789abcdef'[c.charCodeAt(0) % 16]).join('')
  ),
  shortHash: fc.string({ minLength: 7, maxLength: 7 }).map(s =>
    s.split('').map(c => '0123456789abcdef'[c.charCodeAt(0) % 16]).join('')
  ),
  type: fc.constantFrom('fix', 'feat', 'chore', 'docs', 'refactor'),
  scope: fc.option(fc.constantFrom('auth', 'api', 'core', 'ui', 'deps'), { nil: undefined }),
  subject: fc.string({ minLength: 10, maxLength: 100 }),
  body: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
  author: fc.record({
    name: fc.string({ minLength: 3, maxLength: 30 }),
    email: fc.emailAddress(),
  }),
  date: fc.date().map(d => d.toISOString()),
})

/**
 * 生成包含安全关键词的提交
 */
const securityCommitArbitrary = fc.tuple(
  commitArbitrary,
  securityKeywordArbitrary,
  fc.option(cveIdArbitrary, { nil: undefined }),
  fc.option(severityKeywordArbitrary, { nil: undefined })
).map(([commit, keyword, cveId, severityInfo]) => {
  // 将关键词插入到 subject 或 body 中
  const insertInSubject = Math.random() > 0.5

  let subject = commit.subject
  let body = commit.body || ''

  if (insertInSubject) {
    subject = `${keyword} ${subject}`
  } else {
    body = `${keyword} ${body}`
  }

  // 添加 CVE ID（如果有）
  if (cveId) {
    subject = `${subject} ${cveId}`
  }

  // 添加严重性关键词（如果有）
  if (severityInfo) {
    body = `${severityInfo.keyword} ${body}`
  }

  return {
    commit: {
      ...commit,
      subject,
      body: body || undefined,
    } as ChangelogCommit,
    expectedKeyword: keyword,
    expectedCveId: cveId,
    expectedSeverity: severityInfo?.severity,
  }
})

describe('SecurityScanner', () => {
  describe('Unit Tests', () => {
    it('应该正确创建 SecurityScanner 实例', () => {
      const scanner = new SecurityScanner()
      expect(scanner).toBeDefined()
    })

    it('应该接受自定义配置', () => {
      const scanner = new SecurityScanner({
        keywords: ['custom-keyword'],
        fetchCveDetails: true,
      })
      expect(scanner).toBeDefined()
    })

    it('应该检测包含 security 关键词的提交', async () => {
      const scanner = new SecurityScanner()
      const commit: ChangelogCommit = {
        hash: 'abc123',
        shortHash: 'abc123',
        type: 'fix',
        subject: 'Fix security vulnerability in auth module',
        author: {
          name: 'Test User',
          email: 'test@example.com',
        },
        date: '2024-01-01',
      }

      const issues = await scanner.scan([commit])
      expect(issues).toHaveLength(1)
      expect(issues[0].commitHash).toBe('abc123')
      expect(issues[0].type).toBe('fix')
    })

    it('应该提取 CVE ID', async () => {
      const scanner = new SecurityScanner()
      const commit: ChangelogCommit = {
        hash: 'def456',
        shortHash: 'def456',
        type: 'fix',
        subject: 'Fix CVE-2024-1234 vulnerability',
        author: {
          name: 'Test User',
          email: 'test@example.com',
        },
        date: '2024-01-01',
      }

      const issues = await scanner.scan([commit])
      expect(issues).toHaveLength(1)
      expect(issues[0].cveId).toBe('CVE-2024-1234')
      expect(issues[0].cveLink).toContain('CVE-2024-1234')
    })

    it('应该正确识别严重性级别', async () => {
      const scanner = new SecurityScanner()

      const criticalCommit: ChangelogCommit = {
        hash: 'critical1',
        shortHash: 'critical',
        type: 'fix',
        subject: 'Fix critical security issue',
        author: { name: 'Test', email: 'test@example.com' },
        date: '2024-01-01',
      }

      const issues = await scanner.scan([criticalCommit])
      expect(issues).toHaveLength(1)
      expect(issues[0].severity).toBe('critical')
    })

    it('应该生成安全报告', async () => {
      const scanner = new SecurityScanner()
      const commits: ChangelogCommit[] = [
        {
          hash: 'hash1',
          shortHash: 'hash1',
          type: 'fix',
          subject: 'Fix critical security vulnerability',
          author: { name: 'Test', email: 'test@example.com' },
          date: '2024-01-01',
        },
        {
          hash: 'hash2',
          shortHash: 'hash2',
          type: 'fix',
          subject: 'Fix low security issue',
          author: { name: 'Test', email: 'test@example.com' },
          date: '2024-01-01',
        },
      ]

      const issues = await scanner.scan(commits)
      const report = scanner.generateReport(issues)

      expect(report.total).toBe(2)
      expect(report.hasCritical).toBe(true)
      expect(report.bySeverity.critical.length).toBeGreaterThan(0)
    })

    it('应该跳过不包含安全关键词的提交', async () => {
      const scanner = new SecurityScanner()
      const commit: ChangelogCommit = {
        hash: 'normal1',
        shortHash: 'normal1',
        type: 'feat',
        subject: 'Add new feature',
        author: { name: 'Test', email: 'test@example.com' },
        date: '2024-01-01',
      }

      const issues = await scanner.scan([commit])
      expect(issues).toHaveLength(0)
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Property 2: Security Issue Identification
     * Validates: Requirements 2.1, 2.2
     *
     * For any commit message containing security-related keywords,
     * the SecurityScanner SHALL identify it as a security-related commit
     * and assign appropriate severity.
     */
    it('Property 2: 应该识别所有包含安全关键词的提交', async () => {
      await fc.assert(
        fc.asyncProperty(
          securityCommitArbitrary,
          async ({ commit, expectedKeyword, expectedCveId, expectedSeverity }) => {
            const scanner = new SecurityScanner()
            const issues = await scanner.scan([commit])

            // 验证：包含安全关键词的提交应该被识别
            expect(issues.length).toBeGreaterThan(0)

            const issue = issues[0]

            // 验证：提交 hash 正确
            expect(issue.commitHash).toBe(commit.hash)

            // 验证：如果有 CVE ID，应该被提取
            if (expectedCveId) {
              expect(issue.cveId).toBe(expectedCveId)
              expect(issue.cveLink).toContain(expectedCveId)
              expect(issue.type).toBe('vulnerability')
            }

            // 验证：严重性级别应该被正确分配
            expect(issue.severity).toBeDefined()
            expect(['critical', 'high', 'medium', 'low']).toContain(issue.severity)

            // 如果指定了严重性关键词，验证严重性级别
            if (expectedSeverity) {
              expect(issue.severity).toBe(expectedSeverity)
            }

            // 验证：问题类型应该是有效的
            expect(['fix', 'vulnerability', 'advisory']).toContain(issue.type)

            // 验证：描述应该是提交的 subject
            expect(issue.description).toBe(commit.subject)

            // 验证：如果有 scope，应该作为受影响的组件
            if (commit.scope) {
              expect(issue.affectedComponent).toBe(commit.scope)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 2.1: CVE ID 提取正确性
     * Validates: Requirements 2.1
     */
    it('Property 2.1: 应该正确提取所有 CVE ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(commitArbitrary, cveIdArbitrary),
          async ([commit, cveId]) => {
            // 将 CVE ID 插入到提交中
            const modifiedCommit: ChangelogCommit = {
              ...commit,
              subject: `${commit.subject} ${cveId} security fix`,
            }

            const scanner = new SecurityScanner()
            const issues = await scanner.scan([modifiedCommit])

            // 验证：应该检测到安全问题
            expect(issues.length).toBeGreaterThan(0)

            const issue = issues[0]

            // 验证：CVE ID 应该被正确提取
            expect(issue.cveId).toBe(cveId)

            // 验证：CVE 链接应该包含 CVE ID
            expect(issue.cveLink).toContain(cveId)

            // 验证：类型应该是 vulnerability
            expect(issue.type).toBe('vulnerability')

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 2.2: 严重性分级正确性
     * Validates: Requirements 2.2
     */
    it('Property 2.2: 应该根据关键词正确分配严重性级别', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(commitArbitrary, severityKeywordArbitrary),
          async ([commit, { severity, keyword }]) => {
            // 将严重性关键词和安全关键词插入到提交中
            const modifiedCommit: ChangelogCommit = {
              ...commit,
              subject: `security fix`,
              body: `${keyword} vulnerability detected`,
            }

            const scanner = new SecurityScanner()
            const issues = await scanner.scan([modifiedCommit])

            // 验证：应该检测到安全问题
            expect(issues.length).toBeGreaterThan(0)

            const issue = issues[0]

            // 验证：严重性级别应该匹配
            expect(issue.severity).toBe(severity)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 2.3: 安全报告生成正确性
     * Validates: Requirements 2.2
     */
    it('Property 2.3: 应该生成正确的安全报告', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(securityCommitArbitrary, { minLength: 1, maxLength: 10 }),
          async (securityCommits) => {
            const commits = securityCommits.map(sc => sc.commit)
            const scanner = new SecurityScanner()
            const issues = await scanner.scan(commits)
            const report = scanner.generateReport(issues)

            // 验证：总数应该等于问题数量
            expect(report.total).toBe(issues.length)

            // 验证：所有问题都应该在报告中
            expect(report.issues).toEqual(issues)

            // 验证：按严重性分组应该包含所有问题
            const totalBySeverity =
              report.bySeverity.critical.length +
              report.bySeverity.high.length +
              report.bySeverity.medium.length +
              report.bySeverity.low.length
            expect(totalBySeverity).toBe(issues.length)

            // 验证：按类型分组应该包含所有问题
            const totalByType =
              report.byType.fix.length +
              report.byType.vulnerability.length +
              report.byType.advisory.length
            expect(totalByType).toBe(issues.length)

            // 验证：hasCritical 标志应该正确
            const hasCriticalOrHigh =
              report.bySeverity.critical.length > 0 ||
              report.bySeverity.high.length > 0
            expect(report.hasCritical).toBe(hasCriticalOrHigh)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 2.4: 非安全提交应该被跳过
     */
    it('Property 2.4: 应该跳过不包含安全关键词的提交', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            commitArbitrary.filter(commit => {
              const text = `${commit.subject} ${commit.body || ''}`.toLowerCase()
              const securityKeywords = [
                'security', 'vulnerability', 'cve', 'xss', 'csrf',
                'injection', 'exploit', 'attack', 'malicious'
              ]
              return !securityKeywords.some(kw => text.includes(kw))
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (commits) => {
            const scanner = new SecurityScanner()
            const issues = await scanner.scan(commits)

            // 验证：不包含安全关键词的提交不应该被识别为安全问题
            expect(issues).toHaveLength(0)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
