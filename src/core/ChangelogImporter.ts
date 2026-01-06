/**
 * Changelog 导入器
 * 
 * 支持从多种格式导入现有的 changelog 文件
 */

import type {
  ChangelogContent,
  ChangelogSection,
  ChangelogCommit,
  BreakingChange,
  Contributor,
} from '../types/changelog.js'
import { readFileContent } from '../utils/file.js'
import { logger } from '../utils/logger.js'

/**
 * 导入源
 */
export interface ImportSource {
  /** 文件路径 */
  path: string
  /** 格式 */
  format: 'keep-a-changelog' | 'conventional-changelog' | 'plain-markdown' | 'auto'
}

/**
 * 导入选项
 */
export interface ImportOptions {
  /** 是否保留原始日期 */
  preserveDates: boolean
  /** 是否保留原始版本号 */
  preserveVersions: boolean
  /** 日期格式 */
  dateFormat: string
  /** 版本号前缀 */
  versionPrefix: string
}

/**
 * 导入错误
 */
export interface ImportError {
  /** 错误类型 */
  type: 'parse' | 'format' | 'validation'
  /** 错误消息 */
  message: string
  /** 行号（如果适用） */
  line?: number
  /** 上下文 */
  context?: string
}

/**
 * 导入结果
 */
export interface ImportResult {
  /** 是否成功 */
  success: boolean
  /** 导入的条目 */
  entries: ChangelogContent[]
  /** 错误列表 */
  errors: ImportError[]
  /** 警告列表 */
  warnings: string[]
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean
  /** 错误列表 */
  errors: string[]
  /** 警告列表 */
  warnings: string[]
}

/**
 * Changelog 导入器
 */
export class ChangelogImporter {
  /**
   * 导入 changelog
   */
  async import(source: ImportSource, options: ImportOptions): Promise<ImportResult> {
    logger.info(`正在导入 changelog: ${source.path}`)

    const result: ImportResult = {
      success: false,
      entries: [],
      errors: [],
      warnings: [],
    }

    try {
      // 读取文件内容
      const content = await readFileContent(source.path)

      // 检测格式
      let format = source.format
      if (format === 'auto') {
        format = this.detectFormat(content)
        logger.debug(`检测到格式: ${format}`)
      }

      // 根据格式解析
      let entries: ChangelogContent[]
      switch (format) {
        case 'keep-a-changelog':
          entries = this.parseKeepAChangelog(content, options, result)
          break
        case 'conventional-changelog':
          entries = this.parseConventionalChangelog(content, options, result)
          break
        case 'plain-markdown':
          entries = this.parsePlainMarkdown(content, options, result)
          break
        default:
          result.errors.push({
            type: 'format',
            message: `不支持的格式: ${format}`,
          })
          return result
      }

      result.entries = entries
      result.success = entries.length > 0

      if (result.success) {
        logger.success(`成功导入 ${entries.length} 个版本`)
      } else {
        logger.warn('未能导入任何有效条目')
      }

      return result
    } catch (error) {
      result.errors.push({
        type: 'parse',
        message: `导入失败: ${error instanceof Error ? error.message : String(error)}`,
      })
      return result
    }
  }

  /**
   * 检测格式
   */
  detectFormat(content: string): 'keep-a-changelog' | 'conventional-changelog' | 'plain-markdown' {
    const lines = content.split('\n')

    // 检测 Conventional Changelog 格式的特征（先检测，因为更具体）
    // - 版本格式: ## [version](link) (date) 或 # [version](link) (date)
    // - 章节: ### Features, ### Bug Fixes, ### BREAKING CHANGES
    // - 提交格式: * **scope:** subject ([hash](link))
    const hasConventionalVersion = lines.some(line =>
      /^##?\s+\[[\d.]+\]\([^)]+\)\s+\(\d{4}-\d{2}-\d{2}\)/.test(line)
    )
    const hasConventionalSections = lines.some(line =>
      /^###\s+(Features|Bug Fixes|Performance Improvements|BREAKING CHANGES)$/i.test(line)
    )
    const hasConventionalCommits = lines.some(line =>
      /^\*\s+\*\*[^*]+\*\*:/.test(line)
    )

    if (hasConventionalVersion || (hasConventionalSections && hasConventionalCommits)) {
      return 'conventional-changelog'
    }

    // 检测 Keep a Changelog 格式的特征
    // - 包含 "All notable changes" 或 "Changelog"
    // - 版本格式: ## [version] - date
    // - 章节: ### Added, ### Changed, ### Fixed, etc. (不带 emoji，精确匹配)
    const hasKeepAChangelogHeader = lines.some(line =>
      /all notable changes/i.test(line)
    )
    const hasKeepAChangelogSections = lines.some(line => {
      const trimmed = line.trim()
      // 精确匹配 Keep a Changelog 的标准章节名（不带 emoji）
      return /^###\s+(Added|Changed|Deprecated|Removed|Fixed|Security)\s*$/.test(trimmed)
    })
    const hasKeepAChangelogVersion = lines.some(line =>
      /^##\s+\[[\d.]+\]\s+-\s+\d{4}-\d{2}-\d{2}/.test(line)
    )

    // 需要同时满足版本格式和章节格式，或者有明确的 header
    if (hasKeepAChangelogHeader || (hasKeepAChangelogSections && hasKeepAChangelogVersion)) {
      return 'keep-a-changelog'
    }

    // 默认为纯 Markdown
    return 'plain-markdown'
  }

