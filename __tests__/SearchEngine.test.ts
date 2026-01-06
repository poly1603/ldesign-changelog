/**
 * SearchEngine 测试
 * Feature: changelog-enhancement, Property 10: Search and Filter Correctness
 */

import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { SearchEngine } from '../src/core/SearchEngine'
import type { SearchQuery } from '../src/core/SearchEngine'
import type { ChangelogContent, ChangelogCommit } from '../src/types/changelog'

/**
 * 生成随机的 ChangelogCommit
 */
function arbitraryChangelogCommit(): fc.Arbitrary<ChangelogCommit> {
  return fc.record({
    hash: fc.string({ minLength: 40, maxLength: 40 }).map(s =>
      s.split('').map(c => '0123456789abcdef'[c.charCodeAt(0) % 16]).join('')
    ),
    shortHash: fc.string({ minLength: 7, maxLength: 7 }).map(s =>
      s.split('').map(c => '0123456789abcdef'[c.charCodeAt(0) % 16]).join('')
    ),
    type: fc.constantFrom('feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'),
    scope: fc.option(fc.constantFrom('core', 'api', 'ui', 'cli', 'deps'), { nil: undefined }),
    subject: fc.string({ minLength: 10, maxLength: 100 }),
    body: fc.option(fc.string({ minLength: 20, maxLength: 200 }), { nil: undefined }),
    author: fc.record({
      name: fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Eve'),
      email: fc.emailAddress(),
      username: fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: undefined }),
    }),
    date: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
    pr: fc.option(fc.integer({ min: 1, max: 9999 }).map(n => `#${n}`), { nil: undefined }),
    issues: fc.option(fc.array(fc.integer({ min: 1, max: 9999 }).map(n => `#${n}`), { maxLength: 3 }), { nil: undefined }),
    breaking: fc.option(fc.boolean(), { nil: undefined }),
  })
}

/**
 * 生成随机的 ChangelogContent
 */
function arbitraryChangelogContent(): fc.Arbitrary<ChangelogContent> {
  return fc.record({
    version: fc.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+$/),
    date: fc.integer({ min: 1577836800000, max: 1735689600000 })
      .map(ts => new Date(ts).toISOString().split('T')[0]),
    sections: fc.constant([]),
    commits: fc.array(arbitraryChangelogCommit(), { minLength: 5, maxLength: 50 }),
    stats: fc.record({
      totalCommits: fc.integer({ min: 0, max: 100 }),
      commitsByType: fc.constant({}),
      contributorCount: fc.integer({ min: 1, max: 10 }),
    }),
  })
}

