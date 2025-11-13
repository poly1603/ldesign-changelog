/**
 * 版本分析器
 * 
 * 基于提交内容分析，智能推荐下一个版本号
 */

import * as semver from 'semver'
import type { ChangelogCommit } from '../types/changelog.js'
import type {
  VersionSuggestion,
  VersionSuggestionType,
  VersionAnalysisResult,
} from '../types/ai.js'
import { logger } from '../utils/logger.js'

/**
 * 版本分析器配置
 */
export interface VersionAnalyzerConfig {
  /** 当前版本 */
  currentVersion: string

  /** 是否考虑提交消息中的版本关键词 */
  detectVersionKeywords?: boolean

  /** 是否考虑提交数量 */
  considerCommitCount?: boolean

  /** 置信度阈值 (0-1) */
  confidenceThreshold?: number
}

/**
 * 版本分析器
 */
export class VersionAnalyzer {
  private config: Required<VersionAnalyzerConfig>

  constructor(config: VersionAnalyzerConfig) {
    this.config = {
      currentVersion: config.currentVersion,
      detectVersionKeywords: config.detectVersionKeywords !== false,
      considerCommitCount: config.considerCommitCount !== false,
      confidenceThreshold: config.confidenceThreshold || 0.7,
    }
  }

  /**
   * 分析提交并推荐版本
   */
  analyze(commits: ChangelogCommit[]): VersionAnalysisResult {
    logger.debug(`分析 ${commits.length} 个提交以推荐版本...`)

    const stats = this.analyzeCommits(commits)
    const suggestions = this.generateSuggestions(stats)

    // 选择最推荐的版本
    const recommended = this.selectRecommended(suggestions)

    return {
      currentVersion: this.config.currentVersion,
      suggestions,
      recommended,
      summary: this.generateSummary(stats, recommended),
    }
  }

  /**
   * 分析提交统计
   */
  private analyzeCommits(commits: ChangelogCommit[]): {
    hasBreakingChanges: boolean
    featureCount: number
    fixCount: number
    otherCount: number
    totalCommits: number
    hasVersionKeywords: {
      major: boolean
      minor: boolean
      patch: boolean
    }
  } {
    let hasBreakingChanges = false
    let featureCount = 0
    let fixCount = 0
    let otherCount = 0

    const hasVersionKeywords = {
      major: false,
      minor: false,
      patch: false,
    }

    for (const commit of commits) {
      // 检查破坏性变更
      if (commit.breaking) {
        hasBreakingChanges = true
      }

      // 统计各类型提交
      switch (commit.type) {
        case 'feat':
          featureCount++
          break
        case 'fix':
          fixCount++
          break
        default:
          otherCount++
      }

      // 检测版本关键词
      if (this.config.detectVersionKeywords) {
        const text = `${commit.subject} ${commit.body || ''}`.toLowerCase()
        
        if (/major|breaking/i.test(text)) {
          hasVersionKeywords.major = true
        }
        
        if (/minor|feature|新功能/i.test(text)) {
          hasVersionKeywords.minor = true
        }
        
        if (/patch|fix|修复|bugfix/i.test(text)) {
          hasVersionKeywords.patch = true
        }
      }
    }

    return {
      hasBreakingChanges,
      featureCount,
      fixCount,
      otherCount,
      totalCommits: commits.length,
      hasVersionKeywords,
    }
  }

