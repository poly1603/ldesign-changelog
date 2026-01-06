/**
 * ChangelogImporter 测试
 * Feature: changelog-enhancement, Property 7: Import Format Round-Trip
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { ChangelogImporter, type ImportSource, type ImportOptions } from '../src/core/ChangelogImporter'
import type { ChangelogContent, ChangelogCommit, ChangelogSection } from '../src/types/changelog'
import { createMarkdownFormatter } from '../src/formatters/MarkdownFormatter'
import { createJsonFormatter } from '../src/formatters/JsonFormatter'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'

// 测试用的临时目录
const TEST_DIR = join(process.cwd(), '__test_import__')

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
    type: fc.constantFrom('feat', 'fix', 'docs', 'chore', 'refactor', 'security'),
    scope: fc.option(fc.stringMatching(/^[a-z-]{3,10}$/), { nil: undefined }),
    // Ensure subject has meaningful content (at least one alphanumeric character)
    // and trim to avoid leading/trailing whitespace issues
    subject: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.trim()).filter(s => {
      // Must have at least one alphanumeric character
      return /[a-zA-Z0-9]/.test(s) && s.length >= 3
    }),
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
  })
}

/**
 * 生成随机的 ChangelogSection
 */
function arbitrarySection(): fc.Arbitrary<ChangelogSection> {
  return fc.record({
    title: fc.constantFrom('✨ Features', '🐛 Bug Fixes', '📝 Documentation', '🔒 Security'),
    type: fc.constantFrom('feat', 'fix', 'docs', 'security'),
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

/**
 * 生成 Keep a Changelog 格式的内容
 */
function generateKeepAChangelogFormat(content: ChangelogContent): string {
  let output = '# Changelog\n\n'
  output += 'All notable changes to this project will be documented in this file.\n\n'
  output += `## [${content.version}] - ${content.date}\n\n`

  for (const section of content.sections) {
    // 映射类型到 Keep a Changelog 章节名
    const sectionName = mapTypeToKeepAChangelogSection(section.type)
    output += `### ${sectionName}\n\n`

    for (const commit of section.commits) {
      const prefix = commit.scope ? `${commit.scope}: ` : ''
      output += `- ${prefix}${commit.subject}\n`
    }
    output += '\n'
  }

  return output
}

/**
 * 生成 Conventional Changelog 格式的内容
 */
function generateConventionalChangelogFormat(content: ChangelogContent): string {
  let output = '# Changelog\n\n'
  output += `## [${content.version}](https://github.com/example/repo/compare/v${content.version}) (${content.date})\n\n`

  for (const section of content.sections) {
    output += `### ${section.title}\n\n`

    for (const commit of section.commits) {
      const scopeStr = commit.scope ? `**${commit.scope}:** ` : ''
      const hashStr = `([${commit.shortHash}](https://github.com/example/repo/commit/${commit.hash}))`
      output += `* ${scopeStr}${commit.subject} ${hashStr}\n`
    }
    output += '\n'
  }

  return output
}

/**
 * 生成纯 Markdown 格式的内容
 */
function generatePlainMarkdownFormat(content: ChangelogContent): string {
  let output = '# Changelog\n\n'
  output += `## ${content.version} - ${content.date}\n\n`

  for (const section of content.sections) {
    output += `### ${section.title}\n\n`

    for (const commit of section.commits) {
      const prefix = commit.scope ? `${commit.scope}: ` : ''
      output += `- ${prefix}${commit.subject}\n`
    }
    output += '\n'
  }

  return output
}

/**
 * 映射类型到 Keep a Changelog 章节名
 */
function mapTypeToKeepAChangelogSection(type: string): string {
  const map: Record<string, string> = {
    feat: 'Added',
    fix: 'Fixed',
    docs: 'Changed',
    security: 'Security',
    refactor: 'Changed',
    chore: 'Changed',
  }
  return map[type] || 'Changed'
}

describe('ChangelogImporter', () => {
  describe('Unit Tests', () => {
    beforeEach(() => {
      createTestDir()
    })

    afterEach(() => {
      cleanupTestDir()
    })

    it('应该正确创建 ChangelogImporter 实例', () => {
      const importer = new ChangelogImporter()
      expect(importer).toBeDefined()
    })

    it('应该检测 Keep a Changelog 格式', () => {
      const importer = new ChangelogImporter()
      const content = `# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-01-01

### Added
- New feature

### Fixed
- Bug fix
`
      const format = importer.detectFormat(content)
      expect(format).toBe('keep-a-changelog')
    })

    it('应该检测 Conventional Changelog 格式', () => {
      const importer = new ChangelogImporter()
      const content = `# Changelog

## [1.0.0](https://github.com/example/repo) (2024-01-01)

### Features

* **core:** add new feature ([abc1234](https://github.com/example/repo/commit/abc1234))

### Bug Fixes

* **ui:** fix layout issue ([def5678](https://github.com/example/repo/commit/def5678))
`
      const format = importer.detectFormat(content)
      expect(format).toBe('conventional-changelog')
    })

    it('应该检测纯 Markdown 格式', () => {
      const importer = new ChangelogImporter()
      const content = `# Changelog

## 1.0.0 - 2024-01-01

### Changes

- Update dependencies
- Fix bugs
`
      const format = importer.detectFormat(content)
      expect(format).toBe('plain-markdown')
    })

    it('应该导入 Keep a Changelog 格式', async () => {
      const importer = new ChangelogImporter()
      const content = `# Changelog

## [1.0.0] - 2024-01-01

### Added
- New feature

### Fixed
- Bug fix
`
      const filePath = join(TEST_DIR, 'keep-a-changelog.md')
      writeFileSync(filePath, content)

      const source: ImportSource = {
        path: filePath,
        format: 'keep-a-changelog',
      }

      const options: ImportOptions = {
        preserveDates: true,
        preserveVersions: true,
        dateFormat: 'YYYY-MM-DD',
        versionPrefix: '',
      }

      const result = await importer.import(source, options)

      expect(result.success).toBe(true)
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].version).toBe('1.0.0')
      expect(result.entries[0].date).toBe('2024-01-01')
      expect(result.entries[0].sections).toHaveLength(2)
    })

    it('应该导入 Conventional Changelog 格式', async () => {
      const importer = new ChangelogImporter()
      const content = `# Changelog

## [1.0.0](https://github.com/example/repo) (2024-01-01)

### Features

* **core:** add new feature ([abc1234](https://github.com/example/repo/commit/abc1234))
`
      const filePath = join(TEST_DIR, 'conventional-changelog.md')
      writeFileSync(filePath, content)

      const source: ImportSource = {
        path: filePath,
        format: 'conventional-changelog',
      }

      const options: ImportOptions = {
        preserveDates: true,
        preserveVersions: true,
        dateFormat: 'YYYY-MM-DD',
        versionPrefix: '',
      }

      const result = await importer.import(source, options)

      expect(result.success).toBe(true)
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].version).toBe('1.0.0')
      expect(result.entries[0].date).toBe('2024-01-01')
    })

    it('应该导入纯 Markdown 格式', async () => {
      const importer = new ChangelogImporter()
      const content = `# Changelog

## 1.0.0 - 2024-01-01

### Changes

- Update dependencies
`
      const filePath = join(TEST_DIR, 'plain-markdown.md')
      writeFileSync(filePath, content)

      const source: ImportSource = {
        path: filePath,
        format: 'plain-markdown',
      }

      const options: ImportOptions = {
        preserveDates: true,
        preserveVersions: true,
        dateFormat: 'YYYY-MM-DD',
        versionPrefix: '',
      }

      const result = await importer.import(source, options)

      expect(result.success).toBe(true)
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].version).toBe('1.0.0')
    })

    it('应该处理部分解析错误', async () => {
      const importer = new ChangelogImporter()
      const content = `# Changelog

## [1.0.0] - 2024-01-01

### Added
- Valid entry

## Invalid Version Format

### Added
- This should be skipped
`
      const filePath = join(TEST_DIR, 'partial-error.md')
      writeFileSync(filePath, content)

      const source: ImportSource = {
        path: filePath,
        format: 'keep-a-changelog',
      }

      const options: ImportOptions = {
        preserveDates: true,
        preserveVersions: true,
        dateFormat: 'YYYY-MM-DD',
        versionPrefix: '',
      }

      const result = await importer.import(source, options)

      // 应该成功导入有效的条目
      expect(result.success).toBe(true)
      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].version).toBe('1.0.0')
    })

    it('应该验证导入结果', async () => {
      const importer = new ChangelogImporter()
      const content = `# Changelog

## [1.0.0] - 2024-01-01

### Added
- New feature
`
      const filePath = join(TEST_DIR, 'validate.md')
      writeFileSync(filePath, content)

      const source: ImportSource = {
        path: filePath,
        format: 'keep-a-changelog',
      }

      const options: ImportOptions = {
        preserveDates: true,
        preserveVersions: true,
        dateFormat: 'YYYY-MM-DD',
        versionPrefix: '',
      }

      const result = await importer.import(source, options)
      const validation = importer.validate(result)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('应该处理空文件', async () => {
      const importer = new ChangelogImporter()
      const filePath = join(TEST_DIR, 'empty.md')
      writeFileSync(filePath, '')

      const source: ImportSource = {
        path: filePath,
        format: 'auto',
      }

      const options: ImportOptions = {
        preserveDates: true,
        preserveVersions: true,
        dateFormat: 'YYYY-MM-DD',
        versionPrefix: '',
      }

      const result = await importer.import(source, options)

      expect(result.success).toBe(false)
      expect(result.entries).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0)
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
     * Property 7: Import Format Round-Trip
     * Validates: Requirements 8.2, 8.3, 8.4, 8.5
     *
     * For any valid changelog in Keep a Changelog, conventional-changelog,
     * or plain Markdown format, importing and then exporting SHALL preserve:
     * - All version numbers
     * - All dates
     * - All change entries with their types and descriptions
     */
    it('Property 7: Keep a Changelog 格式往返应该保留所有信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryChangelogContent(),
          async (content) => {
            const importer = new ChangelogImporter()

            // 生成 Keep a Changelog 格式
            const markdown = generateKeepAChangelogFormat(content)
            const filePath = join(TEST_DIR, 'roundtrip-keep.md')
            writeFileSync(filePath, markdown)

            // 导入
            const source: ImportSource = {
              path: filePath,
              format: 'keep-a-changelog',
            }

            const options: ImportOptions = {
              preserveDates: true,
              preserveVersions: true,
              dateFormat: 'YYYY-MM-DD',
              versionPrefix: '',
            }

            const result = await importer.import(source, options)

            // 验证导入成功
            expect(result.success).toBe(true)
            expect(result.entries.length).toBeGreaterThan(0)

            const imported = result.entries[0]

            // 验证版本号保留
            expect(imported.version).toBe(content.version)

            // 验证日期保留
            expect(imported.date).toBe(content.date)

            // 验证章节数量
            expect(imported.sections.length).toBeGreaterThan(0)

            // 验证提交数量（应该与原始内容相同或相近）
            const originalCommitCount = content.sections.reduce((sum, s) => sum + s.commits.length, 0)
            expect(imported.commits.length).toBe(originalCommitCount)

            // 验证所有提交的 subject 都被保留
            const originalSubjects = new Set(
              content.sections.flatMap(s => s.commits.map(c => c.subject))
            )
            const importedSubjects = new Set(imported.commits.map(c => c.subject))

            for (const subject of originalSubjects) {
              expect(importedSubjects.has(subject)).toBe(true)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 60000)

    /**
     * Property 7.1: Conventional Changelog 格式往返
     */
    it('Property 7.1: Conventional Changelog 格式往返应该保留所有信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryChangelogContent(),
          async (content) => {
            const importer = new ChangelogImporter()

            // 生成 Conventional Changelog 格式
            const markdown = generateConventionalChangelogFormat(content)
            const filePath = join(TEST_DIR, 'roundtrip-conventional.md')
            writeFileSync(filePath, markdown)

            // 导入
            const source: ImportSource = {
              path: filePath,
              format: 'conventional-changelog',
            }

            const options: ImportOptions = {
              preserveDates: true,
              preserveVersions: true,
              dateFormat: 'YYYY-MM-DD',
              versionPrefix: '',
            }

            const result = await importer.import(source, options)

            // 验证导入成功
            expect(result.success).toBe(true)
            expect(result.entries.length).toBeGreaterThan(0)

            const imported = result.entries[0]

            // 验证版本号保留
            expect(imported.version).toBe(content.version)

            // 验证日期保留
            expect(imported.date).toBe(content.date)

            // 验证提交数量
            const originalCommitCount = content.sections.reduce((sum, s) => sum + s.commits.length, 0)
            expect(imported.commits.length).toBe(originalCommitCount)

            // 验证所有提交的 subject 和 scope 都被保留
            for (const section of content.sections) {
              for (const commit of section.commits) {
                const found = imported.commits.find(c =>
                  c.subject === commit.subject &&
                  c.scope === commit.scope
                )
                expect(found).toBeDefined()
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 60000)

    /**
     * Property 7.2: 纯 Markdown 格式往返
     */
    it('Property 7.2: 纯 Markdown 格式往返应该保留所有信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryChangelogContent(),
          async (content) => {
            const importer = new ChangelogImporter()

            // 生成纯 Markdown 格式
            const markdown = generatePlainMarkdownFormat(content)
            const filePath = join(TEST_DIR, 'roundtrip-plain.md')
            writeFileSync(filePath, markdown)

            // 导入
            const source: ImportSource = {
              path: filePath,
              format: 'plain-markdown',
            }

            const options: ImportOptions = {
              preserveDates: true,
              preserveVersions: true,
              dateFormat: 'YYYY-MM-DD',
              versionPrefix: '',
            }

            const result = await importer.import(source, options)

            // 验证导入成功
            expect(result.success).toBe(true)
            expect(result.entries.length).toBeGreaterThan(0)

            const imported = result.entries[0]

            // 验证版本号保留
            expect(imported.version).toBe(content.version)

            // 验证日期保留
            expect(imported.date).toBe(content.date)

            // 验证提交数量
            const originalCommitCount = content.sections.reduce((sum, s) => sum + s.commits.length, 0)
            expect(imported.commits.length).toBe(originalCommitCount)

            // 验证所有提交的 subject 都被保留
            const originalSubjects = new Set(
              content.sections.flatMap(s => s.commits.map(c => c.subject))
            )
            const importedSubjects = new Set(imported.commits.map(c => c.subject))

            for (const subject of originalSubjects) {
              expect(importedSubjects.has(subject)).toBe(true)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 60000)

    /**
     * Property 7.3: 自动格式检测正确性
     */
    it('Property 7.3: 自动格式检测应该正确识别格式', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryChangelogContent(),
          fc.constantFrom('keep-a-changelog', 'conventional-changelog', 'plain-markdown'),
          async (content, targetFormat) => {
            const importer = new ChangelogImporter()

            // 根据目标格式生成内容
            let markdown: string
            switch (targetFormat) {
              case 'keep-a-changelog':
                markdown = generateKeepAChangelogFormat(content)
                break
              case 'conventional-changelog':
                markdown = generateConventionalChangelogFormat(content)
                break
              case 'plain-markdown':
                markdown = generatePlainMarkdownFormat(content)
                break
              default:
                markdown = generatePlainMarkdownFormat(content)
            }

            // 检测格式
            const detectedFormat = importer.detectFormat(markdown)

            // 验证检测结果
            expect(detectedFormat).toBe(targetFormat)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 7.4: 版本号和日期保留选项
     */
    it('Property 7.4: 应该根据选项正确处理版本号和日期', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryChangelogContent(),
          fc.boolean(),
          fc.boolean(),
          fc.stringMatching(/^v?$/),
          async (content, preserveVersions, preserveDates, versionPrefix) => {
            const importer = new ChangelogImporter()

            // 生成内容
            const markdown = generateKeepAChangelogFormat(content)
            const filePath = join(TEST_DIR, 'options-test.md')
            writeFileSync(filePath, markdown)

            // 导入
            const source: ImportSource = {
              path: filePath,
              format: 'keep-a-changelog',
            }

            const options: ImportOptions = {
              preserveDates,
              preserveVersions,
              dateFormat: 'YYYY-MM-DD',
              versionPrefix,
            }

            const result = await importer.import(source, options)

            expect(result.success).toBe(true)
            expect(result.entries.length).toBeGreaterThan(0)

            const imported = result.entries[0]

            // 验证版本号处理
            if (preserveVersions) {
              if (versionPrefix) {
                expect(imported.version).toContain(versionPrefix)
              }
            }

            // 验证日期处理
            if (preserveDates) {
              expect(imported.date).toBe(content.date)
            } else {
              // 如果不保留日期，应该使用当前日期
              expect(imported.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
