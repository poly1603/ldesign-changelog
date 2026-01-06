/**
 * @module utils/logger
 * @description 日志工具模块，提供统一的日志输出功能
 *
 * @example
 * ```typescript
 * import { logger, createLogger, LogLevel } from '@ldesign/changelog/utils'
 *
 * // 使用默认日志器
 * logger.info('Processing...')
 * logger.success('Done!')
 * logger.warn('Warning message')
 * logger.error('Error occurred', new Error('details'))
 *
 * // 创建自定义日志器
 * const customLogger = createLogger({
 *   debug: true,
 *   prefix: '[MyApp]',
 *   level: 'debug'
 * })
 * ```
 */

import chalk from 'chalk'
import ora, { Ora } from 'ora'

/**
 * 日志级别枚举
 * @description 定义日志的严重程度，从低到高依次为: debug < info < success < warn < error
 */
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error'

/**
 * 日志级别优先级映射
 * @internal
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  success: 2,
  warn: 3,
  error: 4,
}

/**
 * 日志器配置接口
 * @interface LoggerConfig
 */
export interface LoggerConfig {
  /**
   * 是否启用调试模式
   * @default false
   */
  debug?: boolean

  /**
   * 是否静默模式（不输出任何日志）
   * @default false
   */
  silent?: boolean

  /**
   * 日志前缀
   * @default ''
   * @example '[MyApp]'
   */
  prefix?: string

  /**
   * 最低日志级别，低于此级别的日志将不会输出
   * @default 'info' (debug 模式下为 'debug')
   */
  level?: LogLevel

  /**
   * 是否显示时间戳
   * @default false
   */
  showTimestamp?: boolean
}

/**
 * 将 unknown 类型转换为 Error
 * @param error - 未知类型的错误
 * @returns Error 对象
 * @internal
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }
  if (typeof error === 'string') {
    return new Error(error)
  }
  return new Error(String(error))
}

/**
 * 日志器类
 * @description 提供统一的日志输出功能，支持多种日志级别、加载动画、调试模式等
 *
 * @example
 * ```typescript
 * const logger = new Logger({ debug: true, prefix: '[App]' })
 * logger.info('Starting application...')
 * logger.debug('Debug info', { config: {} })
 * ```
 */
export class Logger {
  private config: Required<LoggerConfig>
  private spinner: Ora | null = null