  /**
   * 生成版本建议列表
   */
  private generateSuggestions(stats: ReturnType<typeof this.analyzeCommits>): VersionSuggestion[] {
    const current = semver.parse(this.config.currentVersion)
    
    if (!current) {
      logger.warn(`无法解析当前版本: ${this.config.currentVersion}`)
      return []
    }

    const suggestions: VersionSuggestion[] = []

    // Major 版本建议
    if (stats.hasBreakingChanges || stats.hasVersionKeywords.major) {
      const nextMajor = semver.inc(current, 'major')!
      const confidence = this.calculateConfidence('major', stats)

      suggestions.push({
        version: nextMajor,
        type: 'major',
        confidence,
        reason: stats.hasBreakingChanges
          ? '检测到破坏性变更'
          : '检测到 major 版本关键词',
        details: {
          hasBreakingChanges: stats.hasBreakingChanges,
          featureCount: stats.featureCount,
          fixCount: stats.fixCount,
          otherCount: stats.otherCount,
        },
      })
    }

    // Minor 版本建议
    if (stats.featureCount > 0 || stats.hasVersionKeywords.minor) {
      const nextMinor = semver.inc(current, 'minor')!
      const confidence = this.calculateConfidence('minor', stats)

      suggestions.push({
        version: nextMinor,
        type: 'minor',
        confidence,
        reason: stats.featureCount > 0
          ? `添加了 ${stats.featureCount} 个新功能`
          : '检测到 minor 版本关键词',
        details: {
          hasBreakingChanges: stats.hasBreakingChanges,
          featureCount: stats.featureCount,
          fixCount: stats.fixCount,
          otherCount: stats.otherCount,
        },
      })
    }

    // Patch 版本建议
    if (stats.fixCount > 0 || stats.totalCommits > 0) {
      const nextPatch = semver.inc(current, 'patch')!
      const confidence = this.calculateConfidence('patch', stats)

      suggestions.push({
        version: nextPatch,
        type: 'patch',
        confidence,
        reason: stats.fixCount > 0
          ? `修复了 ${stats.fixCount} 个问题`
          : `包含 ${stats.totalCommits} 个提交`,
        details: {
          hasBreakingChanges: stats.hasBreakingChanges,
          featureCount: stats.featureCount,
          fixCount: stats.fixCount,
          otherCount: stats.otherCount,
        },
      })
    }

    // 按置信度排序
    suggestions.sort((a, b) => b.confidence - a.confidence)

    return suggestions
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    type: VersionSuggestionType,
    stats: ReturnType<typeof this.analyzeCommits>
  ): number {
    let confidence = 0

    if (type === 'major') {
      // 有破坏性变更，置信度很高
      if (stats.hasBreakingChanges) {
        confidence = 0.95
      } else if (stats.hasVersionKeywords.major) {
        confidence = 0.7
      } else {
        confidence = 0.3
      }
    } else if (type === 'minor') {
      // 有新功能，置信度高
      if (stats.featureCount > 0) {
        // 根据新功能数量调整置信度
        const ratio = stats.featureCount / Math.max(stats.totalCommits, 1)
        confidence = Math.min(0.9, 0.6 + ratio * 0.3)
      } else if (stats.hasVersionKeywords.minor) {
        confidence = 0.6
      } else {
        confidence = 0.4
      }

      // 如果有破坏性变更，降低 minor 版本的置信度
      if (stats.hasBreakingChanges) {
        confidence *= 0.5
      }
    } else if (type === 'patch') {
      // 主要是修复，置信度中等
      if (stats.fixCount > 0 && stats.featureCount === 0) {
        const ratio = stats.fixCount / Math.max(stats.totalCommits, 1)
        confidence = Math.min(0.85, 0.5 + ratio * 0.35)
      } else {
        confidence = 0.5
      }

      // 如果有破坏性变更或新功能，降低 patch 版本的置信度
      if (stats.hasBreakingChanges || stats.featureCount > 0) {
        confidence *= 0.3
      }
    }

    // 考虑提交数量
    if (this.config.considerCommitCount) {
      if (stats.totalCommits < 3) {
        confidence *= 0.9 // 提交较少，稍微降低置信度
      } else if (stats.totalCommits > 20) {
        confidence = Math.min(1, confidence * 1.1) // 提交较多，稍微提高置信度
      }
    }

    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * 选择最推荐的版本
   */
  private selectRecommended(suggestions: VersionSuggestion[]): VersionSuggestion {
    if (suggestions.length === 0) {
      // 如果没有建议，默认推荐 patch
      const current = semver.parse(this.config.currentVersion)!
      const nextPatch = semver.inc(current, 'patch')!

      return {
        version: nextPatch,
        type: 'patch',
        confidence: 0.5,
        reason: '默认推荐',
        details: {
          hasBreakingChanges: false,
          featureCount: 0,
          fixCount: 0,
          otherCount: 0,
        },
      }
    }

    // 选择置信度最高的
    return suggestions[0]
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    stats: ReturnType<typeof this.analyzeCommits>,
    recommended: VersionSuggestion
  ): string {
    const parts: string[] = []

    parts.push(`当前版本: ${this.config.currentVersion}`)
    parts.push(`推荐版本: ${recommended.version} (${recommended.type})`)
    parts.push(`置信度: ${(recommended.confidence * 100).toFixed(1)}%`)
    parts.push(`\n分析结果:`)

    if (stats.hasBreakingChanges) {
      parts.push(`- 包含破坏性变更`)
    }

    if (stats.featureCount > 0) {
      parts.push(`- ${stats.featureCount} 个新功能`)
    }

    if (stats.fixCount > 0) {
      parts.push(`- ${stats.fixCount} 个问题修复`)
    }

    if (stats.otherCount > 0) {
      parts.push(`- ${stats.otherCount} 个其他变更`)
    }

    parts.push(`\n${recommended.reason}`)

    return parts.join('\n')
  }
}

/**
 * 快速分析版本
 */
export async function analyzeVersion(
  currentVersion: string,
  commits: ChangelogCommit[]
): Promise<VersionAnalysisResult> {
  const analyzer = new VersionAnalyzer({ currentVersion })
  return analyzer.analyze(commits)
}