  /**
   * 解析 Keep a Changelog 格式
   */
  private parseKeepAChangelog(
    content: string,
    options: ImportOptions,
    result: ImportResult
  ): ChangelogContent[] {
    const entries: ChangelogContent[] = []
    const lines = content.split('\n')

    let currentVersion: string | null = null
    let currentDate: string | null = null
    let currentSection: ChangelogSection | null = null
    let currentSections: ChangelogSection[] = []
    let currentCommits: ChangelogCommit[] = []
    let lineNumber = 0

    for (const line of lines) {
      lineNumber++
      const trimmed = line.trim()

      // 跳过空行和标题
      if (!trimmed || trimmed.startsWith('# ')) {
        continue
      }

      // 解析版本标题: ## [version] - date 或 ## [Unreleased]
      const versionMatch = trimmed.match(/^##\s+\[([^\]]+)\](?:\s+-\s+(.+))?/)
      if (versionMatch) {
        // 保存上一个版本
        if (currentVersion && currentSections.length > 0) {
          entries.push({
            version: options.preserveVersions ? currentVersion : this.normalizeVersion(currentVersion, options.versionPrefix),
            date: options.preserveDates && currentDate ? currentDate : new Date().toISOString().split('T')[0],
            sections: currentSections,
            commits: currentCommits,
          })
        }

        // 开始新版本
        currentVersion = versionMatch[1]
        currentDate = versionMatch[2]?.trim() || null
        currentSections = []
        currentCommits = []
        currentSection = null
        continue
      }

      // 解析章节标题: ### Added, ### Changed, etc.
      const sectionMatch = trimmed.match(/^###\s+(.+)/)
      if (sectionMatch) {
        // 保存上一个章节
        if (currentSection && currentSection.commits.length > 0) {
          currentSections.push(currentSection)
        }

        const title = sectionMatch[1].trim()
        currentSection = {
          title,
          type: this.mapKeepAChangelogSectionToType(title),
          commits: [],
        }
        continue
      }

      // 解析条目: - Item description
      if (trimmed.startsWith('-') && currentSection) {
        const description = trimmed.substring(1).trim()

        // 只处理有实际内容的描述（至少3个非空白字符）
        const nonWhitespace = description.replace(/\s/g, '')
        if (nonWhitespace.length >= 3) {
          const commit = this.createCommitFromDescription(
            description,
            currentSection.type,
            currentDate || new Date().toISOString().split('T')[0]
          )
          currentSection.commits.push(commit)
          currentCommits.push(commit)
        }
      }
    }

    // 保存最后一个版本
    if (currentVersion && currentSections.length > 0) {
      // 保存最后一个章节
      if (currentSection && currentSection.commits.length > 0) {
        currentSections.push(currentSection)
      }

      entries.push({
        version: options.preserveVersions ? currentVersion : this.normalizeVersion(currentVersion, options.versionPrefix),
        date: options.preserveDates && currentDate ? currentDate : new Date().toISOString().split('T')[0],
        sections: currentSections,
        commits: currentCommits,
      })
    }

    if (entries.length === 0) {
      result.warnings.push('未找到任何有效的版本条目')
    }

    return entries
  }

  /**
   * 解析 Conventional Changelog 格式
   */
  private parseConventionalChangelog(
    content: string,
    options: ImportOptions,
    result: ImportResult
  ): ChangelogContent[] {
    const entries: ChangelogContent[] = []
    const lines = content.split('\n')

    let currentVersion: string | null = null
    let currentDate: string | null = null
    let currentSection: ChangelogSection | null = null
    let currentSections: ChangelogSection[] = []
    let currentCommits: ChangelogCommit[] = []
    let compareUrl: string | undefined

    for (const line of lines) {
      const trimmed = line.trim()

      // 跳过空行
      if (!trimmed) {
        continue
      }

      // 解析版本标题: ## [version](link) (date) 或 # [version](link) (date)
      const versionMatch = trimmed.match(/^##?\s+\[([^\]]+)\](?:\(([^)]+)\))?\s*(?:\(([^)]+)\))?/)
      if (versionMatch) {
        // 保存上一个版本
        if (currentVersion && currentSections.length > 0) {
          entries.push({
            version: options.preserveVersions ? currentVersion : this.normalizeVersion(currentVersion, options.versionPrefix),
            date: options.preserveDates && currentDate ? currentDate : new Date().toISOString().split('T')[0],
            sections: currentSections,
            commits: currentCommits,
            compareUrl,
          })
        }

        // 开始新版本
        currentVersion = versionMatch[1]
        const linkOrDate = versionMatch[2]
        const possibleDate = versionMatch[3]

        // 判断是链接还是日期
        if (linkOrDate && /^\d{4}-\d{2}-\d{2}/.test(linkOrDate)) {
          currentDate = linkOrDate
        } else if (possibleDate && /^\d{4}-\d{2}-\d{2}/.test(possibleDate)) {
          currentDate = possibleDate
          compareUrl = linkOrDate
        } else {
          currentDate = null
          compareUrl = linkOrDate
        }

        currentSections = []
        currentCommits = []
        currentSection = null
        continue
      }

      // 解析章节标题: ### Features, ### Bug Fixes, etc.
      const sectionMatch = trimmed.match(/^###\s+(.+)/)
      if (sectionMatch) {
        // 保存上一个章节
        if (currentSection && currentSection.commits.length > 0) {
          currentSections.push(currentSection)
        }

        const title = sectionMatch[1].trim()
        currentSection = {
          title,
          type: this.mapConventionalSectionToType(title),
          commits: [],
        }
        continue
      }

      // 解析提交条目: * **scope:** subject ([hash](link))
      if (trimmed.startsWith('*') && currentSection) {
        const commit = this.parseConventionalCommitLine(
          trimmed,
          currentSection.type,
          currentDate || new Date().toISOString().split('T')[0]
        )
        if (commit) {
          currentSection.commits.push(commit)
          currentCommits.push(commit)
        }
      }
    }

    // 保存最后一个版本
    if (currentVersion && currentSections.length > 0) {
      // 保存最后一个章节
      if (currentSection && currentSection.commits.length > 0) {
        currentSections.push(currentSection)
      }

      entries.push({
        version: options.preserveVersions ? currentVersion : this.normalizeVersion(currentVersion, options.versionPrefix),
        date: options.preserveDates && currentDate ? currentDate : new Date().toISOString().split('T')[0],
        sections: currentSections,
        commits: currentCommits,
        compareUrl,
      })
    }

    if (entries.length === 0) {
      result.warnings.push('未找到任何有效的版本条目')
    }

    return entries
  }

  /**
   * 解析纯 Markdown 格式
   */
  private parsePlainMarkdown(
    content: string,
    options: ImportOptions,
    result: ImportResult
  ): ChangelogContent[] {
    const entries: ChangelogContent[] = []
    const lines = content.split('\n')

    let currentVersion: string | null = null
    let currentDate: string | null = null
    let currentSection: ChangelogSection | null = null
    let currentSections: ChangelogSection[] = []
    let currentCommits: ChangelogCommit[] = []

    for (const line of lines) {
      const trimmed = line.trim()

      // 跳过空行
      if (!trimmed) {
        continue
      }

      // 尝试解析版本标题（多种格式）
      // ## version - date
      // ## version (date)
      // ## version
      // # version - date
      const versionMatch = trimmed.match(/^##?\s+(?:v|version\s+)?([^\s-()]+)(?:\s*[-()]?\s*(\d{4}-\d{2}-\d{2}))?/)
      if (versionMatch && /[\d.]/.test(versionMatch[1])) {
        // 保存上一个版本
        if (currentVersion) {
          // 如果没有章节，创建一个默认章节
          if (currentCommits.length > 0 && currentSections.length === 0) {
            currentSections.push({
              title: '变更',
              type: 'other',
              commits: currentCommits,
            })
          }

          if (currentSections.length > 0) {
            entries.push({
              version: options.preserveVersions ? currentVersion : this.normalizeVersion(currentVersion, options.versionPrefix),
              date: options.preserveDates && currentDate ? currentDate : new Date().toISOString().split('T')[0],
              sections: currentSections,
              commits: currentCommits,
            })
          }
        }

        // 开始新版本
        currentVersion = versionMatch[1]
        currentDate = versionMatch[2] || null
        currentSections = []
        currentCommits = []
        currentSection = null
        continue
      }

      // 解析章节标题: ### Title
      const sectionMatch = trimmed.match(/^###\s+(.+)/)
      if (sectionMatch) {
        // 保存上一个章节
        if (currentSection && currentSection.commits.length > 0) {
          currentSections.push(currentSection)
        }

        const title = sectionMatch[1].trim()
        currentSection = {
          title,
          type: this.inferTypeFromTitle(title),
          commits: [],
        }
        continue
      }

      // 解析条目: - Item description
      if (trimmed.startsWith('-')) {
        const description = trimmed.substring(1).trim()

        // 只处理有实际内容的描述（至少3个非空白字符）
        const nonWhitespace = description.replace(/\s/g, '')
        if (nonWhitespace.length >= 3) {
          // 如果没有当前章节，创建一个默认章节
          if (!currentSection) {
            currentSection = {
              title: '变更',
              type: 'other',
              commits: [],
            }
          }

          const commit = this.createCommitFromDescription(
            description,
            currentSection.type,
            currentDate || new Date().toISOString().split('T')[0]
          )
          currentSection.commits.push(commit)
          currentCommits.push(commit)
        }
      }
    }

    // 保存最后一个版本
    if (currentVersion) {
      // 保存最后一个章节
      if (currentSection && currentSection.commits.length > 0) {
        currentSections.push(currentSection)
      }

      // 如果没有章节但有提交，创建默认章节
      if (currentCommits.length > 0 && currentSections.length === 0) {
        currentSections.push({
          title: '变更',
          type: 'other',
          commits: currentCommits,
        })
      }

      if (currentSections.length > 0) {
        entries.push({
          version: options.preserveVersions ? currentVersion : this.normalizeVersion(currentVersion, options.versionPrefix),
          date: options.preserveDates && currentDate ? currentDate : new Date().toISOString().split('T')[0],
          sections: currentSections,
          commits: currentCommits,
        })
      }
    }

    if (entries.length === 0) {
      result.warnings.push('未找到任何有效的版本条目')
    }

    return entries
  }

  /**
   * 映射 Keep a Changelog 章节到类型
   */
  private mapKeepAChangelogSectionToType(title: string): string {
    const normalized = title.toLowerCase()

    if (normalized.includes('added')) return 'feat'
    if (normalized.includes('changed')) return 'refactor'
    if (normalized.includes('deprecated')) return 'deprecated'
    if (normalized.includes('removed')) return 'removed'
    if (normalized.includes('fixed')) return 'fix'
    if (normalized.includes('security')) return 'security'

    return 'other'
  }

  /**
   * 映射 Conventional Changelog 章节到类型
   */
  private mapConventionalSectionToType(title: string): string {
    const normalized = title.toLowerCase()

    if (normalized.includes('feature')) return 'feat'
    if (normalized.includes('bug fix')) return 'fix'
    if (normalized.includes('performance')) return 'perf'
    if (normalized.includes('refactor')) return 'refactor'
    if (normalized.includes('documentation')) return 'docs'
    if (normalized.includes('breaking')) return 'breaking'
    if (normalized.includes('security')) return 'security'

    return 'other'
  }

  /**
   * 从标题推断类型
   */
  private inferTypeFromTitle(title: string): string {
    const normalized = title.toLowerCase()

    // 移除 emoji
    const cleaned = normalized.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()

    // 常见关键词映射
    if (cleaned.includes('feature') || cleaned.includes('新功能') || cleaned.includes('feat')) return 'feat'
    if (cleaned.includes('fix') || cleaned.includes('修复') || cleaned.includes('bug')) return 'fix'
    if (cleaned.includes('perf') || cleaned.includes('性能') || cleaned.includes('performance')) return 'perf'
    if (cleaned.includes('refactor') || cleaned.includes('重构')) return 'refactor'
    if (cleaned.includes('doc') || cleaned.includes('文档')) return 'docs'
    if (cleaned.includes('security') || cleaned.includes('安全')) return 'security'
    if (cleaned.includes('depend') || cleaned.includes('依赖')) return 'dependencies'
    if (cleaned.includes('break') || cleaned.includes('破坏')) return 'breaking'

    return 'other'
  }

  /**
   * 解析 Conventional Changelog 提交行
   */
  private parseConventionalCommitLine(line: string, type: string, date: string): ChangelogCommit | null {
    // 移除开头的 "* "
    let content = line.substring(1).trim()

    // 提取 scope: * **scope:** subject
    let scope: string | undefined
    const scopeMatch = content.match(/^\*\*([^*]+)\*\*:\s*/)
    if (scopeMatch) {
      scope = scopeMatch[1]
      content = content.substring(scopeMatch[0].length)
    }

    // 提取 subject（到链接之前）
    let subject = content
    let hash = ''
    let shortHash = ''
    let commitLink: string | undefined

    // 提取 commit hash: ([hash](link))
    const hashMatch = content.match(/\(\[([a-f0-9]{7,})\]\(([^)]+)\)\)/)
    if (hashMatch) {
      shortHash = hashMatch[1]
      hash = shortHash
      commitLink = hashMatch[2]
      subject = content.substring(0, content.indexOf(hashMatch[0])).trim()
    }

    // 验证 subject 有实际内容（至少3个非空白字符）
    const nonWhitespace = subject.replace(/\s/g, '')
    if (nonWhitespace.length < 3) {
      return null
    }

    // 如果没有 hash，生成一个
    if (!hash) {
      hash = this.generateHash(subject, scope)
      shortHash = hash.substring(0, 7)
    }

    return {
      hash,
      shortHash,
      type,
      scope,
      subject,
      author: {
        name: 'unknown',
        email: 'unknown@example.com',
      },
      date,
      commitLink,
    }
  }

  /**
   * 从描述创建提交对象
   */
  private createCommitFromDescription(description: string, type: string, date: string): ChangelogCommit {
    // 尝试提取 scope（如果有）
    let scope: string | undefined
    let subject = description

    // 格式: scope: subject
    const scopeMatch = description.match(/^([a-z-]+):\s*(.+)/)
    if (scopeMatch) {
      scope = scopeMatch[1]
      subject = scopeMatch[2]
    }

    // 确保 subject 有实际内容
    subject = subject.trim()

    // 生成 hash
    const hash = this.generateHash(subject, scope)
    const shortHash = hash.substring(0, 7)

    return {
      hash,
      shortHash,
      type,
      scope,
      subject,
      author: {
        name: 'unknown',
        email: 'unknown@example.com',
      },
      date,
    }
  }

  /**
   * 生成 hash
   */
  private generateHash(subject: string, scope?: string): string {
    const str = `${scope || ''}${subject}`
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(40, '0')
  }

  /**
   * 规范化版本号
   */
  private normalizeVersion(version: string, prefix: string): string {
    // 移除现有的 v 前缀
    let normalized = version.replace(/^v/i, '')

    // 添加配置的前缀
    if (prefix && !normalized.startsWith(prefix)) {
      normalized = prefix + normalized
    }

    return normalized
  }

  /**
   * 验证导入结果
   */
  validate(result: ImportResult): ValidationResult {
    const validation: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    }

    // 检查是否有条目
    if (result.entries.length === 0) {
      validation.valid = false
      validation.errors.push('没有导入任何有效条目')
    }

    // 检查每个条目
    for (const entry of result.entries) {
      // 检查版本号
      if (!entry.version || entry.version === 'unknown') {
        validation.warnings.push(`条目缺少有效的版本号`)
      }

      // 检查日期
      if (!entry.date) {
        validation.warnings.push(`版本 ${entry.version} 缺少日期`)
      }

      // 检查是否有提交
      if (entry.commits.length === 0) {
        validation.warnings.push(`版本 ${entry.version} 没有任何提交`)
      }

      // 检查是否有章节
      if (entry.sections.length === 0) {
        validation.warnings.push(`版本 ${entry.version} 没有任何章节`)
      }
    }

    // 检查导入错误
    if (result.errors.length > 0) {
      validation.valid = false
      validation.errors.push(...result.errors.map(e => e.message))
    }

    // 添加导入警告
    validation.warnings.push(...result.warnings)

    return validation
  }
}

/**
 * 创建 Changelog 导入器
 */
export function createChangelogImporter(): ChangelogImporter {
  return new ChangelogImporter()
}
