/**
 * Changelog 验证器
 */

import type { ChangelogContent } from '../types/changelog.js'
import { readFileContent } from '../utils/file.js'
import { logger } from '../utils/logger.js'

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean

  /** 错误列表 */
  errors: ValidationError[]

  /** 警告列表 */
  warnings: ValidationWarning[]

  /** 统计信息 */
  stats?: {
    totalVersions: number
    totalCommits: number
    missingDates: number
    invalidVersions: number
  }
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误类型 */
  type: 'missing_version' | 'invalid_format' | 'missing_date' | 'duplicate_version' | 'invalid_version'

  /** 错误消息 */
  message: string

  /** 行号 */
  line?: number

  /** 严重程度 */
  severity: 'error'
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  /** 警告类型 */
  type: 'empty_section' | 'unusual_format' | 'missing_link' | 'inconsistent_format'

  /** 警告消息 */
  message: string

  /** 行号 */
  line?: number

  /** 严重程度 */
  severity: 'warning'
}

/**
 * Changelog 验证器
 */
export class ChangelogValidator {
  private errors: ValidationError[] = []
  private warnings: ValidationWarning[] = []

  /**
   * 验证 Changelog 文件
   */
  async validateFile(filePath: string): Promise<ValidationResult> {
    this.errors = []
    this.warnings = []

    try {
      const content = await readFileContent(filePath)
      
      if (filePath.endsWith('.md')) {
        return this.validateMarkdown(content)
      } else if (filePath.endsWith('.json')) {
        return this.validateJson(content)
      } else {
        this.addError('invalid_format', '不支持的文件格式')
        return this.buildResult()
      }
    } catch (error: any) {
      this.addError('invalid_format', `无法读取文件: ${error.message}`)
      return this.buildResult()
    }
  }

  /**
   * 验证 Changelog 内容对象
   */
  validateContent(content: ChangelogContent): ValidationResult {
    this.errors = []
    this.warnings = []

    // 验证版本号
    if (!content.version) {
      this.addError('missing_version', '缺少版本号')
    } else if (!this.isValidVersion(content.version)) {
      this.addError('invalid_version', `无效的版本号: ${content.version}`)
    }

    // 验证日期
    if (!content.date) {
      this.addError('missing_date', '缺少发布日期')
    }

    // 验证章节
    if (!content.sections || content.sections.length === 0) {
      this.addWarning('empty_section', '没有任何更新内容')
    }

    // 验证提交
    if (!content.commits || content.commits.length === 0) {
      this.addWarning('empty_section', '没有任何提交记录')
    }

    return this.buildResult()
  }

  /**
   * 验证 Markdown 格式
   */
  private validateMarkdown(content: string): ValidationResult {
    const lines = content.split('\n')
    const versions = new Set<string>()
    let hasTitle = false
    let currentLine = 0

    for (const line of lines) {
      currentLine++

      // 检查是否有标题
      if (line.match(/^#\s+/)) {
        hasTitle = true
      }

      // 检查版本标题
      const versionMatch = line.match(/^##\s+\[?([^\]]+)\]?\s*-\s*(.+)/)
      if (versionMatch) {
        const version = versionMatch[1]
        const date = versionMatch[2]

        // 检查版本号格式
        if (!this.isValidVersion(version) && version !== 'Unreleased') {
          this.addError('invalid_version', `无效的版本号: ${version}`, currentLine)
        }

        // 检查重复版本
        if (versions.has(version)) {
          this.addError('duplicate_version', `重复的版本号: ${version}`, currentLine)
        }
        versions.add(version)

        // 检查日期格式
        if (!date.match(/\d{4}-\d{2}-\d{2}/)) {
          this.addWarning('unusual_format', `日期格式不标准: ${date}`, currentLine)
        }
      }
    }

    if (!hasTitle) {
      this.addWarning('unusual_format', '缺少文档标题')
    }

    if (versions.size === 0) {
      this.addError('missing_version', '未找到任何版本信息')
    }

    return this.buildResult({
      totalVersions: versions.size,
      totalCommits: 0,
      missingDates: 0,
      invalidVersions: this.errors.filter(e => e.type === 'invalid_version').length,
    })
  }

  /**
   * 验证 JSON 格式
   */
  private validateJson(content: string): ValidationResult {
    try {
      const data = JSON.parse(content)

      if (!data.versions && !Array.isArray(data.versions)) {
        this.addError('invalid_format', 'JSON 格式错误：缺少 versions 数组')
        return this.buildResult()
      }

      const versions = new Set<string>()

      for (const version of data.versions) {
        if (!version.version) {
          this.addError('missing_version', '版本对象缺少 version 字段')
          continue
        }

        if (!this.isValidVersion(version.version)) {
          this.addError('invalid_version', `无效的版本号: ${version.version}`)
        }

        if (versions.has(version.version)) {
          this.addError('duplicate_version', `重复的版本号: ${version.version}`)
        }
        versions.add(version.version)

        if (!version.date) {
          this.addWarning('unusual_format', `版本 ${version.version} 缺少日期`)
        }

        if (!version.sections || version.sections.length === 0) {
          this.addWarning('empty_section', `版本 ${version.version} 没有更新内容`)
        }
      }

      return this.buildResult({
        totalVersions: versions.size,
        totalCommits: data.versions.reduce((sum: number, v: any) => sum + (v.commits?.length || 0), 0),
        missingDates: data.versions.filter((v: any) => !v.date).length,
        invalidVersions: this.errors.filter(e => e.type === 'invalid_version').length,
      })
    } catch (error: any) {
      this.addError('invalid_format', `JSON 解析失败: ${error.message}`)
      return this.buildResult()
    }
  }

  /**
   * 验证版本号格式
   */
  private isValidVersion(version: string): boolean {
    // 支持 semver 格式
    const semverPattern = /^v?\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/
    return semverPattern.test(version) || version === 'Unreleased'
  }

  /**
   * 添加错误
   */
  private addError(type: ValidationError['type'], message: string, line?: number): void {
    this.errors.push({
      type,
      message,
      line,
      severity: 'error',
    })
  }

  /**
   * 添加警告
   */
  private addWarning(type: ValidationWarning['type'], message: string, line?: number): void {
    this.warnings.push({
      type,
      message,
      line,
      severity: 'warning',
    })
  }

  /**
   * 构建验证结果
   */
  private buildResult(stats?: ValidationResult['stats']): ValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats,
    }
  }
}

/**
 * 创建 Changelog 验证器
 */
export function createChangelogValidator(): ChangelogValidator {
  return new ChangelogValidator()
}
