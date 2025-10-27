/**
 * 统计分析类型定义
 */

import type { ChangelogCommit, Contributor } from './changelog.js'

/**
 * 统计分析结果
 */
export interface StatsAnalysisResult {
  /** 总提交数 */
  totalCommits: number

  /** 按类型统计 */
  byType: TypeStats[]

  /** 按日期统计 */
  byDate: DateStats[]

  /** 贡献者统计 */
  contributors: ContributorStats[]

  /** 提交频率 */
  frequency: FrequencyStats

  /** Issue/PR 统计 */
  references: ReferenceStats
}

/**
 * 类型统计
 */
export interface TypeStats {
  /** 类型 */
  type: string

  /** 数量 */
  count: number

  /** 百分比 */
  percentage: number

  /** 提交列表 */
  commits?: ChangelogCommit[]
}

/**
 * 日期统计
 */
export interface DateStats {
  /** 日期 */
  date: string

  /** 提交数 */
  count: number

  /** 提交列表 */
  commits?: ChangelogCommit[]
}

/**
 * 贡献者统计
 */
export interface ContributorStats extends Contributor {
  /** 提交百分比 */
  percentage: number

  /** 各类型提交数 */
  commitsByType: Record<string, number>

  /** 首次提交日期 */
  firstCommitDate?: string

  /** 最后提交日期 */
  lastCommitDate?: string
}

/**
 * 频率统计
 */
export interface FrequencyStats {
  /** 每天平均提交数 */
  commitsPerDay: number

  /** 每周平均提交数 */
  commitsPerWeek: number

  /** 每月平均提交数 */
  commitsPerMonth: number

  /** 时间跨度（天数） */
  durationDays: number

  /** 最活跃的一天 */
  mostActiveDay?: {
    date: string
    count: number
  }

  /** 最活跃的周 */
  mostActiveWeek?: {
    week: string
    count: number
  }
}

/**
 * 引用统计（Issue/PR）
 */
export interface ReferenceStats {
  /** Issue 数量 */
  issueCount: number

  /** PR 数量 */
  prCount: number

  /** 引用的 Issues */
  issues: string[]

  /** 引用的 PRs */
  prs: string[]
}

/**
 * 统计分析选项
 */
export interface StatsAnalysisOptions {
  /** 是否包含提交详情 */
  includeCommits?: boolean

  /** 是否计算百分比 */
  calculatePercentage?: boolean

  /** 是否分析频率 */
  analyzeFrequency?: boolean

  /** 日期分组格式 */
  dateGroupFormat?: 'day' | 'week' | 'month'
}

