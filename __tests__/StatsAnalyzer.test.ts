/**
 * StatsAnalyzer 测试
 */

import { describe, it, expect } from 'vitest'
import { StatsAnalyzer } from '../src/core/StatsAnalyzer'
import type { ChangelogCommit } from '../src/types/changelog'

describe('StatsAnalyzer', () => {
  const mockCommits: ChangelogCommit[] = [
    {
      hash: 'abc123',
      shortHash: 'abc123',
      type: 'feat',
      subject: 'add feature',
      author: { name: 'Alice', email: 'alice@example.com' },
      date: '2025-01-01',
    },
    {
      hash: 'def456',
      shortHash: 'def456',
      type: 'fix',
      subject: 'fix bug',
      author: { name: 'Bob', email: 'bob@example.com' },
      date: '2025-01-02',
    },
    {
      hash: 'ghi789',
      shortHash: 'ghi789',
      type: 'feat',
      subject: 'another feature',
      author: { name: 'Alice', email: 'alice@example.com' },
      date: '2025-01-03',
    },
  ]

  it('应该正确统计总提交数', () => {
    const analyzer = new StatsAnalyzer()
    const stats = analyzer.analyze(mockCommits)

    expect(stats.totalCommits).toBe(3)
  })

  it('应该按类型正确统计', () => {
    const analyzer = new StatsAnalyzer()
    const stats = analyzer.analyze(mockCommits)

    expect(stats.byType).toHaveLength(2)

    const featStats = stats.byType.find(s => s.type === 'feat')
    const fixStats = stats.byType.find(s => s.type === 'fix')

    expect(featStats?.count).toBe(2)
    expect(fixStats?.count).toBe(1)
  })

  it('应该计算正确的百分比', () => {
    const analyzer = new StatsAnalyzer({ calculatePercentage: true })
    const stats = analyzer.analyze(mockCommits)

    const featStats = stats.byType.find(s => s.type === 'feat')
    expect(featStats?.percentage).toBeCloseTo(66.67, 1)
  })

  it('应该正确统计贡献者', () => {
    const analyzer = new StatsAnalyzer()
    const stats = analyzer.analyze(mockCommits)

    expect(stats.contributors).toHaveLength(2)

    const alice = stats.contributors.find(c => c.name === 'Alice')
    const bob = stats.contributors.find(c => c.name === 'Bob')

    expect(alice?.commitCount).toBe(2)
    expect(bob?.commitCount).toBe(1)
  })

  it('应该按提交数降序排列贡献者', () => {
    const analyzer = new StatsAnalyzer()
    const stats = analyzer.analyze(mockCommits)

    expect(stats.contributors[0].name).toBe('Alice')
    expect(stats.contributors[1].name).toBe('Bob')
  })

  it('应该计算频率统计', () => {
    const analyzer = new StatsAnalyzer({ analyzeFrequency: true })
    const stats = analyzer.analyze(mockCommits)

    expect(stats.frequency.durationDays).toBeGreaterThan(0)
    expect(stats.frequency.commitsPerDay).toBeGreaterThan(0)
    expect(stats.frequency.commitsPerWeek).toBeGreaterThan(0)
  })

  it('应该统计 Issue 和 PR 引用', () => {
    const commitsWithRefs: ChangelogCommit[] = [
      { ...mockCommits[0], pr: '1', issues: ['10', '11'] },
      { ...mockCommits[1], pr: '2', issues: ['12'] },
    ]

    const analyzer = new StatsAnalyzer()
    const stats = analyzer.analyze(commitsWithRefs)

    expect(stats.references.prCount).toBe(2)
    expect(stats.references.issueCount).toBe(3)
  })
})

