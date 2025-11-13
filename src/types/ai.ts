/**
 * AI 相关类型定义
 */

import type { ChangelogCommit, ChangelogContent } from './changelog.js'

/**
 * AI Provider 类型
 */
export type AIProvider = 'openai' | 'anthropic' | 'local' | 'custom'

/**
 * AI 配置
 */
export interface AIConfig {
  /** AI 提供商 */
  provider: AIProvider

  /** API Key */
  apiKey?: string

  /** 模型名称 */
  model?: string

  /** API Base URL */
  baseUrl?: string

  /** 温度参数 (0-1) */
  temperature?: number

  /** 最大 Token 数 */
  maxTokens?: number

  /** 超时时间（毫秒） */
  timeout?: number

  /** 是否启用缓存 */
  enableCache?: boolean

  /** 自定义提示词 */
  customPrompt?: string
}

/**
 * AI 增强选项
 */
export interface AIEnhanceOptions {
  /** 是否优化提交描述 */
  enhanceCommits?: boolean

  /** 是否生成摘要 */
  generateSummary?: boolean

  /** 是否生成亮点 */
  generateHighlights?: boolean

  /** 是否生成迁移指南 */
  generateMigration?: boolean

  /** 目标语言 */
  targetLanguage?: string

  /** 输出风格 */
  style?: 'professional' | 'casual' | 'technical' | 'marketing'
}

/**
 * AI 增强结果
 */
export interface AIEnhancedContent {
  /** 原始内容 */
  original: ChangelogContent

  /** 增强后的提交描述 */
  enhancedCommits?: ChangelogCommit[]

  /** 生成的摘要 */
  summary?: string

  /** 亮点列表 */
  highlights?: string[]

  /** 迁移指南 */
  migration?: string

  /** 使用的 Token 数 */
  tokensUsed?: number

  /** 处理时间（毫秒） */
  processingTime?: number
}

/**
 * 版本建议类型
 */
export type VersionSuggestionType = 'major' | 'minor' | 'patch' | 'prerelease'

/**
 * 版本建议
 */
export interface VersionSuggestion {
  /** 建议的版本号 */
  version: string

  /** 版本类型 */
  type: VersionSuggestionType

  /** 置信度 (0-1) */
  confidence: number

  /** 建议原因 */
  reason: string

  /** 详细解释 */
  details: {
    /** 是否有破坏性变更 */
    hasBreakingChanges: boolean

    /** 新功能数量 */
    featureCount: number

    /** Bug 修复数量 */
    fixCount: number

    /** 其他变更数量 */
    otherCount: number
  }
}

/**
 * 版本分析结果
 */
export interface VersionAnalysisResult {
  /** 当前版本 */
  currentVersion: string

  /** 建议列表（按优先级排序） */
  suggestions: VersionSuggestion[]

  /** 最推荐的版本 */
  recommended: VersionSuggestion

  /** 分析摘要 */
  summary: string
}
