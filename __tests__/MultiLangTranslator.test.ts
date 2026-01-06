/**
 * MultiLangTranslator 测试
 * Feature: changelog-enhancement, Property 9: Multi-Language Output Consistency
 */

import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { MultiLangTranslator, createMultiLangTranslator } from '../src/core/MultiLangTranslator'
import type { ChangelogContent, ChangelogSection, ChangelogCommit } from '../src/types/changelog'

/**
 * 生成测试用的 Changelog 内容
 */
function createTestChangelogContent(
  version: string = '1.0.0',
  commitCount: number = 5
): ChangelogContent {
  const commits: ChangelogCommit[] = []

  for (let i = 0; i < commitCount; i++) {
    commits.push({
      hash: `abc${i}def${i}123${i}456${i}`,
      shortHash: `abc${i}def`,
      type: ['feat', 'fix', 'docs'][i % 3],
      scope: i % 2 === 0 ? 'core' : undefined,
      subject: `Test commit ${i}`,
      body: i % 2 === 0 ? `Detailed description ${i}` : undefined,
      author: {
        name: `Author ${i}`,
        email: `author${i}@example.com`,
      },
      date: new Date(2024, 0, i + 1).toISOString(),
      breaking: i === 0,
      breakingDescription: i === 0 ? 'Breaking change description' : undefined,
    })
  }

  const sections: ChangelogSection[] = [
    {
      title: 'Features',
      type: 'feat',
      commits: commits.filter(c => c.type === 'feat'),
    },
    {
      title: 'Bug Fixes',
      type: 'fix',
      commits: commits.filter(c => c.type === 'fix'),
    },
  ]

  return {
    version,
    date: new Date(2024, 0, 1).toISOString(),
    sections,
    commits,
    breakingChanges: commits
      .filter(c => c.breaking)
      .map(c => ({
        description: c.breakingDescription || '',
        commit: c,
      })),
    contributors: [
      {
        name: 'Author 0',
        email: 'author0@example.com',
        commitCount: 2,
      },
      {
        name: 'Author 1',
        email: 'author1@example.com',
        commitCount: 3,
      },
    ],
  }
}

