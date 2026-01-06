/**
 * Security Section Ordering 测试
 * Feature: changelog-enhancement, Property 3: Security Section Ordering
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { ChangelogGenerator } from '../src/core/ChangelogGenerator'
import type { ChangelogCommit } from '../types/changelog'
import { execaCommand, execa } from 'execa'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'

// 测试用的临时 Git 仓库路径
const TEST_REPO_PATH = join(process.cwd(), '__test_security_repo__')

/**
 * 创建测试 Git 仓库
 */
async function createTestRepo(): Promise<void> {
  mkdirSync(TEST_REPO_PATH, { recursive: true })
  await execaCommand('git init', { cwd: TEST_REPO_PATH })
  await execaCommand('git config user.name "Test User"', { cwd: TEST_REPO_PATH })
  await execaCommand('git config user.email "test@example.com"', { cwd: TEST_REPO_PATH })

  // 创建初始提交
  writeFileSync(join(TEST_REPO_PATH, 'README.md'), '# Test')
  await execaCommand('git add .', { cwd: TEST_REPO_PATH })
  await execa('git', ['commit', '-m', 'Initial commit'], { cwd: TEST_REPO_PATH })
}

/**
 * 清理测试 Git 仓库
 */
function cleanupTestRepo(): void {
  try {
    rmSync(TEST_REPO_PATH, { recursive: true, force: true })
  } catch (error) {
    // 忽略清理错误
  }
}

/**
 * 创建提交
 */
async function createCommit(message: string, filename: string = 'test.txt'): Promise<void> {
  writeFileSync(join(TEST_REPO_PATH, filename), `Content: ${Date.now()}`)
  await execaCommand('git add .', { cwd: TEST_REPO_PATH })
  await execa('git', ['commit', '-m', message], { cwd: TEST_REPO_PATH })
}

/**
 * 生成随机的安全关键词
 */
const securityKeywordArbitrary = fc.constantFrom(
  'security',
  'vulnerability',
  'CVE-2024-1234',
  'xss',
  'sql injection'
)

/**
 * 生成随机的非安全提交消息
 */
const normalCommitMessageArbitrary = fc.oneof(
  fc.constant('feat: add new feature'),
  fc.constant('fix: fix bug'),
  fc.constant('docs: update documentation'),
  fc.constant('refactor: refactor code'),
  fc.constant('test: add tests')
)

/**
 * 生成随机的安全提交消息
 */
const securityCommitMessageArbitrary = fc.tuple(
  fc.constantFrom('fix', 'feat', 'chore'),
  securityKeywordArbitrary
).map(([type, keyword]) => `${type}: ${keyword} fix`)

