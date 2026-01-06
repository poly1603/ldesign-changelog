/**
 * MigrationGenerator 测试
 * Feature: changelog-enhancement, Property 4: Migration Guide Generation
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { MigrationGenerator } from '../src/core/MigrationGenerator'
import type { MigrationEntry } from '../src/core/MigrationGenerator'
import type { ChangelogContent, BreakingChange, ChangelogCommit } from '../src/types/changelog'

/**
 * 生成有效的 scope 名称
 */
const validScope = fc.oneof(
  fc.constant('api'),
  fc.constant('core'),
  fc.constant('ui'),
  fc.constant('config'),
  fc.constant('auth'),
  fc.stringMatching(/^[a-z][a-z0-9-]{2,15}$/)
)

/**
 * 生成有效的提交主题
 */
const validSubject = fc.oneof(
  fc.constant('remove deprecated API'),
  fc.constant('change function signature'),
  fc.constant('rename configuration option'),
  fc.constant('update return type'),
  fc.stringMatching(/^[a-z][a-z0-9 ]{10,50}$/)
)

/**
 * 生成破坏性变更描述
 */
const breakingDescription = fc.oneof(
  fc.constant('The old API has been removed. Use the new API instead.'),
  fc.constant('Function signature changed from (a, b) to (options).'),
  fc.constant('Configuration option renamed from oldName to newName.'),
  fc.stringMatching(/^[A-Z][a-zA-Z0-9 .,()]{20,100}$/)
)

/**
 * 生成提交体（可能包含 BREAKING CHANGE 标记）
 */
const commitBody = fc.option(
  fc.oneof(
    fc.tuple(fc.constant('BREAKING CHANGE:'), breakingDescription).map(([marker, desc]) => `${marker} ${desc}`),
    fc.tuple(fc.constant('BREAKING CHANGES:'), breakingDescription).map(([marker, desc]) => `${marker} ${desc}`),
    fc.tuple(fc.constant('BREAKING:'), breakingDescription).map(([marker, desc]) => `${marker} ${desc}`)
  ),
  { nil: undefined }
)

/**
 * 生成 ChangelogCommit
 */
const changelogCommit = fc.record({
  hash: fc.stringMatching(/^[a-f0-9]{40}$/),
  shortHash: fc.stringMatching(/^[a-f0-9]{7}$/),
  type: fc.constant('feat'),
  scope: fc.option(validScope, { nil: undefined }),
  subject: validSubject,
  body: commitBody,
  author: fc.record({
    name: fc.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/),
    email: fc.emailAddress(),
  }),
  date: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
  breaking: fc.constant(true),
  breakingDescription: fc.option(breakingDescription, { nil: undefined }),
})

/**
 * 生成 BreakingChange
 */
const breakingChange = fc.record({
  description: breakingDescription,
  commit: changelogCommit,
  migration: fc.option(fc.stringMatching(/^[A-Z][a-zA-Z0-9 .,()]{20,100}$/), { nil: undefined }),
})

/**
 * 生成 ChangelogContent（包含破坏性变更）
 */
const changelogContentWithBreaking = fc.record({
  version: fc.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  date: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString().split('T')[0]),
  sections: fc.constant([]),
  commits: fc.array(changelogCommit, { minLength: 1, maxLength: 5 }),
  breakingChanges: fc.array(breakingChange, { minLength: 1, maxLength: 5 }),
})

