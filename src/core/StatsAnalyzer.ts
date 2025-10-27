/**
 * 统计分析器
 */

import dayjs from 'dayjs'
import type {
  ChangelogCommit,
  Contributor,
} from '../types/changelog.js'
import type {
  StatsAnalysisResult,
  TypeStats,
  DateStats,
  ContributorStats,
  FrequencyStats,
  ReferenceStats,
  StatsAnalysisOptions,
} from '../types/stats.js'

/**
 * 统计分析器
 */
export class StatsAnalyzer {
  private options: StatsAnalysisOptions

  constructor(options: StatsAnalysisOptions = {}) {
    this.options = {
      includeCommits: false,
      calculatePercentage: true,
      analyzeFrequency: true,
      dateGroupFormat: 'day',
      ...options,
    }
  }

  /**
   * 分析提交统计
   */
  analyze(commits: ChangelogCommit[]): StatsAnalysisResult {
    const totalCommits = commits.length

    return {
      totalCommits,
      byType: this.analyzeByType(commits, totalCommits),
      byDate: this.analyzeByDate(commits),
      contributors: this.analyzeContributors(commits, totalCommits),
      frequency: this.analyzeFrequency(commits),
      references: this.analyzeReferences(commits),
    }
  }

  /**
   * 按类型统计
   */
  private analyzeByType(commits: ChangelogCommit[], total: number): TypeStats[] {
    const typeMap = new Map<string, ChangelogCommit[]>()

    for (const commit of commits) {
      if (!typeMap.has(commit.type)) {
        typeMap.set(commit.type, [])
      }
      typeMap.get(commit.type)!.push(commit)
    }

    const stats: TypeStats[] = []

    for (const [type, typeCommits] of typeMap) {
      stats.push({
        type,
        count: typeCommits.length,
        percentage: this.options.calculatePercentage
          ? this.calculatePercentage(typeCommits.length, total)
          : 0,
        commits: this.options.includeCommits ? typeCommits : undefined,
      })
    }

    // 按数量降序排序
    stats.sort((a, b) => b.count - a.count)

    return stats
  }

  /**
   * 按日期统计
   */
  private analyzeByDate(commits: ChangelogCommit[]): DateStats[] {
    const dateMap = new Map<string, ChangelogCommit[]>()
    const format = this.getDateFormat()

    for (const commit of commits) {
      const date = dayjs(commit.date).format(format)
      if (!dateMap.has(date)) {
        dateMap.set(date, [])
      }
      dateMap.get(date)!.push(commit)
    }

    const stats: DateStats[] = []

    for (const [date, dateCommits] of dateMap) {
      stats.push({
        date,
        count: dateCommits.length,
        commits: this.options.includeCommits ? dateCommits : undefined,
      })
    }

    // 按日期排序
    stats.sort((a, b) => a.date.localeCompare(b.date))

    return stats
  }

  /**
   * 贡献者统计
   */
  private analyzeContributors(commits: ChangelogCommit[], total: number): ContributorStats[] {
    const contributorMap = new Map<string, {
      contributor: Contributor
      commits: ChangelogCommit[]
      typeMap: Map<string, number>
    }>()

    for (const commit of commits) {
      const key = commit.author.email

      if (!contributorMap.has(key)) {
        contributorMap.set(key, {
          contributor: {
            name: commit.author.name,
            email: commit.author.email,
            commitCount: 0,
            username: commit.author.username,
          },
          commits: [],
          typeMap: new Map(),
        })
      }

      const data = contributorMap.get(key)!
      data.contributor.commitCount++
      data.commits.push(commit)

      // 统计各类型提交数
      const count = data.typeMap.get(commit.type) || 0
      data.typeMap.set(commit.type, count + 1)
    }

    const stats: ContributorStats[] = []

    for (const data of contributorMap.values()) {
      const commitsByType: Record<string, number> = {}
      for (const [type, count] of data.typeMap) {
        commitsByType[type] = count
      }

      // 获取首次和最后提交日期
      const dates = data.commits.map(c => dayjs(c.date))
      const sortedDates = dates.sort((a, b) => a.unix() - b.unix())
      const firstCommitDate = sortedDates[0]?.format('YYYY-MM-DD')
      const lastCommitDate = sortedDates[sortedDates.length - 1]?.format('YYYY-MM-DD')

      stats.push({
        ...data.contributor,
        percentage: this.options.calculatePercentage
          ? this.calculatePercentage(data.contributor.commitCount, total)
          : 0,
        commitsByType,
        firstCommitDate,
        lastCommitDate,
      })
    }

    // 按提交数降序排序
    stats.sort((a, b) => b.commitCount - a.commitCount)

    return stats
  }