  /**
   * 创建日志器实例
   * @param config - 日志器配置
   */
  constructor(config: LoggerConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      silent: config.silent ?? false,
      prefix: config.prefix ?? '',
      level: config.level ?? (config.debug ? 'debug' : 'info'),
      showTimestamp: config.showTimestamp ?? false,
    }
  }

  /**
   * 检查是否应该输出指定级别的日志
   * @param level - 日志级别
   * @returns 是否应该输出
   * @internal
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.config.silent) return false
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level]
  }

  /**
   * 获取格式化的前缀（包含可选的时间戳）
   * @returns 格式化的前缀字符串
   * @internal
   */
  private getPrefix(): string {
    const parts: string[] = []

    if (this.config.showTimestamp) {
      const now = new Date()
      const timestamp = now.toISOString().replace('T', ' ').slice(0, 19)
      parts.push(chalk.gray(`[${timestamp}]`))
    }

    if (this.config.prefix) {
      parts.push(this.config.prefix)
    }

    return parts.length > 0 ? `${parts.join(' ')} ` : ''
  }

  /**
   * 输出信息日志
   * @param message - 日志消息
   * @param data - 可选的附加数据
   * @returns 日志器实例（支持链式调用）
   *
   * @example
   * ```typescript
   * logger.info('Processing file...')
   * logger.info('Found items', { count: 10 })
   * ```
   */
  info(message: string, data?: unknown): this {
    if (!this.shouldLog('info')) return this
    console.log(`${this.getPrefix()}${chalk.blue('ℹ')} ${message}`)
    if (data !== undefined) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)))
    }
    return this
  }

  /**
   * 输出成功日志
   * @param message - 日志消息
   * @param data - 可选的附加数据
   * @returns 日志器实例（支持链式调用）
   *
   * @example
   * ```typescript
   * logger.success('Task completed!')
   * ```
   */
  success(message: string, data?: unknown): this {
    if (!this.shouldLog('success')) return this
    console.log(`${this.getPrefix()}${chalk.green('✓')} ${message}`)
    if (data !== undefined) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)))
    }
    return this
  }

  /**
   * 输出警告日志
   * @param message - 日志消息
   * @param error - 可选的错误对象或附加数据
   * @returns 日志器实例（支持链式调用）
   *
   * @example
   * ```typescript
   * logger.warn('Deprecated API usage')
   * logger.warn('Cache miss', new Error('details'))
   * ```
   */
  warn(message: string, error?: unknown): this {
    if (!this.shouldLog('warn')) return this
    console.warn(`${this.getPrefix()}${chalk.yellow('⚠')} ${message}`)
    if (error !== undefined && this.config.debug) {
      const err = toError(error)
      console.warn(chalk.yellow(err.stack || err.message))
    }
    return this
  }

  /**
   * 输出错误日志
   * @param message - 日志消息
   * @param error - 可选的错误对象
   * @returns 日志器实例（支持链式调用）
   *
   * @example
   * ```typescript
   * logger.error('Failed to process')
   * logger.error('IO Error', new Error('File not found'))
   * ```
   */
  error(message: string, error?: unknown): this {
    if (!this.shouldLog('error')) return this
    console.error(`${this.getPrefix()}${chalk.red('✖')} ${message}`)
    if (error !== undefined && this.config.debug) {
      const err = toError(error)
      console.error(chalk.red(err.stack || err.message))
    }
    return this
  }

  /**
   * 输出调试日志（仅在 debug 模式下显示）
   * @param message - 日志消息
   * @param data - 可选的附加数据
   * @returns 日志器实例（支持链式调用）
   *
   * @example
   * ```typescript
   * logger.debug('Parsed config', config)
   * logger.debug('Cache hit for key: user_123')
   * ```
   */
  debug(message: string, data?: unknown): this {
    if (!this.shouldLog('debug')) return this
    console.log(`${this.getPrefix()}${chalk.gray('⚙')} ${chalk.gray(message)}`)
    if (data !== undefined) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)))
    }
    return this
  }

  /**
   * 输出原始日志（不带图标）
   * @param message - 日志消息
   * @returns 日志器实例（支持链式调用）
   */
  log(message: string): this {
    if (this.config.silent) return this
    console.log(`${this.getPrefix()}${message}`)
    return this
  }

  /**
   * 输出空行
   * @param count - 空行数量
   * @returns 日志器实例（支持链式调用）
   */
  newLine(count = 1): this {
    if (this.config.silent) return this
    for (let i = 0; i < count; i++) {
      console.log()
    }
    return this
  }

  /**
   * 开始加载动画
   * @param text - 加载提示文本
   * @returns Ora 实例
   *
   * @example
   * ```typescript
   * const spinner = logger.startSpinner('Loading...')
   * // ... do work
   * logger.stopSpinner(true, 'Done!')
   * ```
   */
  startSpinner(text: string): Ora {
    if (this.config.silent) {
      return ora({ isSilent: true })
    }
    this.spinner = ora({
      text,
      prefixText: this.getPrefix().trim(),
    }).start()
    return this.spinner
  }

  /**
   * 停止加载动画
   * @param succeed - 是否成功（决定图标样式）
   * @param text - 可选的完成文本
   * @returns 日志器实例（支持链式调用）
   */
  stopSpinner(succeed = true, text?: string): this {
    if (!this.spinner) return this

    if (succeed) {
      this.spinner.succeed(text)
    } else {
      this.spinner.fail(text)
    }
    this.spinner = null
    return this
  }

  /**
   * 更新加载动画文本
   * @param text - 新的提示文本
   * @returns 日志器实例（支持链式调用）
   */
  updateSpinner(text: string): this {
    if (this.spinner) {
      this.spinner.text = text
    }
    return this
  }

  /**
   * 设置配置
   * @param config - 部分配置对象
   * @returns 日志器实例（支持链式调用）
   */
  setConfig(config: Partial<LoggerConfig>): this {
    this.config = { ...this.config, ...config }
    // 如果启用 debug 且没有明确设置 level，自动调整为 debug 级别
    if (config.debug && !config.level) {
      this.config.level = 'debug'
    }
    return this
  }

  /**
   * 获取当前配置
   * @returns 当前日志器配置
   */
  getConfig(): Readonly<Required<LoggerConfig>> {
    return { ...this.config }
  }

  /**
   * 创建子日志器（继承当前配置并可覆盖部分配置）
   * @param config - 覆盖配置
   * @returns 新的日志器实例
   *
   * @example
   * ```typescript
   * const appLogger = logger.child({ prefix: '[App]' })
   * const dbLogger = logger.child({ prefix: '[DB]' })
   * ```
   */
  child(config: Partial<LoggerConfig>): Logger {
    return new Logger({
      ...this.config,
      ...config,
    })
  }
}

/**
 * 默认日志器实例
 * @description 全局共享的日志器实例，可直接使用
 *
 * @example
 * ```typescript
 * import { logger } from '@ldesign/changelog/utils'
 * logger.info('Hello!')
 * ```
 */
export const logger = new Logger()

/**
 * 创建日志器工厂函数
 * @param config - 日志器配置
 * @returns 新的日志器实例
 *
 * @example
 * ```typescript
 * const customLogger = createLogger({
 *   debug: true,
 *   prefix: '[Custom]',
 *   showTimestamp: true
 * })
 * ```
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config)
}

