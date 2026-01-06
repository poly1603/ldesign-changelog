/**
 * SearchEngine - Changelog 搜索引擎
 * 提供关键词搜索、多条件过滤、分页和排序功能
 */

import type {
  ChangelogContent,
  ChangelogCommit,
} from '../types/changelog.js'
import { logger } from '../utils/logger.js'

/**
 * 搜索查询接口
 */
export interface SearchQuery {
  /** 关键词 */
  keyword?: string
  /** 版本范围 */
  versionRange?: { from?: string; to?: string }
  /** 日期范围 */
  dateRange?: { from?: Date; to?: Date }
  /** 类型过滤 */
  types?: string[]
  /** 作用域过滤 */
  scopes?: string[]
  /** 作者过滤 */
  authors?: string[]
  /** 排序方式 */
  sortBy?: 'date' | 'type' | 'relevance'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
  /** 分页 */
  pagination?: { page: number; pageSize: number }
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  /** 匹配的提交条目 */
  entries: ChangelogCommit[]
  /** 总数 */
  total: number
  /** 当前页 */
  page: number
  /** 每页大小 */
  pageSize: number
  /** 是否有更多 */
  hasMore: boolean
}

/**
 * 搜索引擎配置
 */
export interface SearchEngineOptions {
  /** 是否区分大小写 */
  caseSensitive?: boolean
  /** 默认每页大小 */
  defaultPageSize?: number
  /** 最大每页大小 */
  maxPageSize?: number
}

/**
 * 索引条目
 */
interface IndexEntry {
  commit: ChangelogCommit
  searchText: string
  version?: string
}

/**
 * SearchEngine - Changelog 搜索引擎
 */
export class SearchEngine {
  private options: Required<SearchEngineOptions>
  private index: IndexEntry[] = []
  private content: ChangelogContent | null = null

  constructor(options: SearchEngineOptions = {}) {
    this.options = {
      caseSensitive: options.caseSensitive ?? false,
      defaultPageSize: options.defaultPageSize ?? 20,
      maxPageSize: options.maxPageSize ?? 100,
    }
  }

  /**
   * 建立索引
   */
  buildIndex(content: ChangelogContent): void {
    logger.debug('正在建立搜索索引...')

    this.content = content
    this.index = []

    // 为每个提交创建索引条目
    for (const commit of content.commits) {
      const searchText = this.buildSearchText(commit)
      this.index.push({
        commit,
        searchText,
        version: content.version,
      })
    }

    logger.debug(`索引建立完成，共 ${this.index.length} 个条目`)
  }

  /**
   * 构建搜索文本
   */
  private buildSearchText(commit: ChangelogCommit): string {
    const parts = [
      commit.subject,
      commit.body || '',
      commit.type,
      commit.scope || '',
      commit.author.name,
      commit.author.email,
    ]

    const text = parts.join(' ')
    return this.options.caseSensitive ? text : text.toLowerCase()
  }

  /**
   * 搜索 changelog
   */
  search(query: SearchQuery): SearchResult {
    if (this.index.length === 0) {
      logger.warn('搜索索引为空，请先调用 buildIndex()')
      return this.createEmptyResult(query)
    }

    logger.debug('执行搜索:', query)

    // 1. 过滤
    let filtered = this.filterEntries(query)

    // 2. 排序
    filtered = this.sortEntries(filtered, query)

    // 3. 分页
    const result = this.paginateEntries(filtered, query)

    logger.debug(`搜索完成，找到 ${result.total} 个结果`)

    return result
  }

  /**
   * 过滤条目
   */
  private filterEntries(query: SearchQuery): IndexEntry[] {
    let entries = [...this.index]

    // 关键词过滤
    if (query.keyword) {
      const keyword = this.options.caseSensitive
        ? query.keyword
        : query.keyword.toLowerCase()

      entries = entries.filter(entry =>
        entry.searchText.includes(keyword)
      )
    }

    // 类型过滤
    if (query.types && query.types.length > 0) {
      entries = entries.filter(entry =>
        query.types!.includes(entry.commit.type)
      )
    }

    // 作用域过滤
    if (query.scopes && query.scopes.length > 0) {
      entries = entries.filter(entry =>
        entry.commit.scope && query.scopes!.includes(entry.commit.scope)
      )
    }

    // 作者过滤
    if (query.authors && query.authors.length > 0) {
      entries = entries.filter(entry =>
        query.authors!.some(author =>
          entry.commit.author.name === author ||
          entry.commit.author.email === author
        )
      )
    }

    // 日期范围过滤
    if (query.dateRange) {
      entries = entries.filter(entry => {
        const commitDate = new Date(entry.commit.date)

        if (query.dateRange!.from && commitDate < query.dateRange!.from) {
          return false
        }

        if (query.dateRange!.to && commitDate > query.dateRange!.to) {
          return false
        }

        return true
      })
    }

    // 版本范围过滤（简单实现，基于字符串比较）
    if (query.versionRange) {
      entries = entries.filter(entry => {
        if (!entry.version) return true

        if (query.versionRange!.from && entry.version < query.versionRange!.from) {
          return false
        }

        if (query.versionRange!.to && entry.version > query.versionRange!.to) {
          return false
        }

        return true
      })
    }

    return entries
  }

