/**
 * ChangelogMerger 测试
 * Feature: changelog-enhancement, Property 5: Changelog Merge Correctness
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { ChangelogMerger, type MergeSource, type MergeOptions } from '../src/core/ChangelogMerger'
import type { ChangelogContent, ChangelogCommit, ChangelogSection } from '../src/types/changelog'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'

// 测试用的临时目录
const TEST_DIR = join(process.cwd(), '__test_merge__')

/**
 * 创建测试目录
 */
function createTestDir(): void {
  mkdirSync(TEST_DIR, { recursive: true })
}

/**
 * 清理测试目录
 */
function cleanupTestDir(): void {
  try {
    rmSync(TEST_DIR, { recursive: true, force: true })
  } catch (error) {
    // 忽略清理错误
  }
}

/**
 * 生成随机的 ChangelogCommit
 */
function arbitraryCommit(): fc.Arbitrary<ChangelogCommit> {
  return fc.record({
    hash: fc.string({ minLength: 40, maxLength: 40 }).map(s =>
      s.split('').map(c => '0123456789abcdef'[c.charCodeAt(0) % 16]).join('')
    ),
    shortHash: fc.string({ minLength: 7, maxLength: 7 }).map(s =>
      s.split('').map(c => '0123456789abcdef'[c.charCodeAt(0) % 16]).join('')
    ),
    type: fc.constantFrom('feat', 'fix', 'docs', 'chore', 'refactor'),
    scope: fc.option(fc.stringMatching(/^[a-z-]{3,10}$/), { nil: undefined }),
    subject: fc.string({ minLength: 10, maxLength: 50 }),
    author: fc.record({
      name: fc.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/),
      email: fc.emailAddress(),
      username: fc.option(fc.stringMatching(/^[a-z0-9]{3,15}$/), { nil: undefined }),
    }),
    date: fc.integer({ min: 2020, max: 2024 }).chain(year =>
      fc.integer({ min: 1, max: 12 }).chain(month =>
        fc.integer({ min: 1, max: 28 }).map(day =>
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        )
      )
    ),
    pr: fc.option(fc.integer({ min: 1, max: 9999 }).map(String), { nil: undefined }),
    prLink: fc.option(fc.webUrl(), { nil: undefined }),
    commitLink: fc.option(fc.webUrl(), { nil: undefined }),
  })
}

/**
 * 生成随机的 ChangelogSection
 */
function arbitrarySection(): fc.Arbitrary<ChangelogSection> {
  return fc.record({
    title: fc.constantFrom('✨ 新功能', '🐛 Bug 修复', '📝 文档更新'),
    type: fc.constantFrom('feat', 'fix', 'docs'),
    commits: fc.array(arbitraryCommit(), { minLength: 1, maxLength: 5 }),
  })
}

/**
 * 生成随机的 ChangelogContent
 */
function arbitraryChangelogContent(): fc.Arbitrary<ChangelogContent> {
  return fc.record({
    version: fc.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+$/),
    date: fc.integer({ min: 2020, max: 2024 }).chain(year =>
      fc.integer({ min: 1, max: 12 }).chain(month =>
        fc.integer({ min: 1, max: 28 }).map(day =>
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        )
      )
    ),
    sections: fc.array(arbitrarySection(), { minLength: 1, maxLength: 3 }),
    commits: fc.array(arbitraryCommit(), { minLength: 1, maxLength: 10 }),
  })
}

