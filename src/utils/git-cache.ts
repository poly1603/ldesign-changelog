/**
 * Git 操作缓存管理器
 * 
 * 用于缓存 Git 操作结果，优化大型仓库的性能
 */

import { existsSync } from 'fs'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'
import type { GitCommit } from '../types/changelog.js'
import { logger, toError } from './logger.js'

/**
 * 缓存配置
 */
export interface GitCacheConfig {
  /** 是否启用缓存 */
  enabled?: boolean

  /** 缓存目录 */
  cacheDir?: string

  /** 缓存过期时间（毫秒），默认 1 小时 */
  ttl?: number

  /** 最大缓存大小（字节），默认 100MB */
  maxSize?: number

  /** 是否启用内存缓存 */
  useMemoryCache?: boolean
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  /** 缓存的数据 */
  data: T

  /** 创建时间戳 */
  timestamp: number

  /** 数据大小（字节） */
  size: number

  /** 缓存键 */
  key: string
}

/**
 * Git 缓存管理器
 */
export class GitCacheManager {
  private config: Required<GitCacheConfig>
  private memoryCache: Map<string, CacheEntry<any>>
  private cacheStats: {
    hits: number
    misses: number
    size: number
  }

  constructor(config: GitCacheConfig = {}) {
    this.config = {
      enabled: config.enabled !== false,
      cacheDir: config.cacheDir || join(process.cwd(), '.changelog-cache'),
      ttl: config.ttl || 3600000, // 1 小时
      maxSize: config.maxSize || 104857600, // 100MB
      useMemoryCache: config.useMemoryCache !== false,
    }

    this.memoryCache = new Map()
    this.cacheStats = {
      hits: 0,
      misses: 0,
      size: 0,
    }

    // 确保缓存目录存在
    this.ensureCacheDir()
  }

