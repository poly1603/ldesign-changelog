/**
 * 依赖追踪器
 * 追踪和分析项目依赖变更
 */

import type { ChangelogCommit, ChangelogSection } from '../types/changelog.js'
import { execaCommand } from 'execa'

/**
 * 依赖变更类型
 */
export interface DependencyChange {
  /** 包名 */
  name: string
  /** 变更类型 */
  type: 'added' | 'updated' | 'removed'
  /** 旧版本 */
  oldVersion?: string
  /** 新版本 */
  newVersion?: string
  /** 依赖类型 */
  dependencyType: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies'
}

/**
 * 依赖追踪器配置
 */
export interface DependencyTrackerOptions {
  /** 要追踪的文件模式 */
  patterns?: string[]
  /** 是否包含 devDependencies */
  includeDevDependencies?: boolean
  /** 是否包含 peerDependencies */
  includePeerDependencies?: boolean
  /** 是否显示版本范围变化 */
  showVersionRange?: boolean
  /** 工作目录 */
  cwd?: string
}

/**
 * package.json 依赖对象
 */
interface PackageJsonDeps {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
}

/**
 * 依赖追踪器
 */
export class DependencyTracker {
  private options: Required<DependencyTrackerOptions>

  constructor(options: DependencyTrackerOptions = {}) {
    this.options = {
      patterns: options.patterns || ['package.json'],
      includeDevDependencies: options.includeDevDependencies ?? true,
      includePeerDependencies: options.includePeerDependencies ?? true,
      showVersionRange: options.showVersionRange ?? true,
      cwd: options.cwd || process.cwd(),
    }
  }

  /**
   * 从提交中提取依赖变更
   */
  async extractChanges(commits: ChangelogCommit[]): Promise<DependencyChange[]> {
    const changes: DependencyChange[] = []

    for (const commit of commits) {
      try {
        // 检查提交是否修改了 package.json
        const modifiedFiles = await this.getModifiedFiles(commit.hash)
        const hasPackageJson = modifiedFiles.some(file =>
          this.options.patterns.some(pattern => file.includes(pattern))
        )

        if (!hasPackageJson) {
          continue
        }

        // 获取 package.json 的变更
        const commitChanges = await this.getPackageJsonChanges(commit.hash)
        changes.push(...commitChanges)
      } catch (error) {
        // 记录错误但继续处理其他提交
        console.warn(`Failed to extract dependency changes from commit ${commit.shortHash}:`, error)
      }
    }

    return this.deduplicateChanges(changes)
  }

  /**
   * 对比两个版本的依赖差异
   */
  async diffDependencies(fromRef: string, toRef: string): Promise<DependencyChange[]> {
    try {
      const oldPackageJson = await this.getPackageJsonAtRef(fromRef)
      const newPackageJson = await this.getPackageJsonAtRef(toRef)

      return this.compareDependencies(oldPackageJson, newPackageJson)
    } catch (error) {
      console.error(`Failed to diff dependencies between ${fromRef} and ${toRef}:`, error)
      return []
    }
  }

  /**
   * 格式化依赖变更为 changelog 条目
   */
  formatChanges(changes: DependencyChange[]): ChangelogSection {
    const commits = changes.map(change => this.formatDependencyChange(change))

    return {
      title: '📦 依赖更新',
      type: 'dependencies',
      commits,
      priority: 0, // 高优先级，显示在前面
    }
  }

  /**
   * 获取提交修改的文件列表
   */
  private async getModifiedFiles(commitHash: string): Promise<string[]> {
    try {
      const { stdout } = await execaCommand(
        `git show --name-only --format="" ${commitHash}`,
        { cwd: this.options.cwd }
      )
      return stdout.split('\n').filter(Boolean)
    } catch (error) {
      return []
    }
  }

  /**
   * 获取 package.json 在指定 ref 的内容
   */
  private async getPackageJsonAtRef(ref: string): Promise<PackageJsonDeps> {
    try {
      const { stdout } = await execaCommand(
        `git show ${ref}:package.json`,
        { cwd: this.options.cwd }
      )
      return JSON.parse(stdout)
    } catch (error) {
      // 如果文件不存在或解析失败，返回空对象
      return {}
    }
  }

