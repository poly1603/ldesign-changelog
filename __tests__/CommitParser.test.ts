/**
 * CommitParser 测试
 */

import { describe, it, expect } from 'vitest'
import { CommitParser } from '../src/core/CommitParser'
import type { GitCommit } from '../src/types/changelog'

describe('CommitParser', () => {
  const mockCommit: GitCommit = {
    hash: 'abc123def456',
    shortHash: 'abc123d',
    subject: 'feat(auth): add user login',
    body: 'Implemented user authentication\n\nCloses #123',
    authorName: 'John Doe',
    authorEmail: 'john@example.com',
    date: '2025-01-01',
    timestamp: 1704067200,
  }

  it('应该正确解析 Conventional Commit 格式', () => {
    const parser = new CommitParser()
    const result = parser.parseCommit(mockCommit)

    expect(result).toBeDefined()
    expect(result?.type).toBe('feat')
    expect(result?.scope).toBe('auth')
    expect(result?.subject).toBe('add user login')
  })

  it('应该提取 Issues 引用', () => {
    const parser = new CommitParser()
    const result = parser.parseCommit(mockCommit)

    expect(result?.issues).toContain('123')
  })

  it('应该识别 Breaking Change', () => {
    const commitWithBreaking: GitCommit = {
      ...mockCommit,
      body: 'BREAKING CHANGE: API endpoint changed',
    }

    const parser = new CommitParser()
    const result = parser.parseCommit(commitWithBreaking)

    expect(result?.breaking).toBe(true)
    expect(result?.breakingDescription).toBe('API endpoint changed')
  })

  it('应该跳过隐藏类型', () => {
    const parser = new CommitParser({
      hiddenTypes: ['chore'],
    })

    const choreCommit: GitCommit = {
      ...mockCommit,
      subject: 'chore: update dependencies',
    }

    const result = parser.parseCommit(choreCommit)
    expect(result).toBeNull()
  })

  it('应该按类型分组提交', () => {
    const parser = new CommitParser()

    const commits = [
      parser.parseCommit(mockCommit),
      parser.parseCommit({ ...mockCommit, subject: 'fix: bug fix' }),
      parser.parseCommit({ ...mockCommit, subject: 'feat: another feature' }),
    ].filter(Boolean)

    const groups = parser.groupByType(commits as any[])

    expect(groups.size).toBe(2)
    expect(groups.has('feat')).toBe(true)
    expect(groups.has('fix')).toBe(true)
    expect(groups.get('feat')?.length).toBe(2)
    expect(groups.get('fix')?.length).toBe(1)
  })
})

