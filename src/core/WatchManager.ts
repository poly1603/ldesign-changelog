/**
 * Watch Manager - 监视模式管理器
 * 
 * 负责监视 Git 提交变化并自动生成 changelog
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { ChangelogGenerator } from './ChangelogGenerator.js'
import type { ChangelogContent } from '../types/changelog.js'
import { getGitCommits, getLatestTag } from '../utils/git-utils.js'
import { logger, toError } from '../utils/logger.js'

/**
 * 监视选项
 */
export interface WatchOptions {
  /** 监视间隔（毫秒） */
  interval: number
  /** 是否立即执行 */
  immediate: boolean
  /** 状态文件路径 */
  stateFile: string
  /** 触发条件 */
  triggers: ('commit' | 'tag' | 'schedule')[]
  /** Cron 表达式 */
  cron?: string
  /** 工作目录 */
  cwd?: string
}

/**
 * 监视状态
 */
export interface WatchState {
  /** 最后处理的提交 */
  lastCommit: string
  /** 最后运行时间 */
  lastRun: Date
  /** 运行次数 */
  runCount: number
}

/**
 * 生成回调函数
 */
export type GenerateCallback = (content: ChangelogContent) => void | Promise<void>

/**
 * Watch Manager - 监视模式管理器
 */
export class WatchManager {
  private generator: ChangelogGenerator
  private options: WatchOptions
  private state: WatchState | null = null
  private intervalId: NodeJS.Timeout | null = null
  private cronIntervalId: NodeJS.Timeout | null = null
  private callbacks: GenerateCallback[] = []
  private isRunning = false

  constructor(generator: ChangelogGenerator, options: Partial<WatchOptions> = {}) {
    this.generator = generator
    this.options = {
      interval: options.interval || 60000, // 默认 1 分钟
      immediate: options.immediate ?? false,
      stateFile: options.stateFile || '.changelog-watch-state.json',
      triggers: options.triggers || ['commit'],
      cron: options.cron,
      cwd: options.cwd || process.cwd(),
    }

    // 加载状态
    this.loadState()
  }

  /**
   * 加载状态文件
   */
  private loadState(): void {
    const statePath = join(this.options.cwd!, this.options.stateFile)

    if (existsSync(statePath)) {
      try {
        const content = readFileSync(statePath, 'utf-8')
        const data = JSON.parse(content)
        this.state = {
          lastCommit: data.lastCommit,
          lastRun: new Date(data.lastRun),
          runCount: data.runCount || 0,
        }
        logger.debug(`加载状态: 最后提交 ${this.state.lastCommit}`)
      } catch (error) {
        logger.warn('无法加载状态文件，将创建新状态')
        this.state = null
      }
    }
  }

  /**
   * 保存状态文件
   */
  private saveState(): void {
    if (!this.state) return

    const statePath = join(this.options.cwd!, this.options.stateFile)

    try {
      const data = {
        lastCommit: this.state.lastCommit,
        lastRun: this.state.lastRun.toISOString(),
        runCount: this.state.runCount,
      }
      writeFileSync(statePath, JSON.stringify(data, null, 2), 'utf-8')
      logger.debug('状态已保存')
    } catch (error) {
      logger.error('保存状态文件失败', toError(error))
    }
  }

  /**
   * 获取当前状态
   */
  getState(): WatchState | null {
    return this.state ? { ...this.state } : null
  }

  /**
   * 检查是否有新提交
   */
  private async hasNewCommits(): Promise<boolean> {
    try {
      const from = this.state?.lastCommit
      const commits = await getGitCommits(from, 'HEAD', this.options.cwd)

      // getGitCommits(from, 'HEAD') returns commits AFTER 'from'
      // So if there are any commits, they are new
      return commits.length > 0
    } catch (error) {
      logger.error('检查新提交失败', toError(error))
      return false
    }
  }

