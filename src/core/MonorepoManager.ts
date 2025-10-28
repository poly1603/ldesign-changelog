/**
 * Monorepo 管理器
 */

import { join, relative, basename } from 'path'
import fg from 'fast-glob'
import { readFile } from 'fs/promises'
import type { MonorepoConfig } from '../types/config.js'
import type { ChangelogContent } from '../types/changelog.js'
import { logger } from '../utils/logger.js'
import { fileExists } from '../utils/file.js'

/**
 * 包信息
 */
export interface PackageInfo {
  /** 包名 */
  name: string

  /** 包路径 */
  path: string

  /** 相对路径 */
  relativePath: string

  /** package.json 路径 */
  packageJsonPath: string

  /** 版本号 */
  version: string

  /** 是否为私有包 */
  private: boolean
}

/**
 * Monorepo 管理器
 */
export class MonorepoManager {
  private config: MonorepoConfig
  private rootPath: string

  constructor(config: MonorepoConfig, rootPath: string) {
    this.config = config
    this.rootPath = rootPath
  }

  /**
   * 发现所有包
   */
  async discoverPackages(): Promise<PackageInfo[]> {
    if (!this.config.enabled) {
      return []
    }

    const packages: PackageInfo[] = []
    const patterns = this.config.packages || ['packages/*']

    // 查找所有 package.json 文件
    const packageJsonFiles = await fg(
      patterns.map(p => join(p, 'package.json')),
      {
        cwd: this.rootPath,
        absolute: true,
      }
    )

    for (const packageJsonPath of packageJsonFiles) {
      try {
        const content = await readFile(packageJsonPath, 'utf-8')
        const packageJson = JSON.parse(content)
        const packagePath = join(packageJsonPath, '..')
        const relativePath = relative(this.rootPath, packagePath)

        packages.push({
          name: packageJson.name,
          path: packagePath,
          relativePath,
          packageJsonPath,
          version: packageJson.version || '0.0.0',
          private: packageJson.private || false,
        })
      } catch (error) {
        logger.warn(`无法读取包信息: ${packageJsonPath}`)
      }
    }

    logger.debug(`发现 ${packages.length} 个包`)
    return packages
  }

  /**
   * 获取包的输出路径
   */
  getOutputPath(pkg: PackageInfo): string {
    if (this.config.outputPattern) {
      return this.config.outputPattern
        .replace('{{package}}', basename(pkg.path))
        .replace('{{name}}', pkg.name)
    }

    return join(pkg.path, 'CHANGELOG.md')
  }

  /**
   * 获取包的 tag 前缀
   */
  getTagPrefix(pkg: PackageInfo): string {
    if (this.config.tagPrefix) {
      return this.config.tagPrefix
        .replace('{{package}}', basename(pkg.path))
        .replace('{{name}}', pkg.name)
    }

    return `${pkg.name}@`
  }

  /**
   * 解析包的版本 tag
   */
  parseVersionTag(tag: string, pkg: PackageInfo): string | null {
    const prefix = this.getTagPrefix(pkg)
    
    if (tag.startsWith(prefix)) {
      return tag.substring(prefix.length)
    }

    return null
  }

  /**
   * 生成版本 tag
   */
  generateVersionTag(version: string, pkg: PackageInfo): string {
    const prefix = this.getTagPrefix(pkg)
    return `${prefix}${version}`
  }

  /**
   * 过滤包的提交
   */
  async filterCommitsForPackage(
    commits: any[],
    pkg: PackageInfo
  ): Promise<any[]> {
    // 过滤出影响该包的提交
    // 这里简化处理，实际可以通过 git log -- <path> 来精确过滤
    return commits.filter(commit => {
      // 如果提交中包含包的路径
      if (commit.scope) {
        const scopePath = commit.scope.toLowerCase()
        const pkgName = basename(pkg.path).toLowerCase()
        return scopePath.includes(pkgName)
      }

      // 默认包含所有提交（可以根据实际需求调整）
      return true
    })
  }

  /**
   * 合并多个包的 Changelog
   */
  mergeChangelogs(changelogs: Map<string, ChangelogContent>): ChangelogContent {
    const merged: ChangelogContent = {
      version: 'Multiple',
      date: new Date().toISOString().split('T')[0],
      sections: [],
      commits: [],
    }

    const sectionMap = new Map<string, any>()

    // 合并所有包的内容
    for (const [pkgName, changelog] of changelogs) {
      for (const section of changelog.sections) {
        const key = section.type
        if (!sectionMap.has(key)) {
          sectionMap.set(key, {
            title: section.title,
            type: section.type,
            commits: [],
            priority: section.priority,
          })
        }

        const mergedSection = sectionMap.get(key)!
        
        // 为每个提交添加包名标记
        const commitsWithPackage = section.commits.map(c => ({
          ...c,
          subject: `[${pkgName}] ${c.subject}`,
        }))

        mergedSection.commits.push(...commitsWithPackage)
      }

      merged.commits.push(...changelog.commits)
    }

    // 转换为数组并排序
    merged.sections = Array.from(sectionMap.values()).sort((a, b) => {
      const aPriority = a.priority ?? 999
      const bPriority = b.priority ?? 999
      return aPriority - bPriority
    })

    return merged
  }

  /**
   * 获取包的最新 tag
   */
  async getLatestTag(pkg: PackageInfo): Promise<string | null> {
    // 这里需要实现从 git 获取包的最新 tag
    // 简化实现，实际需要调用 git 命令
    return null
  }

  /**
   * 验证 Monorepo 配置
   */
  validateConfig(): string[] {
    const errors: string[] = []

    if (!this.config.enabled) {
      return errors
    }

    if (!this.config.packages || this.config.packages.length === 0) {
      errors.push('Monorepo 配置缺少 packages 字段')
    }

    return errors
  }
}

/**
 * 创建 Monorepo 管理器
 */
export function createMonorepoManager(
  config: MonorepoConfig,
  rootPath: string
): MonorepoManager {
  return new MonorepoManager(config, rootPath)
}
