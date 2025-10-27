/**
 * Changelog 数据类型定义
 */

/**
 * Git 提交信息
 */
export interface GitCommit {
  /** 完整 hash */
  hash: string

  /** 短 hash */
  shortHash: string

  /** 提交主题 */
  subject: string

  /** 提交正文 */
  body?: string

  /** 作者名称 */
  authorName: string

  /** 作者邮箱 */
  authorEmail: string

  /** 提交日期 */
  date: string

  /** 提交时间戳 */
  timestamp: number

  /** 标签 */
  tags?: string[]
}

/**
 * Changelog 提交
 */
export interface ChangelogCommit {
  /** Commit hash */
  hash: string

  /** 短 hash */
  shortHash: string

  /** 类型 */
  type: string

  /** Scope */
  scope?: string

  /** 主题 */
  subject: string

  /** 正文 */
  body?: string

  /** 作者 */
  author: {
    name: string
    email: string
    username?: string
  }

  /** PR 编号 */
  pr?: string

  /** PR 链接 */
  prLink?: string

  /** Issues 引用 */
  issues?: string[]

  /** Issue 链接 */
  issueLinks?: string[]

  /** 是否为 breaking change */
  breaking?: boolean

  /** Breaking change 描述 */
  breakingDescription?: string

  /** 日期 */
  date: string

  /** Commit 链接 */
  commitLink?: string
}

/**
 * Changelog 章节
 */
export interface ChangelogSection {
  /** 章节标题 */
  title: string

  /** 提交类型 */
  type: string

  /** 提交列表 */
  commits: ChangelogCommit[]

  /** 排序优先级 */
  priority?: number
}

/**
 * Breaking Change
 */
export interface BreakingChange {
  /** 描述 */
  description: string

  /** 关联提交 */
  commit: ChangelogCommit

  /** 迁移指南 */
  migration?: string
}

/**
 * 贡献者
 */
export interface Contributor {
  /** 姓名 */
  name: string

  /** 邮箱 */
  email: string

  /** 提交数 */
  commitCount: number

  /** GitHub 用户名 */
  username?: string

  /** 贡献类型 */
  contributionTypes?: string[]
}

/**
 * Changelog 内容
 */
export interface ChangelogContent {
  /** 版本号 */
  version: string

  /** 发布日期 */
  date: string

  /** 按类型分组的章节 */
  sections: ChangelogSection[]

  /** 所有提交 */
  commits: ChangelogCommit[]

  /** Breaking changes */
  breakingChanges?: BreakingChange[]

  /** 贡献者列表 */
  contributors?: Contributor[]

  /** 统计信息 */
  stats?: ChangelogStats

  /** 比较链接 */
  compareUrl?: string

  /** 原始内容（格式化后的字符串） */
  raw?: string
}

/**
 * Changelog 统计
 */
export interface ChangelogStats {
  /** 总提交数 */
  totalCommits: number

  /** 各类型提交数量 */
  commitsByType: Record<string, number>

  /** 贡献者数量 */
  contributorCount: number

  /** 文件变更数 */
  filesChanged?: number

  /** 新增行数 */
  linesAdded?: number

  /** 删除行数 */
  linesDeleted?: number

  /** 提交频率（每天平均提交数） */
  commitsPerDay?: number

  /** 时间跨度（天数） */
  durationDays?: number

  /** Issue 数量 */
  issueCount?: number

  /** PR 数量 */
  prCount?: number
}

/**
 * 版本范围
 */
export interface VersionRange {
  /** 起始版本/标签 */
  from?: string

  /** 结束版本/标签 */
  to?: string
}

/**
 * 仓库信息
 */
export interface RepositoryInfo {
  /** 仓库 URL */
  url: string

  /** 仓库类型 */
  type: 'github' | 'gitlab' | 'gitee' | 'bitbucket' | 'other'

  /** 所有者 */
  owner?: string

  /** 仓库名 */
  name?: string
}

