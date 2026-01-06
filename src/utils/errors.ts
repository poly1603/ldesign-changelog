/**
 * @module utils/errors
 * @description 自定义错误类，用于统一错误处理
 *
 * @example
 * ```typescript
 * import { ChangelogError, GitError, ConfigError, ParsingError } from '@ldesign/changelog/utils'
 *
 * // 抛出 Changelog 相关错误
 * throw new ChangelogError('Failed to generate changelog', { cause: originalError })
 *
 * // 抛出 Git 相关错误
 * throw new GitError('Failed to get commits', 'git log', { cause: originalError })
 *
 * // 抛出配置相关错误
 * throw new ConfigError('Invalid config', { field: 'output', value: 123 })
 *
 * // 抛出解析相关错误
 * throw new ParsingError('Invalid commit format', 'fix: missing scope')
 * ```
 */

/**
 * 错误代码枚举
 * @description 定义所有可能的错误代码
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN = 'UNKNOWN',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  OPERATION_FAILED = 'OPERATION_FAILED',

  // Git 相关错误
  GIT_NOT_FOUND = 'GIT_NOT_FOUND',
  GIT_COMMAND_FAILED = 'GIT_COMMAND_FAILED',
  GIT_NO_COMMITS = 'GIT_NO_COMMITS',
  GIT_INVALID_REF = 'GIT_INVALID_REF',

  // 配置相关错误
  CONFIG_NOT_FOUND = 'CONFIG_NOT_FOUND',
  CONFIG_INVALID = 'CONFIG_INVALID',
  CONFIG_PARSE_ERROR = 'CONFIG_PARSE_ERROR',

  // 文件相关错误
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',

  // 解析相关错误
  PARSE_ERROR = 'PARSE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // 格式化相关错误
  FORMAT_ERROR = 'FORMAT_ERROR',
  TEMPLATE_ERROR = 'TEMPLATE_ERROR',

  // 集成相关错误
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
}

/**
 * 错误上下文接口
 * @description 错误的附加上下文信息
 */
export interface ErrorContext {
  /** 原始错误 */
  cause?: Error | unknown

  /** 错误代码 */
  code?: ErrorCode

  /** 附加元数据 */
  metadata?: Record<string, unknown>
}

/**
 * Changelog 基础错误类
 * @description 所有 Changelog 相关错误的基类
 *
 * @example
 * ```typescript
 * try {
 *   await generator.generate('1.0.0')
 * } catch (error) {
 *   if (error instanceof ChangelogError) {
 *     console.error(`Error [${error.code}]: ${error.message}`)
 *     if (error.cause) {
 *       console.error('Caused by:', error.cause)
 *     }
 *   }
 * }
 * ```
 */
export class ChangelogError extends Error {
  /** 错误代码 */
  readonly code: ErrorCode

  /** 原始错误 */
  readonly cause?: Error | unknown

  /** 附加元数据 */
  readonly metadata?: Record<string, unknown>

