/**
 * 日志工具
 */

import chalk from 'chalk'
import ora, { Ora } from 'ora'

/**
 * 日志级别
 */
export type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug'

/**
 * 日志器配置
 */
export interface LoggerConfig {
  /** 是否启用调试模式 */
  debug?: boolean

  /** 是否静默模式 */
  silent?: boolean

  /** 前缀 */
  prefix?: string
}

/**
 * 日志器类
 */
export class Logger {
  private config: LoggerConfig
  private spinner: Ora | null = null

  constructor(config: LoggerConfig = {}) {
    this.config = {
      debug: false,
      silent: false,
      prefix: '',
      ...config,
    }
  }

  /**
   * 信息日志
   */
  info(message: string): void {
    if (this.config.silent) return
    console.log(`${this.getPrefix()}${chalk.blue('ℹ')} ${message}`)
  }

  /**
   * 成功日志
   */
  success(message: string): void {
    if (this.config.silent) return
    console.log(`${this.getPrefix()}${chalk.green('✓')} ${message}`)
  }

  /**
   * 警告日志
   */
  warn(message: string): void {
    if (this.config.silent) return
    console.warn(`${this.getPrefix()}${chalk.yellow('⚠')} ${message}`)
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error): void {
    if (this.config.silent) return
    console.error(`${this.getPrefix()}${chalk.red('✖')} ${message}`)
    if (error && this.config.debug) {
      console.error(chalk.red(error.stack || error.message))
    }
  }

  /**
   * 调试日志
   */
  debug(message: string, data?: any): void {
    if (!this.config.debug || this.config.silent) return
    console.log(`${this.getPrefix()}${chalk.gray('⚙')} ${chalk.gray(message)}`)
    if (data) {
      console.log(chalk.gray(JSON.stringify(data, null, 2)))
    }
  }

  /**
   * 开始加载动画
   */
  startSpinner(text: string): Ora {
    if (this.config.silent) {
      return ora({ isSilent: true })
    }
    this.spinner = ora({
      text,
      prefixText: this.getPrefix(),
    }).start()
    return this.spinner
  }

  /**
   * 停止加载动画
   */
  stopSpinner(succeed = true, text?: string): void {
    if (!this.spinner) return

    if (succeed) {
      this.spinner.succeed(text)
    } else {
      this.spinner.fail(text)
    }
    this.spinner = null
  }

  /**
   * 更新加载动画文本
   */
  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text
    }
  }

  /**
   * 获取前缀
   */
  private getPrefix(): string {
    return this.config.prefix ? `${this.config.prefix} ` : ''
  }

  /**
   * 设置配置
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

/**
 * 默认日志器实例
 */
export const logger = new Logger()

/**
 * 创建日志器
 */
export function createLogger(config?: LoggerConfig): Logger {
  return new Logger(config)
}

