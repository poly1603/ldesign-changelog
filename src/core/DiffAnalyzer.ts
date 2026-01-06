/**
 * 差异分析器 - 分析变更影响和风险
 */

import { execa } from 'execa'
import type { ChangelogCommit } from '../types/changelog.js'

/**
 * 变更影响
 */
export interface ChangeImpact {
  /** 变更的文件数 */
  filesChanged: number
  /** 新增的行数 */
  linesAdded: number
  /** 删除的行数 */
  linesRemoved: number
  /** 受影响的模块 */
  affectedModules: string[]
  /** 风险评分 (0-100) */
  riskScore: number
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high'
  /** 风险因素 */
  riskFactors: string[]
}

/**
 * 模块影响
 */
export interface ModuleImpact {
  /** 模块名称 */
  name: string
  /** 变更的文件数 */
  filesChanged: number
  /** 变更百分比 */
  changePercentage: number
  /** 是否为核心模块 */
  isCore: boolean
}

/**
 * 差异分析器配置
 */
export interface DiffAnalyzerOptions {
  /** 核心模块路径模式 */
  coreModulePatterns?: string[]
  /** 风险评分权重 */
  riskWeights?: {
    coreModuleChange: number
    largeRefactor: number
    breakingChange: number
    securityChange: number
  }
  /** 大型重构阈值（文件数） */
  largeRefactorThreshold?: number
  /** 工作目录 */
  cwd?: string
}

/**
 * 文件变更统计
 */
interface FileStats {
  file: string
  added: number
  deleted: number
}

/**
 * 差异分析器
 */
export class DiffAnalyzer {
  private options: Required<DiffAnalyzerOptions>

  constructor(options: DiffAnalyzerOptions = {}) {
    this.options = {
      coreModulePatterns: options.coreModulePatterns || [
        'src/core/**',
        'src/lib/**',
        'lib/**',
        'core/**',
      ],
      riskWeights: {
        coreModuleChange: 30,
        largeRefactor: 25,
        breakingChange: 35,
        securityChange: 40,
        ...options.riskWeights,
      },
      largeRefactorThreshold: options.largeRefactorThreshold || 20,
      cwd: options.cwd || process.cwd(),
    }
  }

  /**
   * 分析变更影响
   */
  async analyze(fromRef: string, toRef: string): Promise<ChangeImpact> {
    // 获取文件变更统计
    const fileStats = await this.getFileStats(fromRef, toRef)

    // 计算基本统计
    const filesChanged = fileStats.length
    const linesAdded = fileStats.reduce((sum, stat) => sum + stat.added, 0)
    const linesRemoved = fileStats.reduce((sum, stat) => sum + stat.deleted, 0)

    // 识别受影响的模块
    const affectedModules = this.identifyAffectedModules(fileStats.map(s => s.file))

    // 获取提交信息用于风险评估
    const commits = await this.getCommits(fromRef, toRef)

    // 计算风险评分和因素
    const { riskScore, riskFactors } = this.calculateRisk({
      filesChanged,
      linesAdded,
      linesRemoved,
      affectedModules,
      commits,
    })

    // 确定风险等级
    const riskLevel = this.determineRiskLevel(riskScore)

    return {
      filesChanged,
      linesAdded,
      linesRemoved,
      affectedModules,
      riskScore,
      riskLevel,
      riskFactors,
    }
  }

  /**
   * 获取模块影响
   */
  getModuleImpacts(commits: ChangelogCommit[]): ModuleImpact[] {
    // 从提交中提取文件路径
    const allFiles = new Set<string>()

    // 注意：ChangelogCommit 不包含文件信息，这里我们需要从提交中推断
    // 实际实现中可能需要额外的 Git 查询
    const moduleMap = new Map<string, Set<string>>()

    // 由于 ChangelogCommit 没有文件信息，我们基于 scope 来推断模块
    for (const commit of commits) {
      if (commit.scope) {
        if (!moduleMap.has(commit.scope)) {
          moduleMap.set(commit.scope, new Set())
        }
        // 使用 hash 作为文件的代理
        moduleMap.get(commit.scope)!.add(commit.hash)
      }
    }

    const impacts: ModuleImpact[] = []
    const totalFiles = commits.length

    for (const [moduleName, files] of moduleMap) {
      const filesChanged = files.size
      const changePercentage = totalFiles > 0 ? (filesChanged / totalFiles) * 100 : 0
      const isCore = this.isCoreModule(moduleName)

      impacts.push({
        name: moduleName,
        filesChanged,
        changePercentage: Math.round(changePercentage * 100) / 100,
        isCore,
      })
    }

    // 按文件变更数降序排序
    impacts.sort((a, b) => b.filesChanged - a.filesChanged)

    return impacts
  }