  /**
   * 创建 ChangelogError 实例
   * @param message - 错误消息
   * @param context - 错误上下文
   */
  constructor(message: string, context: ErrorContext = {}) {
    super(message)
    this.name = 'ChangelogError'
    this.code = context.code ?? ErrorCode.UNKNOWN
    this.cause = context.cause
    this.metadata = context.metadata

    // 维护正确的原型链
    Object.setPrototypeOf(this, new.target.prototype)

    // 捕获堆栈跟踪（Node.js 特性）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * 转换为 JSON 格式
   * @returns JSON 表示
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      metadata: this.metadata,
      stack: this.stack,
    }
  }

  /**
   * 转换为字符串
   * @returns 错误的字符串表示
   */
  toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`
  }
}

/**
 * Git 操作错误类
 * @description Git 命令或操作失败时抛出
 *
 * @example
 * ```typescript
 * throw new GitError('Failed to get commits', 'git log --oneline')
 * ```
 */
export class GitError extends ChangelogError {
  /** 执行的 Git 命令 */
  readonly command?: string

  /** 命令退出码 */
  readonly exitCode?: number

  /**
   * 创建 GitError 实例
   * @param message - 错误消息
   * @param command - Git 命令（可选）
   * @param context - 错误上下文
   */
  constructor(
    message: string,
    command?: string,
    context: ErrorContext & { exitCode?: number } = {}
  ) {
    super(message, { ...context, code: context.code ?? ErrorCode.GIT_COMMAND_FAILED })
    this.name = 'GitError'
    this.command = command
    this.exitCode = context.exitCode
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      command: this.command,
      exitCode: this.exitCode,
    }
  }
}

/**
 * 配置错误类
 * @description 配置无效或加载失败时抛出
 *
 * @example
 * ```typescript
 * throw new ConfigError('Invalid output format', {
 *   metadata: { field: 'format', value: 'invalid', expected: ['markdown', 'json', 'html'] }
 * })
 * ```
 */
export class ConfigError extends ChangelogError {
  /** 出错的配置字段 */
  readonly field?: string

  /** 实际值 */
  readonly value?: unknown

  /** 期望值 */
  readonly expected?: unknown

  /**
   * 创建 ConfigError 实例
   * @param message - 错误消息
   * @param context - 错误上下文
   */
  constructor(
    message: string,
    context: ErrorContext & { field?: string; value?: unknown; expected?: unknown } = {}
  ) {
    super(message, { ...context, code: context.code ?? ErrorCode.CONFIG_INVALID })
    this.name = 'ConfigError'
    this.field = context.field
    this.value = context.value
    this.expected = context.expected
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
      expected: this.expected,
    }
  }
}

/**
 * 文件操作错误类
 * @description 文件读写操作失败时抛出
 *
 * @example
 * ```typescript
 * throw new FileError('Cannot read file', '/path/to/file.md', {
 *   code: ErrorCode.FILE_NOT_FOUND
 * })
 * ```
 */
export class FileError extends ChangelogError {
  /** 文件路径 */
  readonly path: string

  /**
   * 创建 FileError 实例
   * @param message - 错误消息
   * @param path - 文件路径
   * @param context - 错误上下文
   */
  constructor(message: string, path: string, context: ErrorContext = {}) {
    super(message, { ...context, code: context.code ?? ErrorCode.FILE_READ_ERROR })
    this.name = 'FileError'
    this.path = path
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      path: this.path,
    }
  }
}

/**
 * 解析错误类
 * @description 解析提交消息或其他内容失败时抛出
 *
 * @example
 * ```typescript
 * throw new ParsingError('Invalid commit format', 'fix: missing scope')
 * ```
 */
export class ParsingError extends ChangelogError {
  /** 原始输入 */
  readonly input?: string

  /** 错误位置 */
  readonly position?: { line?: number; column?: number }

  /**
   * 创建 ParsingError 实例
   * @param message - 错误消息
   * @param input - 原始输入
   * @param context - 错误上下文
   */
  constructor(
    message: string,
    input?: string,
    context: ErrorContext & { position?: { line?: number; column?: number } } = {}
  ) {
    super(message, { ...context, code: context.code ?? ErrorCode.PARSE_ERROR })
    this.name = 'ParsingError'
    this.input = input
    this.position = context.position
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      input: this.input,
      position: this.position,
    }
  }
}

/**
 * API 错误类
 * @description 外部 API 调用失败时抛出（如 GitHub、GitLab 等）
 *
 * @example
 * ```typescript
 * throw new ApiError('GitHub API rate limit exceeded', 403, {
 *   metadata: { endpoint: '/repos/user/repo/releases' }
 * })
 * ```
 */
export class ApiError extends ChangelogError {
  /** HTTP 状态码 */
  readonly statusCode?: number

  /** API 端点 */
  readonly endpoint?: string

  /**
   * 创建 ApiError 实例
   * @param message - 错误消息
   * @param statusCode - HTTP 状态码
   * @param context - 错误上下文
   */
  constructor(
    message: string,
    statusCode?: number,
    context: ErrorContext & { endpoint?: string } = {}
  ) {
    super(message, { ...context, code: context.code ?? ErrorCode.API_ERROR })
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.endpoint = context.endpoint
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      endpoint: this.endpoint,
    }
  }
}

/**
 * 验证错误类
 * @description 数据验证失败时抛出
 *
 * @example
 * ```typescript
 * throw new ValidationError('Commit validation failed', [
 *   { field: 'type', message: 'Invalid type' }
 * ])
 * ```
 */
export class ValidationError extends ChangelogError {
  /** 验证错误列表 */
  readonly errors: Array<{ field?: string; message: string }>

  /**
   * 创建 ValidationError 实例
   * @param message - 错误消息
   * @param errors - 验证错误列表
   * @param context - 错误上下文
   */
  constructor(
    message: string,
    errors: Array<{ field?: string; message: string }> = [],
    context: ErrorContext = {}
  ) {
    super(message, { ...context, code: context.code ?? ErrorCode.VALIDATION_ERROR })
    this.name = 'ValidationError'
    this.errors = errors
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    }
  }
}

/**
 * 检查错误是否为 ChangelogError 类型
 * @param error - 要检查的错误
 * @returns 是否为 ChangelogError
 */
export function isChangelogError(error: unknown): error is ChangelogError {
  return error instanceof ChangelogError
}

/**
 * 包装错误为 ChangelogError
 * @param error - 原始错误
 * @param message - 错误消息（可选）
 * @returns ChangelogError 实例
 */
export function wrapError(error: unknown, message?: string): ChangelogError {
  if (error instanceof ChangelogError) {
    return error
  }

  if (error instanceof Error) {
    return new ChangelogError(message ?? error.message, { cause: error })
  }

  return new ChangelogError(message ?? String(error), { cause: error })
}