  /**
   * 频率统计
   */
  private analyzeFrequency(commits: ChangelogCommit[]): FrequencyStats {
    if (commits.length === 0) {
      return {
        commitsPerDay: 0,
        commitsPerWeek: 0,
        commitsPerMonth: 0,
        durationDays: 0,
      }
    }

    // 获取日期范围
    const dates = commits.map(c => dayjs(c.date))
    const sortedDates = dates.sort((a, b) => a.unix() - b.unix())
    const firstDate = sortedDates[0]
    const lastDate = sortedDates[sortedDates.length - 1]
    const durationDays = lastDate.diff(firstDate, 'day') + 1

    // 计算平均值
    const commitsPerDay = commits.length / durationDays
    const commitsPerWeek = commitsPerDay * 7
    const commitsPerMonth = commitsPerDay * 30

    // 找出最活跃的一天
    const dayMap = new Map<string, number>()
    for (const date of dates) {
      const day = date.format('YYYY-MM-DD')
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }

    let mostActiveDay: { date: string; count: number } | undefined
    for (const [date, count] of dayMap) {
      if (!mostActiveDay || count > mostActiveDay.count) {
        mostActiveDay = { date, count }
      }
    }

    // 找出最活跃的周
    const weekMap = new Map<string, number>()
    for (const date of dates) {
      const week = date.format('YYYY-[W]WW')
      weekMap.set(week, (weekMap.get(week) || 0) + 1)
    }

    let mostActiveWeek: { week: string; count: number } | undefined
    for (const [week, count] of weekMap) {
      if (!mostActiveWeek || count > mostActiveWeek.count) {
        mostActiveWeek = { week, count }
      }
    }

    return {
      commitsPerDay: Math.round(commitsPerDay * 100) / 100,
      commitsPerWeek: Math.round(commitsPerWeek * 100) / 100,
      commitsPerMonth: Math.round(commitsPerMonth * 100) / 100,
      durationDays,
      mostActiveDay,
      mostActiveWeek,
    }
  }

  /**
   * Issue/PR 引用统计
   */
  private analyzeReferences(commits: ChangelogCommit[]): ReferenceStats {
    const issues = new Set<string>()
    const prs = new Set<string>()

    for (const commit of commits) {
      if (commit.pr) {
        prs.add(commit.pr)
      }
      if (commit.issues) {
        commit.issues.forEach(issue => issues.add(issue))
      }
    }

    return {
      issueCount: issues.size,
      prCount: prs.size,
      issues: Array.from(issues),
      prs: Array.from(prs),
    }
  }

  /**
   * 计算百分比
   */
  private calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0
    return Math.round((value / total) * 10000) / 100
  }

  /**
   * 获取日期格式
   */
  private getDateFormat(): string {
    switch (this.options.dateGroupFormat) {
      case 'week':
        return 'YYYY-[W]WW'
      case 'month':
        return 'YYYY-MM'
      case 'day':
      default:
        return 'YYYY-MM-DD'
    }
  }
}

/**
 * 创建统计分析器
 */
export function createStatsAnalyzer(options?: StatsAnalysisOptions): StatsAnalyzer {
  return new StatsAnalyzer(options)
}

