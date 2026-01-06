/**
 * 迁移指南生成器
 * 
 * 自动从破坏性变更生成迁移指南
 */

import type { ChangelogContent, ChangelogCommit, BreakingChange } from '../types/changelog.js'
import type { AIEnhancer } from './AIEnhancer.js'
import { logger, toError } from '../utils/logger.js'

/**
 * 迁移步骤
 */
export interface MigrationStep {
  /** 步骤序号 */
  order: number
  /** 步骤标题 */
  title: string
  /** 步骤描述 */
  description: string
  /** 代码示例 */
  codeExample?: CodeExample
  /** 是否可自动化 */
  automated: boolean
}

/**
 * 代码示例
 */
export interface CodeExample {
  /** 编程语言 */
  language: string
  /** 修改前的代码 */
  before: string
  /** 修改后的代码 */
  after: string
  /** 示例描述 */
  description?: string
}

/**
 * 迁移条目
 */
export interface MigrationEntry {
  /** 版本号 */
  version: string
  /** 破坏性变更列表 */
  breakingChanges: BreakingChange[]
  /** 迁移步骤 */
  migrationSteps: MigrationStep[]
  /** 代码示例 */
  codeExamples: CodeExample[]
  /** 受影响的 API */
  affectedApis: string[]
}

/**
 * 迁移生成器配置
 */
export interface MigrationGeneratorOptions {
  /** 是否使用 AI 生成详细步骤 */
  useAI?: boolean
  /** 输出格式 */
  format?: 'markdown' | 'json'
  /** 是否包含代码示例 */
  includeCodeExamples?: boolean
  /** 模板路径 */
  template?: string
  /** AI 增强器实例 */
  aiEnhancer?: AIEnhancer
}

/**
 * 迁移指南生成器
 */
export class MigrationGenerator {
  private options: Required<Omit<MigrationGeneratorOptions, 'template' | 'aiEnhancer'>> & {
    template?: string
    aiEnhancer?: AIEnhancer
  }

  constructor(options: MigrationGeneratorOptions = {}) {
    this.options = {
      useAI: false,
      format: 'markdown',
      includeCodeExamples: true,
      template: undefined,
      aiEnhancer: undefined,
      ...options,
    }
  }

  /**
   * 从 changelog 内容生成迁移指南
   */
  async generate(content: ChangelogContent): Promise<MigrationEntry[]> {
    // 检查是否有破坏性变更
    if (!content.breakingChanges || content.breakingChanges.length === 0) {
      logger.info('没有检测到破坏性变更，跳过迁移指南生成')
      return []
    }

    logger.info(`检测到 ${content.breakingChanges.length} 个破坏性变更，开始生成迁移指南...`)

    // 按 scope 组织破坏性变更
    const changesByScope = this.groupByScope(content.breakingChanges)

    // 生成迁移条目
    const entry: MigrationEntry = {
      version: content.version,
      breakingChanges: content.breakingChanges,
      migrationSteps: [],
      codeExamples: [],
      affectedApis: this.extractAffectedApis(content.breakingChanges),
    }

    // 为每个 scope 生成迁移步骤
    let stepOrder = 1
    for (const [scope, changes] of changesByScope.entries()) {
      for (const change of changes) {
        const steps = await this.generateStepsForChange(change, stepOrder)
        entry.migrationSteps.push(...steps)
        stepOrder += steps.length

        // 提取代码示例
        if (this.options.includeCodeExamples) {
          const examples = this.extractCodeExamples(change)
          entry.codeExamples.push(...examples)
        }
      }
    }

    // 使用 AI 增强（如果启用）
    if (this.options.useAI && this.options.aiEnhancer) {
      logger.info('使用 AI 增强迁移指南...')
      try {
        const enhanced = await this.enhanceWithAI(entry)
        return [enhanced]
      } catch (error) {
        logger.warn('AI 增强失败，使用基础版本', toError(error))
      }
    }

    return [entry]
  }

  /**
   * 按 scope 分组破坏性变更
   */
  private groupByScope(changes: BreakingChange[]): Map<string, BreakingChange[]> {
    const groups = new Map<string, BreakingChange[]>()

    for (const change of changes) {
      const scope = change.commit.scope || 'general'
      if (!groups.has(scope)) {
        groups.set(scope, [])
      }
      groups.get(scope)!.push(change)
    }

    return groups
  }