describe('Security Section Ordering', () => {
  describe('Unit Tests', () => {
    it('应该在启用安全扫描时创建安全章节', async () => {
      cleanupTestRepo()
      await createTestRepo()

      // 创建一个安全相关的提交
      await createCommit('fix: security vulnerability in auth')

      const generator = new ChangelogGenerator({
        cwd: TEST_REPO_PATH,
        scanSecurity: true,
      })

      const content = await generator.generate('1.0.0')

      // 验证：应该有安全章节
      const securitySection = content.sections.find(s => s.type === 'security')
      expect(securitySection).toBeDefined()
      expect(securitySection?.title).toContain('安全')

      cleanupTestRepo()
    })

    it('应该将安全章节放在最前面', async () => {
      cleanupTestRepo()
      await createTestRepo()

      // 创建多个不同类型的提交
      await createCommit('feat: add new feature')
      await createCommit('fix: security vulnerability')
      await createCommit('docs: update docs')

      const generator = new ChangelogGenerator({
        cwd: TEST_REPO_PATH,
        scanSecurity: true,
      })

      const content = await generator.generate('1.0.0')

      // 验证：安全章节应该在第一个
      expect(content.sections[0].type).toBe('security')

      cleanupTestRepo()
    })

    it('应该在没有安全问题时不创建安全章节', async () => {
      cleanupTestRepo()
      await createTestRepo()

      // 创建普通提交
      await createCommit('feat: add new feature')
      await createCommit('fix: fix normal bug')

      const generator = new ChangelogGenerator({
        cwd: TEST_REPO_PATH,
        scanSecurity: true,
      })

      const content = await generator.generate('1.0.0')

      // 验证：不应该有安全章节
      const securitySection = content.sections.find(s => s.type === 'security')
      expect(securitySection).toBeUndefined()

      cleanupTestRepo()
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Property 3: Security Section Ordering
     * Validates: Requirements 2.3, 2.4
     *
     * For any changelog containing security issues,
     * the Security section SHALL appear before all other change type sections.
     */
    it('Property 3: 安全章节应该始终在最前面', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // 生成随机数量的安全提交
            securityCommits: fc.array(securityCommitMessageArbitrary, { minLength: 1, maxLength: 3 }),
            // 生成随机数量的普通提交
            normalCommits: fc.array(normalCommitMessageArbitrary, { minLength: 1, maxLength: 5 }),
          }),
          async ({ securityCommits, normalCommits }) => {
            cleanupTestRepo()
            await createTestRepo()

            // 创建所有提交（混合顺序）
            const allCommits = [...normalCommits, ...securityCommits].sort(() => Math.random() - 0.5)

            for (let i = 0; i < allCommits.length; i++) {
              await createCommit(allCommits[i], `file${i}.txt`)
            }

            const generator = new ChangelogGenerator({
              cwd: TEST_REPO_PATH,
              scanSecurity: true,
            })

            const content = await generator.generate('1.0.0')

            // 验证：如果有安全章节，它应该在第一个位置
            const securitySectionIndex = content.sections.findIndex(s => s.type === 'security')

            if (securitySectionIndex !== -1) {
              // 安全章节存在，应该在第一个位置
              expect(securitySectionIndex).toBe(0)

              // 验证：安全章节应该包含安全提交
              const securitySection = content.sections[securitySectionIndex]
              expect(securitySection.commits.length).toBeGreaterThan(0)

              // 验证：所有其他章节都应该在安全章节之后
              for (let i = 1; i < content.sections.length; i++) {
                expect(content.sections[i].type).not.toBe('security')
              }
            }

            cleanupTestRepo()
            return true
          }
        ),
        { numRuns: 20 } // 减少运行次数因为涉及 Git 操作
      )
    }, 120000) // 增加超时时间

    /**
     * Property 3.1: 安全章节优先级
     * Validates: Requirements 2.3
     */
    it('Property 3.1: 安全章节的优先级应该最高', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(securityCommitMessageArbitrary, normalCommitMessageArbitrary),
            { minLength: 2, maxLength: 8 }
          ),
          async (commitMessages) => {
            // 确保至少有一个安全提交
            const hasSecurityCommit = commitMessages.some(msg =>
              msg.toLowerCase().includes('security') ||
              msg.toLowerCase().includes('vulnerability') ||
              msg.toLowerCase().includes('cve') ||
              msg.toLowerCase().includes('xss') ||
              msg.toLowerCase().includes('injection')
            )

            if (!hasSecurityCommit) {
              return true // 跳过没有安全提交的场景
            }

            cleanupTestRepo()
            await createTestRepo()

            for (let i = 0; i < commitMessages.length; i++) {
              await createCommit(commitMessages[i], `file${i}.txt`)
            }

            const generator = new ChangelogGenerator({
              cwd: TEST_REPO_PATH,
              scanSecurity: true,
            })

            const content = await generator.generate('1.0.0')

            // 验证：安全章节应该有最高优先级（-1）
            const securitySection = content.sections.find(s => s.type === 'security')
            if (securitySection) {
              expect(securitySection.priority).toBe(-1)

              // 验证：所有其他章节的优先级都应该大于安全章节
              for (const section of content.sections) {
                if (section.type !== 'security') {
                  const priority = section.priority ?? 999
                  expect(priority).toBeGreaterThan(-1)
                }
              }
            }

            cleanupTestRepo()
            return true
          }
        ),
        { numRuns: 20 }
      )
    }, 120000)

    /**
     * Property 3.2: 安全徽章添加
     * Validates: Requirements 2.2
     */
    it('Property 3.2: 安全提交应该包含安全徽章', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(securityCommitMessageArbitrary, { minLength: 1, maxLength: 3 }),
          async (securityCommits) => {
            cleanupTestRepo()
            await createTestRepo()

            for (let i = 0; i < securityCommits.length; i++) {
              await createCommit(securityCommits[i], `file${i}.txt`)
            }

            const generator = new ChangelogGenerator({
              cwd: TEST_REPO_PATH,
              scanSecurity: true,
            })

            const content = await generator.generate('1.0.0')

            const securitySection = content.sections.find(s => s.type === 'security')

            if (securitySection) {
              // 验证：所有安全提交都应该有徽章
              for (const commit of securitySection.commits) {
                // 徽章应该是 emoji 字符
                const badges = ['🚨', '⚠️', '⚡', 'ℹ️', '🔒']
                const hasBadge = badges.some(badge => commit.subject.includes(badge))
                expect(hasBadge).toBe(true)
              }
            }

            cleanupTestRepo()
            return true
          }
        ),
        { numRuns: 20 }
      )
    }, 120000)
  })
})