describe('MigrationGenerator', () => {
  describe('Unit Tests', () => {
    it('应该正确创建 MigrationGenerator 实例', () => {
      const generator = new MigrationGenerator()
      expect(generator).toBeDefined()
    })

    it('应该接受自定义配置', () => {
      const generator = new MigrationGenerator({
        useAI: false,
        format: 'json',
        includeCodeExamples: false,
      })
      expect(generator).toBeDefined()
    })

    it('应该在没有破坏性变更时返回空数组', async () => {
      const generator = new MigrationGenerator()
      const content: ChangelogContent = {
        version: '1.0.0',
        date: '2024-01-01',
        sections: [],
        commits: [],
        breakingChanges: [],
      }

      const entries = await generator.generate(content)
      expect(entries).toEqual([])
    })

    it('应该为单个破坏性变更生成迁移条目', async () => {
      const generator = new MigrationGenerator()
      const content: ChangelogContent = {
        version: '2.0.0',
        date: '2024-01-01',
        sections: [],
        commits: [],
        breakingChanges: [
          {
            description: 'API removed',
            commit: {
              hash: 'abc123',
              shortHash: 'abc123',
              type: 'feat',
              scope: 'api',
              subject: 'remove old API',
              author: { name: 'Test User', email: 'test@example.com' },
              date: '2024-01-01',
              breaking: true,
            },
          },
        ],
      }

      const entries = await generator.generate(content)
      expect(entries).toHaveLength(1)
      expect(entries[0].version).toBe('2.0.0')
      expect(entries[0].breakingChanges).toHaveLength(1)
      expect(entries[0].migrationSteps.length).toBeGreaterThan(0)
    })

    it('应该渲染 Markdown 格式', () => {
      const generator = new MigrationGenerator({ format: 'markdown' })
      const entry: MigrationEntry = {
        version: '2.0.0',
        breakingChanges: [
          {
            description: 'API removed',
            commit: {
              hash: 'abc123',
              shortHash: 'abc123',
              type: 'feat',
              scope: 'api',
              subject: 'remove old API',
              author: { name: 'Test User', email: 'test@example.com' },
              date: '2024-01-01',
              breaking: true,
            },
          },
        ],
        migrationSteps: [
          {
            order: 1,
            title: 'Update API calls',
            description: 'Replace old API with new API',
            automated: false,
          },
        ],
        codeExamples: [],
        affectedApis: ['api'],
      }

      const markdown = generator.render([entry])
      expect(markdown).toContain('# 迁移指南 - v2.0.0')
      expect(markdown).toContain('## 破坏性变更')
      expect(markdown).toContain('## 迁移步骤')
      expect(markdown).toContain('API removed')
    })

    it('应该渲染 JSON 格式', () => {
      const generator = new MigrationGenerator({ format: 'json' })
      const entry: MigrationEntry = {
        version: '2.0.0',
        breakingChanges: [],
        migrationSteps: [],
        codeExamples: [],
        affectedApis: [],
      }

      const json = generator.render([entry])
      expect(() => JSON.parse(json)).not.toThrow()
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].version).toBe('2.0.0')
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Property 4: Migration Guide Generation
     * Validates: Requirements 3.1, 3.2, 3.4, 3.5
     *
     * For any breaking change commit with a description in the commit body,
     * the MigrationGenerator SHALL create a migration entry containing the
     * extracted description and organize entries by scope.
     */
    it('Property 4: 应该为所有破坏性变更生成迁移条目并按 scope 组织', async () => {
      await fc.assert(
        fc.asyncProperty(
          changelogContentWithBreaking,
          async (content) => {
            const generator = new MigrationGenerator({
              useAI: false,
              includeCodeExamples: true,
            })

            const entries = await generator.generate(content)

            // 验证：应该生成至少一个迁移条目
            expect(entries.length).toBeGreaterThan(0)

            const entry = entries[0]

            // 验证：版本号应该匹配
            expect(entry.version).toBe(content.version)

            // 验证：所有破坏性变更都应该被包含
            expect(entry.breakingChanges).toHaveLength(content.breakingChanges!.length)

            // 验证：应该生成迁移步骤
            expect(entry.migrationSteps.length).toBeGreaterThan(0)

            // 验证：迁移步骤应该有正确的顺序
            const orders = entry.migrationSteps.map(s => s.order)
            for (let i = 0; i < orders.length - 1; i++) {
              expect(orders[i]).toBeLessThan(orders[i + 1])
            }

            // 验证：每个迁移步骤都应该有标题和描述
            for (const step of entry.migrationSteps) {
              expect(step.title).toBeTruthy()
              expect(step.description).toBeTruthy()
              expect(typeof step.automated).toBe('boolean')
            }

            // 验证：应该提取受影响的 API
            expect(Array.isArray(entry.affectedApis)).toBe(true)

            // 验证：如果有 scope，应该在受影响的 API 中
            const scopes = content.breakingChanges!
              .map(bc => bc.commit.scope)
              .filter(Boolean) as string[]

            for (const scope of scopes) {
              expect(entry.affectedApis).toContain(scope)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 4.1: 描述提取
     * Validates: Requirements 3.2
     *
     * For any breaking change with a description in the commit body,
     * the description should be extracted correctly.
     */
    it('Property 4.1: 应该从提交体中正确提取破坏性变更描述', async () => {
      await fc.assert(
        fc.asyncProperty(
          changelogContentWithBreaking,
          async (content) => {
            const generator = new MigrationGenerator({
              useAI: false,
            })

            const entries = await generator.generate(content)
            const entry = entries[0]

            // 验证：每个破坏性变更都应该有描述
            for (const breakingChange of entry.breakingChanges) {
              const hasDescription =
                breakingChange.description ||
                breakingChange.commit.breakingDescription ||
                breakingChange.commit.body?.includes('BREAKING')

              expect(hasDescription).toBeTruthy()
            }

            // 验证：迁移步骤的描述应该来自破坏性变更
            for (const step of entry.migrationSteps) {
              expect(step.description.length).toBeGreaterThan(0)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 4.2: Scope 组织
     * Validates: Requirements 3.5
     *
     * For any set of breaking changes with different scopes,
     * they should be organized by scope in the migration guide.
     */
    it('Property 4.2: 应该按 scope 组织破坏性变更', async () => {
      await fc.assert(
        fc.asyncProperty(
          changelogContentWithBreaking,
          async (content) => {
            const generator = new MigrationGenerator({
              useAI: false,
            })

            const entries = await generator.generate(content)
            const entry = entries[0]

            // 收集所有 scope
            const scopes = new Set<string>()
            for (const bc of content.breakingChanges!) {
              const scope = bc.commit.scope || 'general'
              scopes.add(scope)
            }

            // 验证：受影响的 API 应该包含所有 scope
            for (const scope of scopes) {
              if (scope !== 'general') {
                expect(entry.affectedApis).toContain(scope)
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 4.3: Markdown 输出格式
     * Validates: Requirements 3.4
     *
     * For any migration entry, the Markdown output should contain
     * all required sections and be valid Markdown.
     */
    it('Property 4.3: Markdown 输出应该包含所有必需的部分', async () => {
      await fc.assert(
        fc.asyncProperty(
          changelogContentWithBreaking,
          async (content) => {
            const generator = new MigrationGenerator({
              format: 'markdown',
              useAI: false,
            })

            const entries = await generator.generate(content)
            const markdown = generator.render(entries)

            // 验证：应该包含标题
            expect(markdown).toContain(`# 迁移指南 - v${content.version}`)

            // 验证：应该包含概述部分
            expect(markdown).toContain('## 概述')

            // 验证：应该包含破坏性变更部分
            expect(markdown).toContain('## 破坏性变更')

            // 验证：应该包含迁移步骤部分
            expect(markdown).toContain('## 迁移步骤')

            // 验证：应该包含所有破坏性变更的主题
            for (const bc of content.breakingChanges!) {
              expect(markdown).toContain(bc.commit.subject)
            }

            // 验证：Markdown 格式正确（基本检查）
            const lines = markdown.split('\n')
            const hasHeaders = lines.some(line => line.startsWith('#'))
            expect(hasHeaders).toBe(true)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 4.4: 代码示例提取
     * Validates: Requirements 3.6
     *
     * For any breaking change with code blocks in the commit body,
     * code examples should be extracted correctly.
     */
    it('Property 4.4: 应该从提交体中提取代码示例', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            version: fc.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+$/),
            date: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString().split('T')[0]),
            sections: fc.constant([]),
            commits: fc.constant([]),
            breakingChanges: fc.array(
              fc.record({
                description: breakingDescription,
                commit: fc.record({
                  hash: fc.stringMatching(/^[a-f0-9]{40}$/),
                  shortHash: fc.stringMatching(/^[a-f0-9]{7}$/),
                  type: fc.constant('feat'),
                  scope: fc.option(validScope, { nil: undefined }),
                  subject: validSubject,
                  body: fc.option(
                    fc.oneof(
                      // 包含代码块的提交体
                      fc.constant('BREAKING CHANGE: API changed\n\n```javascript\n// Before\noldApi()\n```\n\n```javascript\n// After\nnewApi()\n```'),
                      fc.constant('BREAKING: Function signature changed\n\n```typescript\nfunction old(a: string, b: number)\n```\n\n```typescript\nfunction new(options: { a: string, b: number })\n```')
                    ),
                    { nil: undefined }
                  ),
                  author: fc.record({
                    name: fc.stringMatching(/^[A-Z][a-z]+ [A-Z][a-z]+$/),
                    email: fc.emailAddress(),
                  }),
                  date: fc.integer({ min: 1577836800000, max: 1735689600000 }).map(ts => new Date(ts).toISOString()),
                  breaking: fc.constant(true),
                }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async (content) => {
            const generator = new MigrationGenerator({
              useAI: false,
              includeCodeExamples: true,
            })

            const entries = await generator.generate(content)
            const entry = entries[0]

            // 验证：如果提交体包含代码块，应该提取代码示例
            const hasCodeBlocks = content.breakingChanges!.some(
              bc => bc.commit.body?.includes('```')
            )

            if (hasCodeBlocks) {
              // 应该有代码示例
              expect(entry.codeExamples.length).toBeGreaterThan(0)

              // 验证代码示例的结构
              for (const example of entry.codeExamples) {
                expect(example.language).toBeTruthy()
                expect(example.before).toBeTruthy()
                expect(example.after).toBeTruthy()
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