describe('ChangelogMerger', () => {
  describe('Unit Tests', () => {
    beforeEach(() => {
      createTestDir()
    })

    afterEach(() => {
      cleanupTestDir()
    })

    it('应该正确创建 ChangelogMerger 实例', () => {
      const merger = new ChangelogMerger()
      expect(merger).toBeDefined()
    })

    it('应该检测 JSON 格式', async () => {
      const merger = new ChangelogMerger()
      const jsonContent = JSON.stringify({ version: '1.0.0', date: '2024-01-01' })
      const filePath = join(TEST_DIR, 'test.json')
      writeFileSync(filePath, jsonContent)

      const source: MergeSource = { path: filePath, format: 'auto' }
      const result = await merger.parse(source)

      expect(result.version).toBe('1.0.0')
      expect(result.date).toBe('2024-01-01')
    })

    it('应该检测 Markdown 格式', async () => {
      const merger = new ChangelogMerger()
      const mdContent = '## [1.0.0] - 2024-01-01\n\n### ✨ 新功能\n\n- feat: add new feature'
      const filePath = join(TEST_DIR, 'test.md')
      writeFileSync(filePath, mdContent)

      const source: MergeSource = { path: filePath, format: 'auto' }
      const result = await merger.parse(source)

      expect(result.version).toBe('1.0.0')
      expect(result.date).toBe('2024-01-01')
    })

    it('应该正确去重提交（基于 hash）', () => {
      const merger = new ChangelogMerger()
      const commits: ChangelogCommit[] = [
        {
          hash: 'abc123',
          shortHash: 'abc123',
          type: 'feat',
          subject: 'Add feature',
          author: { name: 'User', email: 'user@example.com' },
          date: '2024-01-01',
        },
        {
          hash: 'abc123',
          shortHash: 'abc123',
          type: 'feat',
          subject: 'Add feature',
          author: { name: 'User', email: 'user@example.com' },
          date: '2024-01-01',
        },
        {
          hash: 'def456',
          shortHash: 'def456',
          type: 'fix',
          subject: 'Fix bug',
          author: { name: 'User', email: 'user@example.com' },
          date: '2024-01-02',
        },
      ]

      const deduplicated = merger.deduplicate(commits, 'hash')
      expect(deduplicated).toHaveLength(2)
      expect(deduplicated[0].hash).toBe('abc123')
      expect(deduplicated[1].hash).toBe('def456')
    })

    it('应该正确去重提交（基于 message）', () => {
      const merger = new ChangelogMerger()
      const commits: ChangelogCommit[] = [
        {
          hash: 'abc123',
          shortHash: 'abc123',
          type: 'feat',
          scope: 'core',
          subject: 'Add feature',
          author: { name: 'User', email: 'user@example.com' },
          date: '2024-01-01',
        },
        {
          hash: 'def456',
          shortHash: 'def456',
          type: 'feat',
          scope: 'core',
          subject: 'Add feature',
          author: { name: 'User', email: 'user@example.com' },
          date: '2024-01-01',
        },
        {
          hash: 'ghi789',
          shortHash: 'ghi789',
          type: 'fix',
          subject: 'Fix bug',
          author: { name: 'User', email: 'user@example.com' },
          date: '2024-01-02',
        },
      ]

      const deduplicated = merger.deduplicate(commits, 'message')
      expect(deduplicated).toHaveLength(2)
    })

    it('应该处理空的 changelog 文件', async () => {
      const merger = new ChangelogMerger()
      const filePath = join(TEST_DIR, 'empty.md')
      writeFileSync(filePath, '')

      const source: MergeSource = { path: filePath, format: 'markdown' }
      const result = await merger.parse(source)

      expect(result.version).toBe('unknown')
      expect(result.commits).toHaveLength(0)
    })
  })

  describe('Property-Based Tests', () => {
    beforeEach(() => {
      createTestDir()
    })

    afterEach(() => {
      cleanupTestDir()
    })

    /**
     * Property 5: Changelog Merge Correctness
     * Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6
     *
     * For any set of changelog files in supported formats (Markdown, JSON),
     * the ChangelogMerger SHALL produce a merged result that:
     * - Contains all unique entries from all sources
     * - Groups entries correctly by the configured strategy
     * - Preserves package/scope information
     * - Removes duplicates based on commit hash
     */
    it('Property 5: 应该正确合并多个 changelog 文件', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成 2-4 个 changelog 内容
          fc.array(arbitraryChangelogContent(), { minLength: 2, maxLength: 4 }),
          // 生成合并选项
          fc.record({
            strategy: fc.constantFrom('by-date', 'by-version', 'by-package'),
            deduplicate: fc.boolean(),
            deduplicateKey: fc.constantFrom('hash', 'message', 'both'),
            preservePackagePrefix: fc.boolean(),
            outputFormat: fc.constantFrom('markdown', 'json'),
          }),
          async (contents, options) => {
            const merger = new ChangelogMerger()

            // 创建临时文件
            const sources: MergeSource[] = []
            for (let i = 0; i < contents.length; i++) {
              const content = contents[i]
              const format = i % 2 === 0 ? 'json' : 'markdown'
              const filePath = join(TEST_DIR, `changelog-${i}.${format === 'json' ? 'json' : 'md'}`)

              if (format === 'json') {
                writeFileSync(filePath, JSON.stringify(content, null, 2))
              } else {
                // 简单的 Markdown 格式
                let md = `## [${content.version}] - ${content.date}\n\n`
                for (const section of content.sections) {
                  md += `### ${section.title}\n\n`
                  for (const commit of section.commits) {
                    md += `- ${commit.subject}\n`
                  }
                  md += '\n'
                }
                writeFileSync(filePath, md)
              }

              sources.push({
                path: filePath,
                packageName: `package-${i}`,
                format: 'auto',
              })
            }

            // 执行合并
            const merged = await merger.merge(sources, options as MergeOptions)

            // 验证 1: 合并结果包含提交
            expect(merged.commits.length).toBeGreaterThan(0)

            // 验证 2: 如果启用去重，检查没有重复的 hash
            if (options.deduplicate && options.deduplicateKey === 'hash') {
              const hashes = new Set(merged.commits.map(c => c.hash))
              expect(hashes.size).toBe(merged.commits.length)
            }

            // 验证 3: 如果保留包名前缀，检查 scope 包含包名
            if (options.preservePackagePrefix) {
              const hasPackagePrefix = merged.commits.some(c =>
                c.scope && c.scope.startsWith('package-')
              )
              // 至少有一些提交应该有包名前缀
              expect(hasPackagePrefix).toBe(true)
            }

            // 验证 4: sections 应该被正确分组
            expect(merged.sections.length).toBeGreaterThan(0)
            for (const section of merged.sections) {
              expect(section.commits.length).toBeGreaterThan(0)
              // 所有提交应该在总提交列表中
              for (const commit of section.commits) {
                expect(merged.commits.some(c => c.hash === commit.hash)).toBe(true)
              }
            }

            // 验证 5: 统计信息应该正确
            if (merged.stats) {
              expect(merged.stats.totalCommits).toBe(merged.commits.length)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 60000)

    /**
     * Property 5.1: 去重正确性
     * Validates: Requirements 4.5
     */
    it('Property 5.1: 去重应该保留唯一提交', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成提交数组
          fc.array(arbitraryCommit(), { minLength: 5, maxLength: 20 }),
          // 生成去重键
          fc.constantFrom('hash', 'message', 'both'),
          async (commits, deduplicateKey) => {
            const merger = new ChangelogMerger()

            // 创建一些重复的提交
            const duplicates = commits.slice(0, Math.min(3, commits.length))
            const allCommits = [...commits, ...duplicates]

            // 去重
            const deduplicated = merger.deduplicate(allCommits, deduplicateKey as any)

            // 验证：去重后的数量应该小于或等于原始数量
            expect(deduplicated.length).toBeLessThanOrEqual(allCommits.length)

            // 验证：去重后不应该有重复
            const keys = new Set<string>()
            for (const commit of deduplicated) {
              let key: string
              switch (deduplicateKey) {
                case 'hash':
                  key = commit.hash
                  break
                case 'message':
                  key = `${commit.type}:${commit.scope || ''}:${commit.subject}`
                  break
                case 'both':
                  key = `${commit.hash}:${commit.subject}`
                  break
                default:
                  key = commit.hash
              }
              expect(keys.has(key)).toBe(false)
              keys.add(key)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 5.2: 包名前缀保留
     * Validates: Requirements 4.4
     */
    it('Property 5.2: 应该正确保留包名前缀', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成 changelog 内容
          arbitraryChangelogContent(),
          // 生成包名
          fc.stringMatching(/^@[a-z]+\/[a-z-]{3,10}$/),
          async (content, packageName) => {
            const merger = new ChangelogMerger()

            // 创建临时文件
            const filePath = join(TEST_DIR, 'test.json')
            writeFileSync(filePath, JSON.stringify(content, null, 2))

            const sources: MergeSource[] = [
              { path: filePath, packageName, format: 'json' },
            ]

            const options: MergeOptions = {
              strategy: 'by-package',
              deduplicate: false,
              deduplicateKey: 'hash',
              preservePackagePrefix: true,
              outputFormat: 'json',
            }

            // 执行合并
            const merged = await merger.merge(sources, options)

            // 验证：所有提交的 scope 应该包含包名
            for (const commit of merged.commits) {
              if (commit.scope) {
                expect(commit.scope.startsWith(packageName)).toBe(true)
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 5.3: 合并策略正确性
     * Validates: Requirements 4.6
     */
    it('Property 5.3: 不同合并策略应该产生正确的排序', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成多个 changelog 内容
          fc.array(arbitraryChangelogContent(), { minLength: 2, maxLength: 3 }),
          // 生成合并策略
          fc.constantFrom('by-date', 'by-version', 'by-package'),
          async (contents, strategy) => {
            const merger = new ChangelogMerger()

            // 创建临时文件
            const sources: MergeSource[] = []
            for (let i = 0; i < contents.length; i++) {
              const filePath = join(TEST_DIR, `test-${i}.json`)
              writeFileSync(filePath, JSON.stringify(contents[i], null, 2))
              sources.push({
                path: filePath,
                packageName: `pkg-${i}`,
                format: 'json',
              })
            }

            const options: MergeOptions = {
              strategy: strategy as any,
              deduplicate: false,
              deduplicateKey: 'hash',
              preservePackagePrefix: strategy === 'by-package',
              outputFormat: 'json',
            }

            // 执行合并
            const merged = await merger.merge(sources, options)

            // 验证：提交应该被正确排序
            if (strategy === 'by-date') {
              // 按日期降序
              for (let i = 1; i < merged.commits.length; i++) {
                const prevDate = new Date(merged.commits[i - 1].date).getTime()
                const currDate = new Date(merged.commits[i].date).getTime()
                expect(prevDate).toBeGreaterThanOrEqual(currDate)
              }
            } else if (strategy === 'by-package') {
              // 按包名排序
              for (let i = 1; i < merged.commits.length; i++) {
                const prevScope = merged.commits[i - 1].scope || ''
                const currScope = merged.commits[i].scope || ''
                expect(prevScope.localeCompare(currScope)).toBeLessThanOrEqual(0)
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