describe('MultiLangTranslator', () => {
  describe('Unit Tests', () => {
    it('应该正确创建 MultiLangTranslator 实例', () => {
      const translator = new MultiLangTranslator({
        targetLanguages: ['en-US', 'zh-CN'],
      })
      expect(translator).toBeDefined()
    })

    it('应该接受自定义配置', () => {
      const translator = new MultiLangTranslator({
        targetLanguages: ['en-US', 'zh-CN', 'ja-JP'],
        provider: 'ai',
        preserveOriginal: true,
        outputPattern: 'CHANGELOG.{lang}.md',
        translateCommits: false,
        translateSections: true,
      })
      expect(translator).toBeDefined()
    })

    it('应该返回支持的语言列表', () => {
      const languages = MultiLangTranslator.getSupportedLanguages()
      expect(languages).toContain('zh-CN')
      expect(languages).toContain('en-US')
      expect(languages).toContain('ja-JP')
      expect(languages).toContain('es-ES')
      expect(languages).toContain('fr-FR')
      expect(languages).toContain('de-DE')
    })

    it('应该获取语言配置', () => {
      const config = MultiLangTranslator.getLanguageConfig('zh-CN')
      expect(config).toBeDefined()
      expect(config?.code).toBe('zh-CN')
      expect(config?.name).toBe('简体中文')
      expect(config?.sectionTitles).toBeDefined()
    })

    it('应该正确格式化日期', () => {
      const translator = new MultiLangTranslator({
        targetLanguages: ['zh-CN'],
      })

      const date = new Date(2024, 0, 15) // January 15, 2024
      const zhConfig = MultiLangTranslator.getLanguageConfig('zh-CN')!
      const formatted = translator.formatDate(date, zhConfig)

      expect(formatted).toContain('2024')
      expect(formatted).toContain('01')
      expect(formatted).toContain('15')
    })

    it('应该正确格式化数字', () => {
      const translator = new MultiLangTranslator({
        targetLanguages: ['en-US'],
      })

      const formatted = translator.formatNumber(1234567, 'en-US')
      expect(formatted).toBeDefined()
    })

    it('应该生成正确的输出路径', async () => {
      const translator = new MultiLangTranslator({
        targetLanguages: ['zh-CN', 'en-US'],
        outputPattern: 'CHANGELOG.{lang}.md',
        translateCommits: false,
        translateSections: false,
      })

      const content = createTestChangelogContent()
      const results = await translator.translate(content, '/test/dir')

      expect(results).toHaveLength(2)
      expect(results[0].outputPath).toContain('CHANGELOG.zh-CN.md')
      expect(results[1].outputPath).toContain('CHANGELOG.en-US.md')
    })

    it('应该在翻译失败时回退到原始内容', async () => {
      const translator = new MultiLangTranslator({
        targetLanguages: ['invalid-lang'],
        translateCommits: false,
        translateSections: false,
      })

      const content = createTestChangelogContent()
      const results = await translator.translate(content)

      expect(results).toHaveLength(1)
      expect(results[0].error).toBeDefined()
      expect(results[0].content).toBe(content)
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Property 9: Multi-Language Output Consistency
     * Validates: Requirements 10.1, 10.3, 10.4, 10.5
     *
     * For any changelog content translated to multiple languages:
     * - All language versions SHALL have the same structure (sections, entry count)
     * - Date and number formats SHALL match the target locale
     * - Output file names SHALL follow the configured pattern
     */
    it('Property 9: 所有语言版本应该具有相同的结构', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机的 changelog 配置
          fc.record({
            version: fc.stringMatching(/^\d+\.\d+\.\d+$/),
            commitCount: fc.integer({ min: 1, max: 10 }),
            targetLanguages: fc.shuffledSubarray(
              ['zh-CN', 'en-US', 'ja-JP', 'es-ES', 'fr-FR', 'de-DE'],
              { minLength: 2, maxLength: 4 }
            ),
            outputPattern: fc.oneof(
              fc.constant('CHANGELOG.{lang}.md'),
              fc.constant('changelog-{lang}.md'),
              fc.constant('CHANGES.{lang}.md')
            ),
          }),
          async (config) => {
            // 创建测试内容
            const content = createTestChangelogContent(config.version, config.commitCount)

            // 创建翻译器（不使用 AI，只测试结构一致性）
            const translator = new MultiLangTranslator({
              targetLanguages: config.targetLanguages,
              outputPattern: config.outputPattern,
              translateCommits: false, // 不翻译提交以加快测试
              translateSections: false, // 不翻译章节以加快测试
            })

            // 执行翻译
            const results = await translator.translate(content, '/test')

            // 验证结果数量
            expect(results).toHaveLength(config.targetLanguages.length)

            // 验证每个结果
            for (let i = 0; i < results.length; i++) {
              const result = results[i]
              const lang = config.targetLanguages[i]

              // 验证语言代码
              expect(result.language).toBe(lang)

              // 验证输出路径包含语言代码
              expect(result.outputPath).toContain(lang)
              expect(result.outputPath).toMatch(
                new RegExp(config.outputPattern.replace('{lang}', lang))
              )

              // 验证内容结构一致性
              expect(result.content.version).toBe(content.version)
              expect(result.content.sections).toHaveLength(content.sections.length)
              expect(result.content.commits).toHaveLength(content.commits.length)

              // 验证章节结构
              for (let j = 0; j < result.content.sections.length; j++) {
                const originalSection = content.sections[j]
                const translatedSection = result.content.sections[j]

                expect(translatedSection.type).toBe(originalSection.type)
                expect(translatedSection.commits).toHaveLength(originalSection.commits.length)
              }

              // 验证破坏性变更数量
              if (content.breakingChanges) {
                expect(result.content.breakingChanges).toHaveLength(
                  content.breakingChanges.length
                )
              }

              // 验证贡献者数量
              if (content.contributors) {
                expect(result.content.contributors).toHaveLength(
                  content.contributors.length
                )
              }

              // 验证日期格式（应该被格式化）
              expect(result.content.date).toBeDefined()
              expect(result.content.date).not.toBe('')
            }

            // 验证所有语言版本的结构完全一致
            for (let i = 1; i < results.length; i++) {
              const prev = results[i - 1].content
              const curr = results[i].content

              // 版本号应该相同
              expect(curr.version).toBe(prev.version)

              // 章节数量应该相同
              expect(curr.sections.length).toBe(prev.sections.length)

              // 提交数量应该相同
              expect(curr.commits.length).toBe(prev.commits.length)

              // 每个章节的提交数量应该相同
              for (let j = 0; j < curr.sections.length; j++) {
                expect(curr.sections[j].commits.length).toBe(
                  prev.sections[j].commits.length
                )
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 60000) // 增加超时时间

    /**
     * Property 9.1: 日期格式本地化
     * Validates: Requirements 10.3
     *
     * 日期应该根据目标语言的区域设置进行格式化
     */
    it('Property 9.1: 日期应该根据语言正确格式化', () => {
      fc.assert(
        fc.property(
          fc.record({
            year: fc.integer({ min: 2020, max: 2030 }),
            month: fc.integer({ min: 0, max: 11 }),
            day: fc.integer({ min: 1, max: 28 }),
            language: fc.oneof(
              fc.constant('zh-CN'),
              fc.constant('en-US'),
              fc.constant('ja-JP'),
              fc.constant('es-ES'),
              fc.constant('fr-FR'),
              fc.constant('de-DE')
            ),
          }),
          (config) => {
            const translator = new MultiLangTranslator({
              targetLanguages: [config.language],
            })

            const date = new Date(config.year, config.month, config.day)
            const langConfig = MultiLangTranslator.getLanguageConfig(config.language)!
            const formatted = translator.formatDate(date, langConfig)

            // 验证格式化的日期包含年份
            expect(formatted).toContain(String(config.year))

            // 验证日期不为空
            expect(formatted).not.toBe('')
            expect(formatted.length).toBeGreaterThan(0)

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 9.2: 输出文件命名一致性
     * Validates: Requirements 10.4
     *
     * 输出文件名应该遵循配置的命名模式
     */
    it('Property 9.2: 输出文件名应该遵循命名模式', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            pattern: fc.oneof(
              fc.constant('CHANGELOG.{lang}.md'),
              fc.constant('changelog-{lang}.md'),
              fc.constant('CHANGES.{lang}.md'),
              fc.constant('{lang}-CHANGELOG.md'),
              fc.constant('docs/changelog.{lang}.md')
            ),
            languages: fc.shuffledSubarray(
              ['zh-CN', 'en-US', 'ja-JP'],
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async (config) => {
            const translator = new MultiLangTranslator({
              targetLanguages: config.languages,
              outputPattern: config.pattern,
              translateCommits: false,
              translateSections: false,
            })

            const content = createTestChangelogContent()
            const results = await translator.translate(content, '/test')

            // 验证每个输出路径
            for (let i = 0; i < results.length; i++) {
              const result = results[i]
              const lang = config.languages[i]

              // 验证路径包含语言代码
              expect(result.outputPath).toContain(lang)

              // 验证路径匹配模式（规范化路径分隔符以支持 Windows）
              const expectedFilename = config.pattern.replace('{lang}', lang)
              const normalizedPath = result.outputPath.replace(/\\/g, '/')
              expect(normalizedPath).toContain(expectedFilename)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 9.3: 章节顺序保持一致
     * Validates: Requirements 10.5
     *
     * 所有语言版本的章节顺序应该保持一致
     */
    it('Property 9.3: 所有语言版本的章节顺序应该一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sectionCount: fc.integer({ min: 2, max: 5 }),
            languages: fc.shuffledSubarray(
              ['zh-CN', 'en-US', 'ja-JP'],
              { minLength: 2, maxLength: 3 }
            ),
          }),
          async (config) => {
            // 创建具有多个章节的内容
            const commits: ChangelogCommit[] = []
            const types = ['feat', 'fix', 'docs', 'style', 'refactor']

            for (let i = 0; i < config.sectionCount * 2; i++) {
              commits.push({
                hash: `hash${i}`,
                shortHash: `h${i}`,
                type: types[i % config.sectionCount],
                subject: `Commit ${i}`,
                author: { name: 'Author', email: 'author@example.com' },
                date: new Date().toISOString(),
              })
            }

            const sections: ChangelogSection[] = []
            for (let i = 0; i < config.sectionCount; i++) {
              sections.push({
                title: types[i],
                type: types[i],
                commits: commits.filter(c => c.type === types[i]),
                priority: i,
              })
            }

            const content: ChangelogContent = {
              version: '1.0.0',
              date: new Date().toISOString(),
              sections,
              commits,
            }

            const translator = new MultiLangTranslator({
              targetLanguages: config.languages,
              translateCommits: false,
              translateSections: false,
            })

            const results = await translator.translate(content)

            // 验证所有语言版本的章节顺序一致
            const firstSectionTypes = results[0].content.sections.map(s => s.type)

            for (let i = 1; i < results.length; i++) {
              const currentSectionTypes = results[i].content.sections.map(s => s.type)
              expect(currentSectionTypes).toEqual(firstSectionTypes)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Property 9.4: 提交数量保持一致
     * Validates: Requirements 10.5
     *
     * 所有语言版本的提交总数应该相同
     */
    it('Property 9.4: 所有语言版本的提交数量应该相同', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            commitCount: fc.integer({ min: 1, max: 20 }),
            languages: fc.shuffledSubarray(
              MultiLangTranslator.getSupportedLanguages(),
              { minLength: 2, maxLength: 4 }
            ),
          }),
          async (config) => {
            const content = createTestChangelogContent('1.0.0', config.commitCount)

            const translator = new MultiLangTranslator({
              targetLanguages: config.languages,
              translateCommits: false,
              translateSections: false,
            })

            const results = await translator.translate(content)

            // 验证所有结果的提交数量相同
            const expectedCount = content.commits.length

            for (const result of results) {
              expect(result.content.commits).toHaveLength(expectedCount)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