  /**
   * 计算风险评分
   */
  calculateRiskScore(impact: ChangeImpact): number {
    return impact.riskScore
  }

  /**
   * 生成影响摘要
   */
  generateSummary(impact: ChangeImpact): string {
    const lines: string[] = []

    lines.push(`## Change Impact Summary`)
    lines.push('')
    lines.push(`**Risk Level:** ${impact.riskLevel.toUpperCase()}`)
    lines.push(`**Risk Score:** ${impact.riskScore}/100`)
    lines.push('')
    lines.push(`### Statistics`)
    lines.push(`- Files Changed: ${impact.filesChanged}`)
    lines.push(`- Lines Added: ${impact.linesAdded}`)
    lines.push(`- Lines Removed: ${impact.linesRemoved}`)
    lines.push(`- Net Change: ${impact.linesAdded - impact.linesRemoved > 0 ? '+' : ''}${impact.linesAdded - impact.linesRemoved}`)
    lines.push('')

    if (impact.affectedModules.length > 0) {
      lines.push(`### Affected Modules`)
      for (const module of impact.affectedModules) {
        const isCore = this.isCoreModule(module)
        lines.push(`- ${module}${isCore ? ' ⚠️ (Core Module)' : ''}`)
      }
      lines.push('')
    }

    if (impact.riskFactors.length > 0) {
      lines.push(`### Risk Factors`)
      for (const factor of impact.riskFactors) {
        lines.push(`- ${factor}`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 获取文件变更统计
   */
  private async getFileStats(fromRef: string, toRef: string): Promise<FileStats[]> {
    try {
      const { stdout } = await execa(
        'git',
        ['diff', '--numstat', `${fromRef}..${toRef}`],
        { cwd: this.options.cwd }
      )

      if (!stdout) return []

      const stats: FileStats[] = []
      const lines = stdout.split('\n').filter(Boolean)

      for (const line of lines) {
        const parts = line.split('\t')
        if (parts.length >= 3) {
          // Handle binary files or files with no changes (shown as "-")
          const addedStr = parts[0].trim()
          const deletedStr = parts[1].trim()

          const added = addedStr === '-' ? 0 : parseInt(addedStr, 10) || 0
          const deleted = deletedStr === '-' ? 0 : parseInt(deletedStr, 10) || 0
          const file = parts[2]

          stats.push({ file, added, deleted })
        }
      }

      return stats
    } catch (error) {
      throw new Error(`Failed to get file stats: ${(error as Error).message}`)
    }
  }

  /**
   * 获取提交列表
   */
  private async getCommits(fromRef: string, toRef: string): Promise<ChangelogCommit[]> {
    try {
      const { stdout } = await execa(
        'git',
        ['log', `${fromRef}..${toRef}`, '--format=%H%n%s%n%b%n---END---'],
        { cwd: this.options.cwd }
      )

      if (!stdout) return []

      const commits: ChangelogCommit[] = []
      const blocks = stdout.split('---END---\n').filter(Boolean)

      for (const block of blocks) {
        const lines = block.split('\n')
        if (lines.length < 2) continue

        const hash = lines[0]
        const subject = lines[1]
        const body = lines.slice(2).join('\n').trim()

        // 简单解析，实际应该使用 CommitParser
        // 支持 feat! 或 feat(scope)! 格式的破坏性变更
        const match = subject.match(/^(\w+)(!)?(?:\(([^)]+)\))?(!)?:\s*(.+)$/)

        // 检测破坏性变更：subject 中有 ! 或 body 中有 BREAKING CHANGE
        const hasBreakingIndicator = match ? (!!match[2] || !!match[4]) : false
        const hasBreakingInBody = body.includes('BREAKING CHANGE')
        const isBreaking = hasBreakingIndicator || hasBreakingInBody

        commits.push({
          hash,
          shortHash: hash.substring(0, 7),
          type: match ? match[1] : 'other',
          scope: match ? match[3] : undefined,
          subject: match ? match[5] : subject,
          body: body || undefined,
          author: { name: '', email: '' },
          date: new Date().toISOString(),
          breaking: isBreaking,
          isSecurity: this.isSecurityRelated(subject, body),
        })
      }

      return commits
    } catch (error) {
      throw new Error(`Failed to get commits: ${(error as Error).message}`)
    }
  }

  /**
   * 识别受影响的模块
   */
  private identifyAffectedModules(files: string[]): string[] {
    const modules = new Set<string>()

    for (const file of files) {
      const module = this.extractModuleName(file)
      if (module) {
        modules.add(module)
      }
    }

    return Array.from(modules).sort()
  }

  /**
   * 从文件路径提取模块名
   */
  private extractModuleName(filePath: string): string | null {
    // 规范化路径分隔符（统一使用正斜杠）
    const normalizedPath = filePath.replace(/\\/g, '/')

    // 移除文件扩展名
    const pathWithoutExt = normalizedPath.replace(/\.[^.]+$/, '')

    // 提取主要目录
    const parts = pathWithoutExt.split('/')

    // 跳过常见的顶层目录（只跳过第一层）
    const topLevelSkipDirs = ['src', 'dist', 'build', 'test', 'tests', '__tests__']

    // 找到第一个不是顶层跳过目录的部分
    let moduleIndex = 0
    while (moduleIndex < parts.length && topLevelSkipDirs.includes(parts[moduleIndex])) {
      moduleIndex++
    }

    // 如果找到了模块名，返回它
    if (moduleIndex < parts.length) {
      return parts[moduleIndex]
    }

    return null
  }

  /**
   * 判断是否为核心模块
   */
  private isCoreModule(moduleName: string): boolean {
    return this.options.coreModulePatterns.some(pattern => {
      // 简单的模式匹配
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'))
      return regex.test(moduleName) || moduleName.includes('core') || moduleName.includes('lib')
    })
  }

  /**
   * 计算风险
   */
  private calculateRisk(data: {
    filesChanged: number
    linesAdded: number
    linesRemoved: number
    affectedModules: string[]
    commits: ChangelogCommit[]
  }): { riskScore: number; riskFactors: string[] } {
    let score = 0
    const factors: string[] = []

    // 检查核心模块变更
    const coreModulesAffected = data.affectedModules.filter(m => this.isCoreModule(m))
    if (coreModulesAffected.length > 0) {
      score += this.options.riskWeights.coreModuleChange
      factors.push(`Core modules affected: ${coreModulesAffected.join(', ')}`)
    }

    // 检查大型重构
    if (data.filesChanged >= this.options.largeRefactorThreshold) {
      score += this.options.riskWeights.largeRefactor
      factors.push(`Large refactor: ${data.filesChanged} files changed`)
    }

    // 检查破坏性变更
    const breakingChanges = data.commits.filter(c => c.breaking)
    if (breakingChanges.length > 0) {
      score += this.options.riskWeights.breakingChange
      factors.push(`Breaking changes: ${breakingChanges.length} commit(s)`)
    }

    // 检查安全相关变更
    const securityChanges = data.commits.filter(c => c.isSecurity)
    if (securityChanges.length > 0) {
      score += this.options.riskWeights.securityChange
      factors.push(`Security-related changes: ${securityChanges.length} commit(s)`)
    }

    // 基于代码变更量的额外评分
    const totalLines = data.linesAdded + data.linesRemoved
    if (totalLines > 1000) {
      const extraScore = Math.min(20, Math.floor(totalLines / 1000) * 5)
      score += extraScore
      factors.push(`Large code change: ${totalLines} lines modified`)
    }

    // 确保分数在 0-100 范围内
    score = Math.min(100, Math.max(0, score))

    return { riskScore: score, riskFactors: factors }
  }

  /**
   * 确定风险等级
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  /**
   * 判断是否为安全相关
   */
  private isSecurityRelated(subject: string, body?: string): boolean {
    const text = `${subject} ${body || ''}`.toLowerCase()
    const keywords = ['security', 'vulnerability', 'cve', 'xss', 'csrf', 'injection', 'exploit']
    return keywords.some(kw => text.includes(kw))
  }
}

/**
 * 创建差异分析器
 */
export function createDiffAnalyzer(options?: DiffAnalyzerOptions): DiffAnalyzer {
  return new DiffAnalyzer(options)
}
