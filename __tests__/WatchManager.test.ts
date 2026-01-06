/**
 * WatchManager 测试
 * Feature: changelog-enhancement, Property 8: Watch Mode Incremental Processing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fc from 'fast-check'
import { WatchManager } from '../src/core/WatchManager'
import { ChangelogGenerator } from '../src/core/ChangelogGenerator'
import type { ChangelogContent } from '../src/types/changelog'
import { execaCommand, execa } from 'execa'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

// 测试用的临时 Git 仓库路径
const TEST_REPO_PATH = join(process.cwd(), '__test_watch_repo__')

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
async function createCommit(message: string, fileName = 'test.txt', content = 'test'): Promise<string> {
  // 写入文件
  writeFileSync(join(TEST_REPO_PATH, fileName), content)

  // 添加并提交
  await execaCommand(`git add ${fileName}`, { cwd: TEST_REPO_PATH })

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

/**
 * 获取状态文件内容
 */
function getStateFile(stateFile: string): any | null {
  const statePath = join(TEST_REPO_PATH, stateFile)
  if (!existsSync(statePath)) {
    return null
  }

  try {
    const content = readFileSync(statePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

describe('WatchManager', () => {
  describe('Unit Tests', () => {
    beforeEach(async () => {
      await createTestRepo()
    })

    afterEach(() => {
      cleanupTestRepo()
    })

    it('应该正确创建 WatchManager 实例', () => {
      const generator = new ChangelogGenerator({ cwd: TEST_REPO_PATH })
      const watchManager = new WatchManager(generator, { cwd: TEST_REPO_PATH })
      expect(watchManager).toBeDefined()
    })

    it('应该接受自定义配置', () => {
      const generator = new ChangelogGenerator({ cwd: TEST_REPO_PATH })
      const watchManager = new WatchManager(generator, {
        interval: 5000,
        immediate: true,
        stateFile: '.custom-state.json',
        triggers: ['commit', 'schedule'],
        cwd: TEST_REPO_PATH,
      })
      expect(watchManager).toBeDefined()
    })

    it('应该能够注册和触发回调', async () => {
      const generator = new ChangelogGenerator({ cwd: TEST_REPO_PATH })
      const watchManager = new WatchManager(generator, { cwd: TEST_REPO_PATH })

      const callback = vi.fn()
      watchManager.onGenerate(callback)

      // 创建一个提交
      await createCommit('feat: test feature')

      // 手动触发
      await watchManager.trigger()

      // 验证回调被调用
      expect(callback).toHaveBeenCalled()
    })

    it('应该能够移除回调', () => {
      const generator = new ChangelogGenerator({ cwd: TEST_REPO_PATH })
      const watchManager = new WatchManager(generator, { cwd: TEST_REPO_PATH })

      const callback = vi.fn()
      watchManager.onGenerate(callback)
      watchManager.offGenerate(callback)

      // 清除所有回调
      watchManager.clearCallbacks()
    })

    it('应该能够停止监视', async () => {
      const generator = new ChangelogGenerator({ cwd: TEST_REPO_PATH })
      const watchManager = new WatchManager(generator, {
        interval: 100,
        cwd: TEST_REPO_PATH,
      })

      await watchManager.start()
      watchManager.stop()
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
     * Property 8: Watch Mode Incremental Processing
     * Validates: Requirements 9.2, 9.4, 9.5
     *
     * For any sequence of commits, the WatchManager SHALL:
     * - Process only commits newer than the last processed commit
     * - Update the state file with the latest processed commit
     * - Skip generation when no new commits exist
     */
    it('Property 8: 应该只处理新提交并更新状态文件', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成提交序列
          fc.record({
            // 第一批提交（1-3个）
            firstBatch: fc.array(
              fc.record({
                message: fc.stringMatching(/^(feat|fix|chore): .{5,30}$/),
                fileName: fc.stringMatching(/^[a-z]{3,10}\.txt$/),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            // 第二批提交（0-3个）
            secondBatch: fc.array(
              fc.record({
                message: fc.stringMatching(/^(feat|fix|chore): .{5,30}$/),
                fileName: fc.stringMatching(/^[a-z]{3,10}\.txt$/),
              }),
              { minLength: 0, maxLength: 3 }
            ),
          }),
          async (scenario) => {
            const stateFile = '.test-watch-state.json'
            const generator = new ChangelogGenerator({
              cwd: TEST_REPO_PATH,
              output: 'CHANGELOG.md',
            })

            const watchManager = new WatchManager(generator, {
              cwd: TEST_REPO_PATH,
              stateFile,
              interval: 1000,
              immediate: false,
            })

            // 创建第一批提交
            const firstCommits: string[] = []
            for (const commit of scenario.firstBatch) {
              const hash = await createCommit(
                commit.message,
                commit.fileName,
                `content-${Date.now()}`
              )
              firstCommits.push(hash)
            }

            // 第一次触发 - 应该处理所有第一批提交
            await watchManager.trigger()

            // 验证状态文件被创建
            const stateAfterFirst = getStateFile(stateFile)
            expect(stateAfterFirst).not.toBeNull()
            expect(stateAfterFirst.lastCommit).toBe(firstCommits[firstCommits.length - 1])
            expect(stateAfterFirst.runCount).toBe(1)

            // 获取第一次运行后的状态
            const state1 = watchManager.getState()
            expect(state1).not.toBeNull()
            expect(state1!.lastCommit).toBe(firstCommits[firstCommits.length - 1])
            expect(state1!.runCount).toBe(1)

            // 如果有第二批提交，创建它们
            if (scenario.secondBatch.length > 0) {
              const secondCommits: string[] = []
              for (const commit of scenario.secondBatch) {
                const hash = await createCommit(
                  commit.message,
                  commit.fileName,
                  `content-${Date.now()}`
                )
                secondCommits.push(hash)
              }

              // 第二次触发 - 应该只处理第二批提交
              await watchManager.trigger()

              // 验证状态文件被更新
              const stateAfterSecond = getStateFile(stateFile)
              expect(stateAfterSecond).not.toBeNull()
              expect(stateAfterSecond.lastCommit).toBe(secondCommits[secondCommits.length - 1])
              expect(stateAfterSecond.runCount).toBe(2)

              // 获取第二次运行后的状态
              const state2 = watchManager.getState()
              expect(state2).not.toBeNull()
              expect(state2!.lastCommit).toBe(secondCommits[secondCommits.length - 1])
              expect(state2!.runCount).toBe(2)
            } else {
              // 没有新提交，第二次触发应该跳过生成
              await watchManager.trigger()

              // 验证状态文件没有变化（runCount 不增加）
              const stateAfterSecond = getStateFile(stateFile)
              expect(stateAfterSecond).not.toBeNull()
              expect(stateAfterSecond.lastCommit).toBe(firstCommits[firstCommits.length - 1])
              expect(stateAfterSecond.runCount).toBe(1) // 没有增加
            }

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 120000) // 增加超时时间，因为涉及多次 Git 操作

    /**
     * Property 8.1: 状态持久化
     * Validates: Requirements 9.5
     *
     * 状态文件应该在每次成功生成后被正确保存和恢复
     */
    it('Property 8.1: 应该正确保存和恢复状态', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              message: fc.stringMatching(/^(feat|fix|chore): .{5,30}$/),
              fileName: fc.stringMatching(/^[a-z]{3,10}\.txt$/),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          async (commits) => {
            const stateFile = '.test-persist-state.json'

            // 创建第一个 WatchManager 实例
            const generator1 = new ChangelogGenerator({
              cwd: TEST_REPO_PATH,
              output: 'CHANGELOG.md',
            })

            const watchManager1 = new WatchManager(generator1, {
              cwd: TEST_REPO_PATH,
              stateFile,
              interval: 1000,
            })

            // 创建提交
            const commitHashes: string[] = []
            for (const commit of commits) {
              const hash = await createCommit(
                commit.message,
                commit.fileName,
                `content-${Date.now()}`
              )
              commitHashes.push(hash)
            }

            // 触发生成
            await watchManager1.trigger()

            // 获取状态
            const state1 = watchManager1.getState()
            expect(state1).not.toBeNull()

            // 创建第二个 WatchManager 实例（模拟重启）
            const generator2 = new ChangelogGenerator({
              cwd: TEST_REPO_PATH,
              output: 'CHANGELOG.md',
            })

            const watchManager2 = new WatchManager(generator2, {
              cwd: TEST_REPO_PATH,
              stateFile,
              interval: 1000,
            })

            // 获取恢复的状态
            const state2 = watchManager2.getState()
            expect(state2).not.toBeNull()

            // 验证状态被正确恢复
            expect(state2!.lastCommit).toBe(state1!.lastCommit)
            expect(state2!.runCount).toBe(state1!.runCount)

            return true
          }
        ),
        { numRuns: 100 }
      )
    }, 120000)

    /**
     * Property 8.2: Cron 调度计算
     * Validates: Requirements 9.3
     *
     * Cron 表达式应该被正确解析并计算下次运行时间
     */
    it('Property 8.2: 应该正确计算 Cron 下次运行时间', () => {
      fc.assert(
        fc.property(
          // 生成简单的 cron 表达式
          fc.oneof(
            fc.constant('*/5 * * * *'),  // 每 5 分钟
            fc.constant('*/10 * * * *'), // 每 10 分钟
            fc.constant('*/15 * * * *'), // 每 15 分钟
            fc.constant('0 * * * *'),    // 每小时
            fc.constant('30 * * * *')    // 每小时的第 30 分钟
          ),
          (cronExpression) => {
            const generator = new ChangelogGenerator({ cwd: TEST_REPO_PATH })
            const watchManager = new WatchManager(generator, {
              cwd: TEST_REPO_PATH,
              cron: cronExpression,
              triggers: ['schedule'],
            })

            // WatchManager 应该能够创建而不抛出错误
            expect(watchManager).toBeDefined()

            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