  /**
   * 排序条目
   */
  private sortEntries(entries: IndexEntry[], query: SearchQuery): IndexEntry[] {
    const sortBy = query.sortBy || 'date'
    const sortOrder = query.sortOrder || 'desc'

    const sorted = [...entries].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date': {
          const dateA = new Date(a.commit.date).getTime()
          const dateB = new Date(b.commit.date).getTime()
          comparison = dateA - dateB
          break
        }

        case 'type': {
          comparison = a.commit.type.localeCompare(b.commit.type)
          break
        }

        case 'relevance': {
          // 简单的相关性评分：关键词出现次数
          if (query.keyword) {
            const keyword = this.options.caseSensitive
              ? query.keyword
              : query.keyword.toLowerCase()

            const countA = this.countOccurrences(a.searchText, keyword)
            const countB = this.countOccurrences(b.searchText, keyword)
            comparison = countB - countA // 相关性高的排前面
          }
          break
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return sorted
  }

  /**
   * 计算关键词出现次数
   */
  private countOccurrences(text: string, keyword: string): number {
    let count = 0
    let pos = 0

    while ((pos = text.indexOf(keyword, pos)) !== -1) {
      count++
      pos += keyword.length
    }

    return count
  }

  /**
   * 分页条目
   */
  private paginateEntries(entries: IndexEntry[], query: SearchQuery): SearchResult {
    const total = entries.length
    const page = query.pagination?.page ?? 1
    const pageSize = Math.min(
      query.pagination?.pageSize ?? this.options.defaultPageSize,
      this.options.maxPageSize
    )

    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize

    const paginatedEntries = entries.slice(startIndex, endIndex)
    const commits = paginatedEntries.map(entry => entry.commit)

    return {
      entries: commits,
      total,
      page,
      pageSize,
      hasMore: endIndex < total,
    }
  }

  /**
   * 创建空结果
   */
  private createEmptyResult(query: SearchQuery): SearchResult {
    return {
      entries: [],
      total: 0,
      page: query.pagination?.page ?? 1,
      pageSize: query.pagination?.pageSize ?? this.options.defaultPageSize,
      hasMore: false,
    }
  }

  /**
   * 获取建议
   */
  getSuggestions(partial: string): string[] {
    if (!partial || this.index.length === 0) {
      return []
    }

    const searchPartial = this.options.caseSensitive
      ? partial
      : partial.toLowerCase()

    const suggestions = new Set<string>()

    // 从提交主题中提取建议
    for (const entry of this.index) {
      const subject = this.options.caseSensitive
        ? entry.commit.subject
        : entry.commit.subject.toLowerCase()

      if (subject.includes(searchPartial)) {
        // 提取包含关键词的词组
        const words = entry.commit.subject.split(/\s+/)
        for (const word of words) {
          const searchWord = this.options.caseSensitive
            ? word
            : word.toLowerCase()

          if (searchWord.includes(searchPartial)) {
            suggestions.add(word)
          }
        }
      }
    }

    return Array.from(suggestions).slice(0, 10) // 最多返回 10 个建议
  }

  /**
   * 高亮匹配
   */
  highlight(text: string, keyword: string): string {
    if (!keyword) return text

    const searchText = this.options.caseSensitive ? text : text.toLowerCase()
    const searchKeyword = this.options.caseSensitive ? keyword : keyword.toLowerCase()

    let result = text
    let offset = 0

    let pos = searchText.indexOf(searchKeyword)
    while (pos !== -1) {
      const actualPos = pos + offset
      const before = result.substring(0, actualPos)
      const match = result.substring(actualPos, actualPos + keyword.length)
      const after = result.substring(actualPos + keyword.length)

      result = `${before}**${match}**${after}`
      offset += 4 // 添加了 ** 和 **

      pos = searchText.indexOf(searchKeyword, pos + keyword.length)
    }

    return result
  }

  /**
   * 获取当前索引的统计信息
   */
  getIndexStats(): {
    totalEntries: number
    types: Record<string, number>
    scopes: Record<string, number>
    authors: Record<string, number>
  } {
    const stats = {
      totalEntries: this.index.length,
      types: {} as Record<string, number>,
      scopes: {} as Record<string, number>,
      authors: {} as Record<string, number>,
    }

    for (const entry of this.index) {
      // 统计类型
      stats.types[entry.commit.type] = (stats.types[entry.commit.type] || 0) + 1

      // 统计作用域
      if (entry.commit.scope) {
        stats.scopes[entry.commit.scope] = (stats.scopes[entry.commit.scope] || 0) + 1
      }

      // 统计作者
      const authorKey = entry.commit.author.name
      stats.authors[authorKey] = (stats.authors[authorKey] || 0) + 1
    }

    return stats
  }
}