describe('SearchEngine', () => {
  describe('Unit Tests', () => {
    let engine: SearchEngine

    beforeEach(() => {
      engine = new SearchEngine()
    })

    it('应该正确创建 SearchEngine 实例', () => {
      expect(engine).toBeDefined()
    })

    it('应该接受自定义配置', () => {
      const customEngine = new SearchEngine({
        caseSensitive: true,
        defaultPageSize: 10,
        maxPageSize: 50,
      })
      expect(customEngine).toBeDefined()
    })

    it('应该建立索引', () => {
      const content: ChangelogContent = {
        version: '1.0.0',
        date: '2024-01-01',
        sections: [],
        commits: [
          {
            hash: 'abc123',
            shortHash: 'abc123',
            type: 'feat',
            subject: 'Add new feature',
            author: { name: 'Alice', email: 'alice@example.com' },
            date: '2024-01-01',
          },
        ],
        stats: {
          totalCommits: 1,
          commitsByType: {},
          contributorCount: 1,
        },
      }

      engine.buildIndex(content)
      const stats = engine.getIndexStats()
      expect(stats.totalEntries).toBe(1)
    })

    it('应该搜索关键词', () => {
      const content: ChangelogContent = {
        version: '1.0.0',
        date: '2024-01-01',
        sections: [],
        commits: [
          {
            hash: 'abc123',
            shortHash: 'abc123',
            type: 'feat',
            subject: 'Add new feature',
            author: { name: 'Alice', email: 'alice@example.com' },
            date: '2024-01-01',
          },
          {
            hash: 'def456',
            shortHash: 'def456',
            type: 'fix',
            subject: 'Fix bug',
            author: { name: 'Bob', email: 'bob@example.com' },
            date: '2024-01-02',
          },
        ],
        stats: {
          totalCommits: 2,
          commitsByType: {},
          contributorCount: 2,
        },
      }

      engine.buildIndex(content)

      const result = engine.search({ keyword: 'feature' })
      expect(result.total).toBe(1)
      expect(result.entries[0].subject).toContain('feature')
    })

    it('应该按类型过滤', () => {
      const content: ChangelogContent = {
        version: '1.0.0',
        date: '2024-01-01',
        sections: [],
        commits: [
          {
            hash: 'abc123',
            shortHash: 'abc123',
            type: 'feat',
            subject: 'Add feature',
            author: { name: 'Alice', email: 'alice@example.com' },
            date: '2024-01-01',
          },
          {
            hash: 'def456',
            shortHash: 'def456',
            type: 'fix',
            subject: 'Fix bug',
            author: { name: 'Bob', email: 'bob@example.com' },
            date: '2024-01-02',
          },
        ],
        stats: {
          totalCommits: 2,
          commitsByType: {},
          contributorCount: 2,
        },
      }

      engine.buildIndex(content)

      const result = engine.search({ types: ['feat'] })
      expect(result.total).toBe(1)
      expect(result.entries[0].type).toBe('feat')
    })

    it('应该分页', () => {
      const commits: ChangelogCommit[] = []
      for (let i = 0; i < 25; i++) {
        commits.push({
          hash: `hash${i}`,
          shortHash: `hash${i}`,
          type: 'feat',
          subject: `Feature ${i}`,
          author: { name: 'Alice', email: 'alice@example.com' },
          date: '2024-01-01',
        })
      }

      const content: ChangelogContent = {
        version: '1.0.0',
        date: '2024-01-01',
        sections: [],
        commits,
        stats: {
          totalCommits: 25,
          commitsByType: {},
          contributorCount: 1,
        },
      }

      engine.buildIndex(content)

      const page1 = engine.search({ pagination: { page: 1, pageSize: 10 } })
      expect(page1.entries.length).toBe(10)
      expect(page1.hasMore).toBe(true)

      const page2 = engine.search({ pagination: { page: 2, pageSize: 10 } })
      expect(page2.entries.length).toBe(10)
      expect(page2.hasMore).toBe(true)

      const page3 = engine.search({ pagination: { page: 3, pageSize: 10 } })
      expect(page3.entries.length).toBe(5)
      expect(page3.hasMore).toBe(false)
    })

    it('应该排序', () => {
      const content: ChangelogContent = {
        version: '1.0.0',
        date: '2024-01-01',
        sections: [],
        commits: [
          {
            hash: 'abc123',
            shortHash: 'abc123',
            type: 'feat',
            subject: 'Feature A',
            author: { name: 'Alice', email: 'alice@example.com' },
            date: '2024-01-03',
          },
          {
            hash: 'def456',
            shortHash: 'def456',
            type: 'fix',
            subject: 'Fix B',
            author: { name: 'Bob', email: 'bob@example.com' },
            date: '2024-01-01',
          },
          {
            hash: 'ghi789',
            shortHash: 'ghi789',
            type: 'docs',
            subject: 'Docs C',
            author: { name: 'Charlie', email: 'charlie@example.com' },
            date: '2024-01-02',
          },
        ],
        stats: {
          totalCommits: 3,
          commitsByType: {},
          contributorCount: 3,
        },
      }

      engine.buildIndex(content)

      // 按日期升序
      const ascResult = engine.search({ sortBy: 'date', sortOrder: 'asc' })
      expect(ascResult.entries[0].date).toBe('2024-01-01')
      expect(ascResult.entries[2].date).toBe('2024-01-03')

      // 按日期降序
      const descResult = engine.search({ sortBy: 'date', sortOrder: 'desc' })
      expect(descResult.entries[0].date).toBe('2024-01-03')
      expect(descResult.entries[2].date).toBe('2024-01-01')
    })

    it('应该提供搜索建议', () => {
      const content: ChangelogContent = {
        version: '1.0.0',
        date: '2024-01-01',
        sections: [],
        commits: [
          {
            hash: 'abc123',
            shortHash: 'abc123',
            type: 'feat',
            subject: 'Add authentication feature',
            author: { name: 'Alice', email: 'alice@example.com' },
            date: '2024-01-01',
          },
          {
            hash: 'def456',
            shortHash: 'def456',
            type: 'feat',
            subject: 'Add authorization module',
            author: { name: 'Bob', email: 'bob@example.com' },
            date: '2024-01-02',
          },
        ],
        stats: {
          totalCommits: 2,
          commitsByType: {},
          contributorCount: 2,
        },
      }

      engine.buildIndex(content)

      const suggestions = engine.getSuggestions('auth')
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.toLowerCase().includes('auth'))).toBe(true)
    })

    it('应该高亮匹配文本', () => {
      const text = 'This is a test string with test keyword'
      const highlighted = engine.highlight(text, 'test')
      expect(highlighted).toContain('**test**')
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Property 10: Search and Filter Correctness
     * Validates: Requirements 11.1, 11.2, 11.3, 11.5, 11.6
     *
     * For any search query with filters (keyword, version range, date range, type, scope):
     * - All returned entries SHALL match ALL specified filter criteria
     * - Results SHALL be sorted according to the specified sort option
     * - Pagination SHALL return correct subsets with accurate total count
     */
    it('Property 10: 所有返回的条目应该匹配所有指定的过滤条件', () => {
      fc.assert(
        fc.property(
          arbitraryChangelogContent(),
          fc.record({
            keyword: fc.option(fc.string({ minLength: 3, maxLength: 10 }), { nil: undefined }),
            types: fc.option(
              fc.array(fc.constantFrom('feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'), {
                minLength: 1,
                maxLength: 3,
              }),
              { nil: undefined }
            ),
            scopes: fc.option(
              fc.array(fc.constantFrom('core', 'api', 'ui', 'cli', 'deps'), {
                minLength: 1,
                maxLength: 2,
              }),
              { nil: undefined }
            ),
            authors: fc.option(
              fc.array(fc.constantFrom('Alice', 'Bob', 'Charlie', 'David', 'Eve'), {
                minLength: 1,
                maxLength: 2,
              }),
              { nil: undefined }
            ),
            sortBy: fc.option(fc.constantFrom('date', 'type', 'relevance'), { nil: undefined }),
            sortOrder: fc.option(fc.constantFrom('asc', 'desc'), { nil: undefined }),
            pagination: fc.option(
              fc.record({
                page: fc.integer({ min: 1, max: 5 }),
                pageSize: fc.integer({ min: 5, max: 20 }),
              }),
              { nil: undefined }
            ),
          }),
          (content, query) => {
            const engine = new SearchEngine()
            engine.buildIndex(content)

            const result = engine.search(query as SearchQuery)

            // 验证：所有返回的条目都匹配关键词过滤
            if (query.keyword) {
              for (const entry of result.entries) {
                const searchText = [
                  entry.subject,
                  entry.body || '',
                  entry.type,
                  entry.scope || '',
                  entry.author.name,
                  entry.author.email,
                ].join(' ').toLowerCase()

                expect(searchText).toContain(query.keyword.toLowerCase())
              }
            }

            // 验证：所有返回的条目都匹配类型过滤
            if (query.types && query.types.length > 0) {
              for (const entry of result.entries) {
                expect(query.types).toContain(entry.type)
              }
            }

            // 验证：所有返回的条目都匹配作用域过滤
            if (query.scopes && query.scopes.length > 0) {
              for (const entry of result.entries) {
                if (entry.scope) {
                  expect(query.scopes).toContain(entry.scope)
                }
              }
            }

            // 验证：所有返回的条目都匹配作者过滤
            if (query.authors && query.authors.length > 0) {
              for (const entry of result.entries) {
                const matchesAuthor = query.authors.some(
                  author => entry.author.name === author || entry.author.email === author
                )
                expect(matchesAuthor).toBe(true)
              }
            }

            // 验证：排序正确性
            if (query.sortBy === 'date' && result.entries.length > 1) {
              for (let i = 0; i < result.entries.length - 1; i++) {
                const dateA = new Date(result.entries[i].date).getTime()
                const dateB = new Date(result.entries[i + 1].date).getTime()

                if (query.sortOrder === 'asc') {
                  expect(dateA).toBeLessThanOrEqual(dateB)
                } else {
                  expect(dateA).toBeGreaterThanOrEqual(dateB)
                }
              }
            }

            if (query.sortBy === 'type' && result.entries.length > 1) {
              for (let i = 0; i < result.entries.length - 1; i++) {
                const typeA = result.entries[i].type
                const typeB = result.entries[i + 1].type

                if (query.sortOrder === 'asc') {
                  expect(typeA.localeCompare(typeB)).toBeLessThanOrEqual(0)
                } else {
                  expect(typeA.localeCompare(typeB)).toBeGreaterThanOrEqual(0)
                }
              }
            }

            // 验证：分页正确性
            if (query.pagination) {
              const { page, pageSize } = query.pagination
              expect(result.page).toBe(page)
              expect(result.pageSize).toBe(pageSize)
              expect(result.entries.length).toBeLessThanOrEqual(pageSize)

              // 验证 hasMore 标志
              const expectedHasMore = (page * pageSize) < result.total
              expect(result.hasMore).toBe(expectedHasMore)
            }

            // 验证：总数正确
            expect(result.total).toBeGreaterThanOrEqual(result.entries.length)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 10.1: 关键词搜索应该不区分大小写（默认）
     */
    it('Property 10.1: 关键词搜索应该不区分大小写', () => {
      fc.assert(
        fc.property(
          arbitraryChangelogContent(),
          fc.string({ minLength: 3, maxLength: 10 }),
          (content, keyword) => {
            // 确保至少有一个提交包含关键词
            if (content.commits.length > 0) {
              content.commits[0].subject = `Test ${keyword} feature`
            }

            const engine = new SearchEngine({ caseSensitive: false })
            engine.buildIndex(content)

            // 使用小写搜索
            const lowerResult = engine.search({ keyword: keyword.toLowerCase() })

            // 使用大写搜索
            const upperResult = engine.search({ keyword: keyword.toUpperCase() })

            // 两者应该返回相同的结果
            expect(lowerResult.total).toBe(upperResult.total)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 10.2: 空查询应该返回所有条目
     */
    it('Property 10.2: 空查询应该返回所有条目（受分页限制）', () => {
      fc.assert(
        fc.property(
          arbitraryChangelogContent(),
          (content) => {
            const engine = new SearchEngine()
            engine.buildIndex(content)

            const result = engine.search({})

            // 总数应该等于所有提交数
            expect(result.total).toBe(content.commits.length)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 10.3: 多个过滤条件应该是 AND 关系
     */
    it('Property 10.3: 多个过滤条件应该是 AND 关系', () => {
      fc.assert(
        fc.property(
          arbitraryChangelogContent(),
          fc.constantFrom('feat', 'fix', 'docs'),
          fc.constantFrom('Alice', 'Bob', 'Charlie'),
          (content, type, author) => {
            // 确保至少有一个提交同时匹配类型和作者
            if (content.commits.length > 0) {
              content.commits[0].type = type
              content.commits[0].author.name = author
            }

            const engine = new SearchEngine()
            engine.buildIndex(content)

            const result = engine.search({
              types: [type],
              authors: [author],
            })

            // 所有返回的条目都应该同时匹配类型和作者
            for (const entry of result.entries) {
              expect(entry.type).toBe(type)
              expect(entry.author.name).toBe(author)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 10.4: 分页应该覆盖所有结果
     */
    it('Property 10.4: 遍历所有分页应该覆盖所有结果', () => {
      fc.assert(
        fc.property(
          arbitraryChangelogContent(),
          fc.integer({ min: 5, max: 10 }),
          (content, pageSize) => {
            const engine = new SearchEngine()
            engine.buildIndex(content)

            const allEntries: ChangelogCommit[] = []
            let page = 1
            let hasMore = true

            // 遍历所有分页
            while (hasMore) {
              const result = engine.search({
                pagination: { page, pageSize },
              })

              allEntries.push(...result.entries)
              hasMore = result.hasMore
              page++

              // 防止无限循环
              if (page > 100) break
            }

            // 收集到的所有条目数应该等于总数
            expect(allEntries.length).toBe(content.commits.length)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
