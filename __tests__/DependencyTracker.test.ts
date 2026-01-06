/**
 * DependencyTracker 测试
 * Feature: changelog-enhancement, Property 1: Dependency Change Detection and Recording
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { DependencyTracker } from '../src/core/DependencyTracker'
import type { DependencyChange } from '../src/core/DependencyTracker'
import type { ChangelogCommit } from '../src/types/changelog'
import { execaCommand, execa } from 'execa'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'

// 测试用的临时 Git 仓库路径
const TEST_REPO_PATH = join(process.cwd(), '__test_repo__')

/**
 * 创建测试 Git 仓库
 */
async function createTestRepo(): Promise<void> {
  // 创建目录
  mkdirSync(TEST_REPO_PATH, { recursive: true })

  // 初始化 Git 仓库
  await execaCommand('git init', { cwd: TEST_REPO_PATH })
  await execaCommand('git config user.name "Test User"', { cwd: TEST_REPO_PATH })
  await execaCommand('git config user.email "test@example.com"', { cwd: TEST_REPO_PATH })
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
 * 在测试仓库中创建提交
 */
async function createCommit(packageJson: any, message: string): Promise<string> {
  // 写入 package.json
  writeFileSync(
    join(TEST_REPO_PATH, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  )

  // 添加并提交
  await execaCommand('git add package.json', { cwd: TEST_REPO_PATH })

  // 检查是否有变更需要提交
  try {
    const { stdout: status } = await execaCommand('git status --porcelain', { cwd: TEST_REPO_PATH })
    if (!status.trim()) {
      // 没有变更，返回当前 HEAD
      const { stdout } = await execaCommand('git rev-parse HEAD', { cwd: TEST_REPO_PATH })
      return stdout.trim()
    }
  } catch (error) {
    // 如果是第一次提交，status 可能会失败，继续执行提交
  }

  // 使用 execa 而不是 execaCommand 来避免 Windows 引号转义问题
  await execa('git', ['commit', '-m', message], { cwd: TEST_REPO_PATH })

  // 获取提交 hash
  const { stdout } = await execaCommand('git rev-parse HEAD', { cwd: TEST_REPO_PATH })
  return stdout.trim()
}

describe('DependencyTracker', () => {
  describe('Unit Tests', () => {
    it('应该正确创建 DependencyTracker 实例', () => {
      const tracker = new DependencyTracker()
      expect(tracker).toBeDefined()
    })

    it('应该接受自定义配置', () => {
      const tracker = new DependencyTracker({
        includeDevDependencies: false,
        includePeerDependencies: false,
      })
      expect(tracker).toBeDefined()
    })

    it('应该格式化依赖变更为 ChangelogSection', () => {
      const tracker = new DependencyTracker()
      const changes: DependencyChange[] = [
        {
          name: 'lodash',
          type: 'added',
          newVersion: '4.17.21',
          dependencyType: 'dependencies',
        },
      ]

      const section = tracker.formatChanges(changes)
      expect(section.title).toBe('📦 依赖更新')
      expect(section.type).toBe('dependencies')
      expect(section.commits).toHaveLength(1)
      expect(section.commits[0].subject).toContain('lodash')
    })
  })

  describe('Property-Based Tests', () => {
    beforeEach(async () => {
      await createTestRepo()
    })

    afterEach(() => {
      cleanupTestRepo()
    })

    /**
     * Property 1: Dependency Change Detection and Recording
     * Validates: Requirements 1.1, 1.2, 1.3, 1.4
     *
     * For any set of commits containing package.json modifications,
     * the DependencyTracker SHALL correctly identify all added, updated,
     * and removed dependencies with accurate version information.
     */
    it('Property 1: 应该正确检测所有依赖变更（added/updated/removed）', async () => {
      // 生成有效的包名（字母数字和连字符）
      const validPackageName = fc.stringMatching(/^[a-z][a-z0-9-]{2,19}$/)
      // 生成有效的版本号
      const validVersion = fc.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+$/)

      await fc.assert(
        fc.asyncProperty(
          // 生成随机的依赖变更场景
          fc.record({
            // 初始依赖
            initialDeps: fc.dictionary(
              validPackageName,
              validVersion,
              { minKeys: 0, maxKeys: 5 }
            ),
            // 要添加的依赖
            addedDeps: fc.dictionary(
              validPackageName,
              validVersion,
              { minKeys: 0, maxKeys: 3 }
            ),
            // 要更新的依赖（从初始依赖中选择）
            updatedDeps: fc.array(
              fc.record({
                name: validPackageName,
                newVersion: validVersion,
              }),
              { maxLength: 2 }
            ),
            // 要移除的依赖（从初始依赖中选择）
            removedDeps: fc.array(
              validPackageName,
              { maxLength: 2 }
            ),
          }),
          async (scenario) => {
            // 跳过没有实际变更的场景
            const hasActualChanges =
              Object.keys(scenario.addedDeps).some(name => !(name in scenario.initialDeps)) ||
              scenario.updatedDeps.some(u => u.name in scenario.initialDeps && scenario.initialDeps[u.name] !== u.newVersion) ||
              scenario.removedDeps.some(name => name in scenario.initialDeps)

            if (!hasActualChanges) {
              return true // 跳过这个场景
            }

            // 创建初始 package.json
            const initialPackageJson = {
              name: 'test-package',
              version: '1.0.0',
              dependencies: scenario.initialDeps,
            }

            // 创建初始提交
            await createCommit(initialPackageJson, 'Initial commit')

            // 创建修改后的 package.json
            const modifiedDeps = { ...scenario.initialDeps }

            // 添加新依赖
            Object.assign(modifiedDeps, scenario.addedDeps)

            // 更新依赖
            for (const update of scenario.updatedDeps) {
              if (update.name in modifiedDeps) {
                modifiedDeps[update.name] = update.newVersion
              }
            }

            // 移除依赖
            for (const removed of scenario.removedDeps) {
              delete modifiedDeps[removed]
            }

            const modifiedPackageJson = {
              ...initialPackageJson,
              dependencies: modifiedDeps,
            }

            // 创建修改提交
            const commitHash = await createCommit(
              modifiedPackageJson,
              'Update dependencies'
            )

            // 获取短 hash
            const { stdout: shortHash } = await execaCommand(
              `git rev-parse --short ${commitHash}`,
              { cwd: TEST_REPO_PATH }
            )

            // 创建 ChangelogCommit
            const commit: ChangelogCommit = {
              hash: commitHash,
              shortHash: shortHash.trim(),
              type: 'chore',
              scope: 'deps',
              subject: 'Update dependencies',
              author: {
                name: 'Test User',
                email: 'test@example.com',
              },
              date: new Date().toISOString(),
            }

            // 使用 DependencyTracker 提取变更
            const tracker = new DependencyTracker({ cwd: TEST_REPO_PATH })
            const changes = await tracker.extractChanges([commit])

            // 验证：所有添加的依赖都被检测到
            const addedChanges = changes.filter(c => c.type === 'added')
            const expectedAdded = Object.keys(scenario.addedDeps).filter(
              name => !(name in scenario.initialDeps)
            )
            expect(addedChanges.length).toBeGreaterThanOrEqual(expectedAdded.length)

            // 验证：所有更新的依赖都被检测到
            const updatedChanges = changes.filter(c => c.type === 'updated')
            const expectedUpdated = scenario.updatedDeps.filter(
              u => u.name in scenario.initialDeps && scenario.initialDeps[u.name] !== u.newVersion
            )
            expect(updatedChanges.length).toBeGreaterThanOrEqual(expectedUpdated.length)

            // 验证：所有移除的依赖都被检测到
            const removedChanges = changes.filter(c => c.type === 'removed')
            const expectedRemoved = scenario.removedDeps.filter(
              name => name in scenario.initialDeps
            )
            expect(removedChanges.length).toBeGreaterThanOrEqual(expectedRemoved.length)

            // 验证：每个变更都有正确的版本信息
            for (const change of changes) {
              if (change.type === 'added') {
                expect(change.newVersion).toBeDefined()
                expect(change.oldVersion).toBeUndefined()
              } else if (change.type === 'updated') {
                expect(change.oldVersion).toBeDefined()
                expect(change.newVersion).toBeDefined()
                expect(change.oldVersion).not.toBe(change.newVersion)
              } else if (change.type === 'removed') {
                expect(change.oldVersion).toBeDefined()
                expect(change.newVersion).toBeUndefined()
              }
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 60000) // 增加超时时间，因为涉及 Git 操作

    /**
     * Property 1.1: 支持所有依赖类型
     * Validates: Requirements 1.4
     */
    it('Property 1.1: 应该支持所有依赖类型（dependencies, devDependencies, peerDependencies, optionalDependencies）', async () => {
      // 生成有效的包名（字母数字和连字符）
      const validPackageName = fc.stringMatching(/^[a-z][a-z0-9-]{2,19}$/)
      // 生成有效的版本号
      const validVersion = fc.stringMatching(/^[0-9]+\.[0-9]+\.[0-9]+$/)

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            dependencies: fc.dictionary(
              validPackageName,
              validVersion,
              { minKeys: 0, maxKeys: 2 }
            ),
            devDependencies: fc.dictionary(
              validPackageName,
              validVersion,
              { minKeys: 0, maxKeys: 2 }
            ),
            peerDependencies: fc.dictionary(
              validPackageName,
              validVersion,
              { minKeys: 0, maxKeys: 2 }
            ),
            optionalDependencies: fc.dictionary(
              validPackageName,
              validVersion,
              { minKeys: 0, maxKeys: 2 }
            ),
          }),
          async (deps) => {
            // 跳过没有任何依赖的场景
            const hasAnyDeps =
              Object.keys(deps.dependencies || {}).length > 0 ||
              Object.keys(deps.devDependencies || {}).length > 0 ||
              Object.keys(deps.peerDependencies || {}).length > 0 ||
              Object.keys(deps.optionalDependencies || {}).length > 0

            if (!hasAnyDeps) {
              return true // 跳过这个场景
            }

            // 创建初始 package.json（空依赖）
            const initialPackageJson = {
              name: 'test-package',
              version: '1.0.0',
            }

            await createCommit(initialPackageJson, 'Initial commit')

            // 创建包含所有依赖类型的 package.json
            const modifiedPackageJson = {
              ...initialPackageJson,
              ...deps,
            }

            const commitHash = await createCommit(
              modifiedPackageJson,
              'Add all dependency types'
            )

            const { stdout: shortHash } = await execaCommand(
              `git rev-parse --short ${commitHash}`,
              { cwd: TEST_REPO_PATH }
            )

            const commit: ChangelogCommit = {
              hash: commitHash,
              shortHash: shortHash.trim(),
              type: 'chore',
              scope: 'deps',
              subject: 'Add all dependency types',
              author: {
                name: 'Test User',
                email: 'test@example.com',
              },
              date: new Date().toISOString(),
            }

            const tracker = new DependencyTracker({ cwd: TEST_REPO_PATH })
            const changes = await tracker.extractChanges([commit])

            // 验证：所有依赖类型都被检测到
            const depTypes = new Set(changes.map(c => c.dependencyType))

            if (Object.keys(deps.dependencies || {}).length > 0) {
              expect(depTypes.has('dependencies')).toBe(true)
            }
            if (Object.keys(deps.devDependencies || {}).length > 0) {
              expect(depTypes.has('devDependencies')).toBe(true)
            }
            if (Object.keys(deps.peerDependencies || {}).length > 0) {
              expect(depTypes.has('peerDependencies')).toBe(true)
            }
            if (Object.keys(deps.optionalDependencies || {}).length > 0) {
              expect(depTypes.has('optionalDependencies')).toBe(true)
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 60000)
  })
})