  /**
   * 获取提交中 package.json 的变更
   */
  private async getPackageJsonChanges(commitHash: string): Promise<DependencyChange[]> {
    try {
      // 获取提交前后的 package.json
      const oldPackageJson = await this.getPackageJsonAtRef(`${commitHash}^`)
      const newPackageJson = await this.getPackageJsonAtRef(commitHash)

      return this.compareDependencies(oldPackageJson, newPackageJson)
    } catch (error) {
      return []
    }
  }

  /**
   * 比较两个 package.json 的依赖差异
   */
  private compareDependencies(
    oldPkg: PackageJsonDeps,
    newPkg: PackageJsonDeps
  ): DependencyChange[] {
    const changes: DependencyChange[] = []

    // 定义要检查的依赖类型
    const depTypes: Array<keyof PackageJsonDeps> = ['dependencies']

    if (this.options.includeDevDependencies) {
      depTypes.push('devDependencies')
    }
    if (this.options.includePeerDependencies) {
      depTypes.push('peerDependencies')
    }
    // optionalDependencies 总是包含
    depTypes.push('optionalDependencies')

    for (const depType of depTypes) {
      const oldDeps = oldPkg[depType] || {}
      const newDeps = newPkg[depType] || {}

      // 检测新增和更新的依赖
      for (const [name, newVersion] of Object.entries(newDeps)) {
        if (!(name in oldDeps)) {
          // 新增的依赖
          changes.push({
            name,
            type: 'added',
            newVersion,
            dependencyType: depType,
          })
        } else if (oldDeps[name] !== newVersion) {
          // 更新的依赖
          changes.push({
            name,
            type: 'updated',
            oldVersion: oldDeps[name],
            newVersion,
            dependencyType: depType,
          })
        }
      }

      // 检测移除的依赖
      for (const [name, oldVersion] of Object.entries(oldDeps)) {
        if (!(name in newDeps)) {
          changes.push({
            name,
            type: 'removed',
            oldVersion,
            dependencyType: depType,
          })
        }
      }
    }

    return changes
  }

  /**
   * 去重依赖变更（保留最新的变更）
   */
  private deduplicateChanges(changes: DependencyChange[]): DependencyChange[] {
    const changeMap = new Map<string, DependencyChange>()

    for (const change of changes) {
      const key = `${change.name}:${change.dependencyType}`
      // 如果已存在，保留最新的变更（后面的覆盖前面的）
      changeMap.set(key, change)
    }

    return Array.from(changeMap.values())
  }

  /**
   * 格式化单个依赖变更为 ChangelogCommit
   */
  private formatDependencyChange(change: DependencyChange): ChangelogCommit {
    let subject = ''
    const depTypeLabel = this.getDependencyTypeLabel(change.dependencyType)

    switch (change.type) {
      case 'added':
        subject = `新增 ${change.name}@${change.newVersion} (${depTypeLabel})`
        break
      case 'updated':
        subject = `更新 ${change.name} ${change.oldVersion} → ${change.newVersion} (${depTypeLabel})`
        break
      case 'removed':
        subject = `移除 ${change.name}@${change.oldVersion} (${depTypeLabel})`
        break
    }

    return {
      hash: '',
      shortHash: '',
      type: 'deps',
      scope: change.dependencyType,
      subject,
      author: {
        name: '',
        email: '',
      },
      date: '',
      isDependency: true,
    }
  }

  /**
   * 获取依赖类型的中文标签
   */
  private getDependencyTypeLabel(type: DependencyChange['dependencyType']): string {
    const labels: Record<DependencyChange['dependencyType'], string> = {
      dependencies: '生产依赖',
      devDependencies: '开发依赖',
      peerDependencies: '对等依赖',
      optionalDependencies: '可选依赖',
    }
    return labels[type]
  }
}

/**
 * 创建依赖追踪器
 */
export function createDependencyTracker(options?: DependencyTrackerOptions): DependencyTracker {
  return new DependencyTracker(options)
}