  /**
   * 执行生成
   */
  private async executeGeneration(): Promise<void> {
    if (this.isRunning) {
      logger.debug('生成正在进行中，跳过本次执行')
      return
    }

    this.isRunning = true

    try {
      // 检查是否有新提交
      const hasNew = await this.hasNewCommits()

      if (!hasNew) {
        logger.info('没有新提交，跳过生成')
        return
      }

      logger.info('检测到新提交，开始生成 changelog...')

      // 获取版本号（使用最新 tag 或默认版本）
      const latestTag = await getLatestTag(this.options.cwd)
      const version = latestTag || 'Unreleased'

      // 生成 changelog
      const from = this.state?.lastCommit
      const content = await this.generator.generate(version, from, 'HEAD')

      // 写入文件
      await this.generator.write(content)

      // 获取最新提交作为新的 lastCommit
      // Use git rev-parse HEAD to get the absolute latest commit
      try {
        const { execa } = await import('execa')
        const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { cwd: this.options.cwd })
        const latestCommit = stdout.trim()

        // 更新状态
        this.state = {
          lastCommit: latestCommit,
          lastRun: new Date(),
          runCount: (this.state?.runCount || 0) + 1,
        }
        this.saveState()
      } catch (error) {
        logger.error('获取最新提交失败', toError(error))
        // Fallback: use the from commit if we can't get HEAD
        this.state = {
          lastCommit: from || '',
          lastRun: new Date(),
          runCount: (this.state?.runCount || 0) + 1,
        }
        this.saveState()
      }

      // 触发回调
      for (const callback of this.callbacks) {
        try {
          await callback(content)
        } catch (error) {
          logger.error('回调执行失败', toError(error))
        }
      }

      logger.success('Changelog 生成完成')
    } catch (error) {
      logger.error('生成失败', toError(error))
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 启动监视
   */
  async start(): Promise<void> {
    if (this.intervalId || this.cronIntervalId) {
      logger.warn('监视已在运行中')
      return
    }

    logger.info(`启动监视模式，间隔: ${this.options.interval}ms`)

    // 如果立即执行
    if (this.options.immediate) {
      await this.executeGeneration()
    }

    // 如果有 cron 表达式，使用 cron 调度
    if (this.options.cron && this.options.triggers.includes('schedule')) {
      this.startCronSchedule()
    }

    // 如果包含 commit 触发器，启动间隔检查
    if (this.options.triggers.includes('commit')) {
      this.intervalId = setInterval(() => {
        this.executeGeneration().catch(error => {
          logger.error('定时执行失败:', error)
        })
      }, this.options.interval)
    }

    logger.success('监视模式已启动')
  }

  /**
   * 启动 Cron 调度
   */
  private startCronSchedule(): void {
    if (!this.options.cron) return

    try {
      const nextRun = this.calculateNextCronRun(this.options.cron)
      const delay = nextRun.getTime() - Date.now()

      logger.info(`下次 cron 执行时间: ${nextRun.toISOString()}`)

      this.cronIntervalId = setTimeout(() => {
        this.executeGeneration().catch(error => {
          logger.error('Cron 执行失败:', error)
        })

        // 重新调度下一次执行
        this.startCronSchedule()
      }, delay)
    } catch (error) {
      logger.error('Cron 调度失败', toError(error))
    }
  }

  /**
   * 计算下次 Cron 运行时间
   * 简化版本，支持基本的 cron 表达式
   */
  private calculateNextCronRun(cronExpression: string): Date {
    // 解析 cron 表达式: 分 时 日 月 周
    const parts = cronExpression.split(' ')

    if (parts.length !== 5) {
      throw new Error('无效的 cron 表达式，应为 5 个字段: 分 时 日 月 周')
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

    const now = new Date()
    const next = new Date(now)

    // 简化实现：只支持 */n 格式（每 n 分钟/小时）
    if (minute.startsWith('*/')) {
      const interval = parseInt(minute.substring(2), 10)
      const currentMinute = now.getMinutes()
      const nextMinute = Math.ceil((currentMinute + 1) / interval) * interval

      if (nextMinute >= 60) {
        next.setHours(next.getHours() + 1)
        next.setMinutes(nextMinute - 60)
      } else {
        next.setMinutes(nextMinute)
      }
      next.setSeconds(0)
      next.setMilliseconds(0)

      return next
    }

    // 支持固定时间: 如 "0 * * * *" (每小时)
    if (minute === '0' && hour === '*') {
      next.setHours(next.getHours() + 1)
      next.setMinutes(0)
      next.setSeconds(0)
      next.setMilliseconds(0)
      return next
    }

    // 支持固定分钟: 如 "30 * * * *" (每小时的第 30 分钟)
    if (hour === '*') {
      const targetMinute = parseInt(minute, 10)
      if (now.getMinutes() >= targetMinute) {
        next.setHours(next.getHours() + 1)
      }
      next.setMinutes(targetMinute)
      next.setSeconds(0)
      next.setMilliseconds(0)
      return next
    }

    // 默认：1 小时后
    next.setHours(next.getHours() + 1)
    return next
  }

  /**
   * 停止监视
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      logger.info('间隔监视已停止')
    }

    if (this.cronIntervalId) {
      clearTimeout(this.cronIntervalId)
      this.cronIntervalId = null
      logger.info('Cron 调度已停止')
    }

    logger.success('监视模式已停止')
  }

  /**
   * 手动触发生成
   */
  async trigger(): Promise<void> {
    logger.info('手动触发生成...')
    await this.executeGeneration()
  }

  /**
   * 注册生成回调
   */
  onGenerate(callback: GenerateCallback): void {
    this.callbacks.push(callback)
  }

  /**
   * 移除生成回调
   */
  offGenerate(callback: GenerateCallback): void {
    const index = this.callbacks.indexOf(callback)
    if (index > -1) {
      this.callbacks.splice(index, 1)
    }
  }

  /**
   * 清除所有回调
   */
  clearCallbacks(): void {
    this.callbacks = []
  }
}

/**
 * 创建 Watch Manager
 */
export function createWatchManager(
  generator: ChangelogGenerator,
  options?: Partial<WatchOptions>
): WatchManager {
  return new WatchManager(generator, options)
}