  /**
   * 确保缓存目录存在
   */
  private async ensureCacheDir(): Promise<void> {
    if (!existsSync(this.config.cacheDir)) {
      try {
        await mkdir(this.config.cacheDir, { recursive: true })
      } catch (error) {
        logger.warn('创建缓存目录失败', toError(error))
      }
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(namespace: string, params: any): string {
    const paramStr = JSON.stringify(params)
    const hash = createHash('md5').update(paramStr).digest('hex')
    return `${namespace}:${hash}`
  }

  /**
   * 获取缓存文件路径
   */
  private getCacheFilePath(key: string): string {
    return join(this.config.cacheDir, `${key}.json`)
  }

  /**
   * 检查缓存是否过期
   */
  private isExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.ttl
  }

  /**
   * 从内存缓存获取
   */
  private getFromMemory<T>(key: string): T | null {
    if (!this.config.useMemoryCache) {
      return null
    }

    const entry = this.memoryCache.get(key)
    
    if (!entry) {
      return null
    }

    if (this.isExpired(entry.timestamp)) {
      this.memoryCache.delete(key)
      this.cacheStats.size -= entry.size
      return null
    }

    this.cacheStats.hits++
    return entry.data
  }

  /**
   * 保存到内存缓存
   */
  private saveToMemory<T>(key: string, data: T): void {
    if (!this.config.useMemoryCache) {
      return
    }

    const size = JSON.stringify(data).length
    
    // 检查是否超过最大缓存大小
    if (this.cacheStats.size + size > this.config.maxSize) {
      this.evictOldest()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      size,
      key,
    }

    this.memoryCache.set(key, entry)
    this.cacheStats.size += size
  }

  /**
   * 清除最旧的缓存条目
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      const entry = this.memoryCache.get(oldestKey)!
      this.memoryCache.delete(oldestKey)
      this.cacheStats.size -= entry.size
      logger.debug(`清除缓存: ${oldestKey}`)
    }
  }

  /**
   * 从磁盘缓存获取
   */
  private async getFromDisk<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getCacheFilePath(key)
      
      if (!existsSync(filePath)) {
        return null
      }

      const content = await readFile(filePath, 'utf-8')
      const entry: CacheEntry<T> = JSON.parse(content)

      if (this.isExpired(entry.timestamp)) {
        // 删除过期的缓存文件
        try {
          const fs = await import('fs/promises')
          await fs.unlink(filePath)
        } catch (error) {
          // 忽略删除错误
        }
        return null
      }

      this.cacheStats.hits++
      
      // 同时保存到内存缓存
      this.saveToMemory(key, entry.data)

      return entry.data
    } catch (error) {
      logger.debug('从磁盘读取缓存失败', error)
      return null
    }
  }

  /**
   * 保存到磁盘缓存
   */
  private async saveToDisk<T>(key: string, data: T): Promise<void> {
    try {
      await this.ensureCacheDir()

      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        size: JSON.stringify(data).length,
        key,
      }

      const filePath = this.getCacheFilePath(key)
      await writeFile(filePath, JSON.stringify(entry), 'utf-8')
    } catch (error) {
      logger.debug('保存到磁盘缓存失败', error)
    }
  }

  /**
   * 获取缓存
   */
  async get<T>(namespace: string, params: any): Promise<T | null> {
    if (!this.config.enabled) {
      return null
    }

    const key = this.generateKey(namespace, params)

    // 先从内存缓存获取
    const memoryData = this.getFromMemory<T>(key)
    if (memoryData !== null) {
      logger.debug(`内存缓存命中: ${namespace}`)
      return memoryData
    }

    // 再从磁盘缓存获取
    const diskData = await this.getFromDisk<T>(key)
    if (diskData !== null) {
      logger.debug(`磁盘缓存命中: ${namespace}`)
      return diskData
    }

    this.cacheStats.misses++
    return null
  }

  /**
   * 设置缓存
   */
  async set<T>(namespace: string, params: any, data: T): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    const key = this.generateKey(namespace, params)

    // 保存到内存缓存
    this.saveToMemory(key, data)

    // 保存到磁盘缓存
    await this.saveToDisk(key, data)

    logger.debug(`缓存已保存: ${namespace}`)
  }

  /**
   * 删除缓存
   */
  async delete(namespace: string, params?: any): Promise<void> {
    if (params) {
      const key = this.generateKey(namespace, params)
      
      // 从内存删除
      const entry = this.memoryCache.get(key)
      if (entry) {
        this.memoryCache.delete(key)
        this.cacheStats.size -= entry.size
      }

      // 从磁盘删除
      try {
        const filePath = this.getCacheFilePath(key)
        if (existsSync(filePath)) {
          const fs = await import('fs/promises')
          await fs.unlink(filePath)
        }
      } catch (error) {
        // 忽略删除错误
      }
    } else {
      // 删除命名空间下的所有缓存
      await this.clearNamespace(namespace)
    }
  }

  /**
   * 清除命名空间下的所有缓存
   */
  private async clearNamespace(namespace: string): Promise<void> {
    // 清除内存缓存
    for (const [key, entry] of this.memoryCache.entries()) {
      if (key.startsWith(`${namespace}:`)) {
        this.memoryCache.delete(key)
        this.cacheStats.size -= entry.size
      }
    }

    // 清除磁盘缓存
    try {
      const fs = await import('fs/promises')
      const files = await fs.readdir(this.config.cacheDir)
      
      for (const file of files) {
        if (file.startsWith(`${namespace}:`)) {
          const filePath = join(this.config.cacheDir, file)
          await fs.unlink(filePath)
        }
      }
    } catch (error) {
      logger.debug('清除命名空间缓存失败', error)
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    // 清除内存缓存
    this.memoryCache.clear()
    this.cacheStats.size = 0
    this.cacheStats.hits = 0
    this.cacheStats.misses = 0

    // 清除磁盘缓存
    try {
      const fs = await import('fs/promises')
      const files = await fs.readdir(this.config.cacheDir)
      
      for (const file of files) {
        const filePath = join(this.config.cacheDir, file)
        await fs.unlink(filePath)
      }

      logger.info('缓存已清除')
    } catch (error) {
      logger.warn('清除磁盘缓存失败', toError(error))
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : '0.00'

    return {
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      hitRate: `${hitRate}%`,
      memoryEntries: this.memoryCache.size,
      memorySize: this.cacheStats.size,
      memorySizeMB: (this.cacheStats.size / 1024 / 1024).toFixed(2),
    }
  }

  /**
   * 预热缓存
   */
  async warmup(operations: Array<{ namespace: string; params: any; fetcher: () => Promise<any> }>): Promise<void> {
    logger.info(`正在预热 ${operations.length} 个缓存...`)

    const promises = operations.map(async ({ namespace, params, fetcher }) => {
      try {
        // 检查是否已缓存
        const cached = await this.get(namespace, params)
        if (cached !== null) {
          return
        }

        // 获取数据并缓存
        const data = await fetcher()
        await this.set(namespace, params, data)
      } catch (error) {
        logger.warn(`预热缓存失败: ${namespace}`, toError(error))
      }
    })

    await Promise.all(promises)
    logger.info('缓存预热完成')
  }
}

/**
 * 全局缓存管理器实例
 */
let globalCacheManager: GitCacheManager | null = null

/**
 * 获取全局缓存管理器
 */
export function getGlobalCacheManager(): GitCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new GitCacheManager()
  }
  return globalCacheManager
}

/**
 * 设置全局缓存管理器
 */
export function setGlobalCacheManager(manager: GitCacheManager): void {
  globalCacheManager = manager
}

/**
 * 缓存装饰器
 */
export function cached(namespace: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheManager = getGlobalCacheManager()
      
      // 尝试从缓存获取
      const cached = await cacheManager.get(namespace, args)
      if (cached !== null) {
        return cached
      }

      // 调用原方法
      const result = await originalMethod.apply(this, args)

      // 保存到缓存
      await cacheManager.set(namespace, args, result)

      return result
    }

    return descriptor
  }
}
