/**
 * MarkdownFormatter 测试
 */

import { describe, it, expect } from 'vitest'
import { MarkdownFormatter } from '../src/formatters/MarkdownFormatter'
import type { ChangelogContent } from '../src/types/changelog'

describe('MarkdownFormatter', () => {
  const mockContent: ChangelogContent = {
    version: '1.0.0',
    date: '2025-01-01',
    sections: [
      {
        title: '✨ Features',
        type: 'feat',
        commits: [
          {
            hash: 'abc123',
            shortHash: 'abc123',
            type: 'feat',
            scope: 'auth',
            subject: 'add user login',
            author: { name: 'Alice', email: 'alice@example.com' },
            date: '2025-01-01',
            commitLink: 'https://github.com/test/repo/commit/abc123',
          },
        ],
      },
    ],
    commits: [],
    stats: {
      totalCommits: 1,
      commitsByType: { feat: 1 },
      contributorCount: 1,
    },
  }

  it('应该生成正确的 Markdown 格式', () => {
    const formatter = new MarkdownFormatter()
    const result = formatter.format(mockContent)

    expect(result).toContain('## [1.0.0] - 2025-01-01')
    expect(result).toContain('### ✨ Features')
    expect(result).toContain('add user login')
  })

  it('应该包含作者信息', () => {
    const formatter = new MarkdownFormatter({ includeAuthors: true })
    const result = formatter.format(mockContent)

    expect(result).toContain('@Alice')
  })

  it('应该不包含作者信息当配置为 false', () => {
    const formatter = new MarkdownFormatter({ includeAuthors: false })
    const result = formatter.format(mockContent)

    expect(result).not.toContain('@Alice')
  })

  it('应该包含 commit hash', () => {
    const formatter = new MarkdownFormatter({ includeCommitHash: true })
    const result = formatter.format(mockContent)

    expect(result).toContain('abc123')
  })

  it('应该包含统计信息', () => {
    const formatter = new MarkdownFormatter()
    const result = formatter.format(mockContent)

    expect(result).toContain('Total Commits: **1**')
    expect(result).toContain('Contributors: **1**')
  })

  it('应该包含 Breaking Changes', () => {
    const contentWithBreaking: ChangelogContent = {
      ...mockContent,
      breakingChanges: [
        {
          description: 'API changed',
          commit: mockContent.sections[0].commits[0],
        },
      ],
    }

    const formatter = new MarkdownFormatter()
    const result = formatter.format(contentWithBreaking)

    expect(result).toContain('💥 Breaking Changes')
    expect(result).toContain('API changed')
  })
})