  /**
   * 提取受影响的 API
   */
  private extractAffectedApis(changes: BreakingChange[]): string[] {
    const apis = new Set<string>()

    for (const change of changes) {
      // 从描述中提取 API 名称（简单的启发式方法）
      const description = change.description || change.commit.subject

      // 匹配函数名、类名、方法名等
      const apiMatches = description.match(/`([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)`/g)
      if (apiMatches) {
        apiMatches.forEach(match => {
          const api = match.replace(/`/g, '')
          apis.add(api)
        })
      }

      // 如果有 scope，也作为受影响的 API
      if (change.commit.scope) {
        apis.add(change.commit.scope)
      }
    }

    return Array.from(apis)
  }

  /**
   * 为单个破坏性变更生成迁移步骤
   */
  private async generateStepsForChange(
    change: BreakingChange,
    startOrder: number
  ): Promise<MigrationStep[]> {
    const steps: MigrationStep[] = []

    // 从提交体提取描述
    const description = this.extractDescription(change)

    // 生成基础迁移步骤
    const step: MigrationStep = {
      order: startOrder,
      title: this.generateStepTitle(change),
      description,
      automated: false,
    }

    steps.push(step)

    return steps
  }

  /**
   * 从破坏性变更中提取描述
   */
  private extractDescription(change: BreakingChange): string {
    // 优先使用 breakingDescription
    if (change.description) {
      return change.description
    }

    // 从提交体中提取 BREAKING CHANGE 部分
    if (change.commit.body) {
      const breakingMarkers = ['BREAKING CHANGE:', 'BREAKING CHANGES:', 'BREAKING:']

      for (const marker of breakingMarkers) {
        const index = change.commit.body.indexOf(marker)
        if (index !== -1) {
          const description = change.commit.body.substring(index + marker.length).trim()
          // 提取第一段
          const paragraphs = description.split('\n\n')
          return paragraphs[0].trim()
        }
      }
    }

    // 回退到提交主题
    return change.commit.subject
  }

  /**
   * 生成步骤标题
   */
  private generateStepTitle(change: BreakingChange): string {
    const scope = change.commit.scope
    if (scope) {
      return `更新 ${scope} 相关代码`
    }
    return '更新代码以适应新版本'
  }

  /**
   * 从破坏性变更中提取代码示例
   */
  private extractCodeExamples(change: BreakingChange): CodeExample[] {
    const examples: CodeExample[] = []

    if (!change.commit.body) {
      return examples
    }

    // 查找代码块（Markdown 格式）
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    let match: RegExpExecArray | null

    const codeBlocks: Array<{ language: string; code: string }> = []
    while ((match = codeBlockRegex.exec(change.commit.body)) !== null) {
      codeBlocks.push({
        language: match[1] || 'javascript',
        code: match[2].trim(),
      })
    }

    // 如果有成对的代码块，假设是 before/after
    if (codeBlocks.length >= 2) {
      for (let i = 0; i < codeBlocks.length - 1; i += 2) {
        examples.push({
          language: codeBlocks[i].language,
          before: codeBlocks[i].code,
          after: codeBlocks[i + 1].code,
          description: `${change.commit.scope || '代码'}迁移示例`,
        })
      }
    }

    return examples
  }

  /**
   * 使用 AI 增强迁移条目
   */
  async enhanceWithAI(entry: MigrationEntry): Promise<MigrationEntry> {
    if (!this.options.aiEnhancer) {
      throw new Error('AI 增强器未配置')
    }

    try {
      // 构建提示词
      const prompt = this.buildAIPrompt(entry)

      // 调用 AI 生成详细步骤
      const aiEnhancer = this.options.aiEnhancer as any
      const enhancedText = await aiEnhancer.provider.generateText(prompt)

      // 解析 AI 响应并更新迁移步骤
      const enhancedSteps = this.parseAIResponse(enhancedText, entry.migrationSteps.length)

      return {
        ...entry,
        migrationSteps: enhancedSteps.length > 0 ? enhancedSteps : entry.migrationSteps,
      }
    } catch (error: any) {
      logger.error('AI 增强失败', error)
      throw error
    }
  }

  /**
   * 构建 AI 提示词
   */
  private buildAIPrompt(entry: MigrationEntry): string {
    const breakingList = entry.breakingChanges
      .map((bc, i) => `${i + 1}. ${bc.description || bc.commit.subject}`)
      .join('\n')

    return `Create a detailed migration guide for the following breaking changes in version ${entry.version}:

${breakingList}

Please provide:
1. Clear step-by-step migration instructions
2. Code examples showing before and after (if applicable)
3. Any potential gotchas or edge cases to watch out for

Format the response as numbered steps with descriptions.`
  }

  /**
   * 解析 AI 响应
   */
  private parseAIResponse(text: string, startOrder: number): MigrationStep[] {
    const steps: MigrationStep[] = []

    // 按行分割
    const lines = text.split('\n').filter(line => line.trim())

    let currentStep: Partial<MigrationStep> | null = null
    let order = startOrder

    for (const line of lines) {
      // 检测步骤标题（数字开头）
      const stepMatch = line.match(/^(\d+)\.\s+(.+)$/)
      if (stepMatch) {
        // 保存上一个步骤
        if (currentStep && currentStep.title) {
          steps.push({
            order: currentStep.order!,
            title: currentStep.title,
            description: currentStep.description || '',
            automated: false,
          })
        }

        // 开始新步骤
        currentStep = {
          order: order++,
          title: stepMatch[2].trim(),
          description: '',
        }
      } else if (currentStep) {
        // 添加到当前步骤的描述
        currentStep.description = currentStep.description
          ? `${currentStep.description}\n${line.trim()}`
          : line.trim()
      }
    }

    // 保存最后一个步骤
    if (currentStep && currentStep.title) {
      steps.push({
        order: currentStep.order!,
        title: currentStep.title,
        description: currentStep.description || '',
        automated: false,
      })
    }

    return steps
  }

  /**
   * 渲染迁移指南
   */
  render(entries: MigrationEntry[]): string {
    if (this.options.format === 'json') {
      return JSON.stringify(entries, null, 2)
    }

    // Markdown 格式
    return this.renderMarkdown(entries)
  }

  /**
   * 渲染 Markdown 格式
   */
  private renderMarkdown(entries: MigrationEntry[]): string {
    const sections: string[] = []

    for (const entry of entries) {
      sections.push(`# 迁移指南 - v${entry.version}`)
      sections.push('')

      // 概述
      sections.push('## 概述')
      sections.push('')
      sections.push(`本版本包含 ${entry.breakingChanges.length} 个破坏性变更。`)
      sections.push('')

      // 受影响的 API
      if (entry.affectedApis.length > 0) {
        sections.push('## 受影响的 API')
        sections.push('')
        entry.affectedApis.forEach(api => {
          sections.push(`- \`${api}\``)
        })
        sections.push('')
      }

      // 破坏性变更列表
      sections.push('## 破坏性变更')
      sections.push('')
      entry.breakingChanges.forEach((change, i) => {
        sections.push(`### ${i + 1}. ${change.commit.subject}`)
        sections.push('')
        sections.push(change.description || change.commit.subject)
        sections.push('')
        if (change.commit.scope) {
          sections.push(`**Scope:** \`${change.commit.scope}\``)
          sections.push('')
        }
      })

      // 迁移步骤
      if (entry.migrationSteps.length > 0) {
        sections.push('## 迁移步骤')
        sections.push('')
        entry.migrationSteps.forEach(step => {
          sections.push(`### 步骤 ${step.order}: ${step.title}`)
          sections.push('')
          sections.push(step.description)
          sections.push('')

          if (step.codeExample) {
            sections.push('**修改前:**')
            sections.push('')
            sections.push('```' + step.codeExample.language)
            sections.push(step.codeExample.before)
            sections.push('```')
            sections.push('')
            sections.push('**修改后:**')
            sections.push('')
            sections.push('```' + step.codeExample.language)
            sections.push(step.codeExample.after)
            sections.push('```')
            sections.push('')
          }
        })
      }

      // 代码示例
      if (entry.codeExamples.length > 0) {
        sections.push('## 代码示例')
        sections.push('')
        entry.codeExamples.forEach((example, i) => {
          if (example.description) {
            sections.push(`### ${example.description}`)
            sections.push('')
          }
          sections.push('**修改前:**')
          sections.push('')
          sections.push('```' + example.language)
          sections.push(example.before)
          sections.push('```')
          sections.push('')
          sections.push('**修改后:**')
          sections.push('')
          sections.push('```' + example.language)
          sections.push(example.after)
          sections.push('```')
          sections.push('')
        })
      }
    }

    return sections.join('\n')
  }
}

/**
 * 创建迁移生成器
 */
export function createMigrationGenerator(options?: MigrationGeneratorOptions): MigrationGenerator {
  return new MigrationGenerator(options)
}
