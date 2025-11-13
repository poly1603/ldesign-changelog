/**
 * AI 辅助增强服务
 * 
 * 使用 LLM 优化 Changelog 描述和生成摘要
 */

import type {
  AIConfig,
  AIEnhanceOptions,
  AIEnhancedContent,
  AIProvider,
} from '../types/ai.js'
import type { ChangelogContent, ChangelogCommit } from '../types/changelog.js'
import { logger } from '../utils/logger.js'

/**
 * AI 提供商基类
 */
abstract class AIProviderBase {
  protected config: AIConfig

  constructor(config: AIConfig) {
    this.config = config
  }

  abstract generateText(prompt: string): Promise<string>

  async enhanceCommits(commits: ChangelogCommit[]): Promise<ChangelogCommit[]> {
    const enhanced: ChangelogCommit[] = []

    for (const commit of commits) {
      try {
        const prompt = this.buildCommitEnhancePrompt(commit)
        const enhancedSubject = await this.generateText(prompt)

        enhanced.push({
          ...commit,
          subject: enhancedSubject.trim(),
        })
      } catch (error) {
        logger.warn(`增强提交失败: ${commit.hash}`)
        enhanced.push(commit) // 保留原始提交
      }
    }

    return enhanced
  }

  async generateSummary(content: ChangelogContent): Promise<string> {
    const prompt = this.buildSummaryPrompt(content)
    return await this.generateText(prompt)
  }

  async generateHighlights(content: ChangelogContent): Promise<string[]> {
    const prompt = this.buildHighlightsPrompt(content)
    const text = await this.generateText(prompt)
    
    // 解析高亮列表
    return text
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'))
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(Boolean)
  }

  async generateMigration(content: ChangelogContent): Promise<string> {
    if (!content.breakingChanges || content.breakingChanges.length === 0) {
      return ''
    }

    const prompt = this.buildMigrationPrompt(content)
    return await this.generateText(prompt)
  }

  protected buildCommitEnhancePrompt(commit: ChangelogCommit): string {
    return `Please improve the following git commit message to be more clear, professional, and descriptive. Keep it concise (under 80 characters if possible).

Original: ${commit.subject}
${commit.body ? `Details: ${commit.body}` : ''}

Enhanced message:`
  }

  protected buildSummaryPrompt(content: ChangelogContent): string {
    const commitList = content.commits
      .slice(0, 20) // 只取前20个
      .map(c => `- ${c.type}: ${c.subject}`)
      .join('\n')

    return `Summarize the following changes in a concise paragraph (2-3 sentences):

${commitList}

Summary:`
  }

  protected buildHighlightsPrompt(content: ChangelogContent): string {
    const commitList = content.commits
      .map(c => `- ${c.type}: ${c.subject}`)
      .join('\n')

    return `List the 3-5 most important highlights from these changes. Format as bullet points.

${commitList}

Highlights:`
  }

  protected buildMigrationPrompt(content: ChangelogContent): string {
    const breakingList = content.breakingChanges!
      .map(b => `- ${b.description}`)
      .join('\n')

    return `Create a migration guide for the following breaking changes. Be specific and provide code examples if relevant.

Breaking Changes:
${breakingList}

Migration Guide:`
  }
}

/**
 * OpenAI 提供商
 */
class OpenAIProvider extends AIProviderBase {
  async generateText(prompt: string): Promise<string> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('未配置 OpenAI API Key')
    }

    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1'
    const model = this.config.model || 'gpt-3.5-turbo'
    const temperature = this.config.temperature ?? 0.7
    const maxTokens = this.config.maxTokens || 500

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: this.config.customPrompt
                ? `${this.config.customPrompt}\n\n${prompt}`
                : prompt,
            },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API 错误: ${response.status}`)
      }

      const data: any = await response.json()
      return data.choices[0].message.content
    } catch (error: any) {
      logger.error('OpenAI API 调用失败', error)
      throw error
    }
  }
}

/**
 * Anthropic (Claude) 提供商
 */
class AnthropicProvider extends AIProviderBase {
  async generateText(prompt: string): Promise<string> {
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('未配置 Anthropic API Key')
    }

    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com/v1'
    const model = this.config.model || 'claude-3-sonnet-20240229'
    const temperature = this.config.temperature ?? 0.7
    const maxTokens = this.config.maxTokens || 500

    try {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: this.config.customPrompt
                ? `${this.config.customPrompt}\n\n${prompt}`
                : prompt,
            },
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (!response.ok) {
        throw new Error(`Anthropic API 错误: ${response.status}`)
      }

      const data: any = await response.json()
      return data.content[0].text
    } catch (error: any) {
      logger.error('Anthropic API 调用失败', error)
      throw error
    }
  }
}

/**
 * 本地模型提供商（通过 Ollama 等）
 */
class LocalProvider extends AIProviderBase {
  async generateText(prompt: string): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434'
    const model = this.config.model || 'llama2'
    const temperature = this.config.temperature ?? 0.7

    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt: this.config.customPrompt
            ? `${this.config.customPrompt}\n\n${prompt}`
            : prompt,
          temperature,
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`本地模型 API 错误: ${response.status}`)
      }

      const data: any = await response.json()
      return data.response
    } catch (error: any) {
      logger.error('本地模型 API 调用失败', error)
      throw error
    }
  }
}

/**
 * AI 增强器
 */
export class AIEnhancer {
  private provider: AIProviderBase

  constructor(config: AIConfig) {
    this.provider = this.createProvider(config)
  }

  private createProvider(config: AIConfig): AIProviderBase {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config)
      case 'anthropic':
        return new AnthropicProvider(config)
      case 'local':
        return new LocalProvider(config)
      default:
        throw new Error(`不支持的 AI 提供商: ${config.provider}`)
    }
  }

  /**
   * 增强 Changelog 内容
   */
  async enhance(
    content: ChangelogContent,
    options: AIEnhanceOptions = {}
  ): Promise<AIEnhancedContent> {
    const startTime = Date.now()
    const result: AIEnhancedContent = {
      original: content,
    }

    try {
      // 增强提交描述
      if (options.enhanceCommits) {
        logger.info('正在优化提交描述...')
        result.enhancedCommits = await this.provider.enhanceCommits(content.commits)
      }

      // 生成摘要
      if (options.generateSummary) {
        logger.info('正在生成摘要...')
        result.summary = await this.provider.generateSummary(content)
      }

      // 生成亮点
      if (options.generateHighlights) {
        logger.info('正在生成亮点...')
        result.highlights = await this.provider.generateHighlights(content)
      }

      // 生成迁移指南
      if (options.generateMigration && content.breakingChanges?.length) {
        logger.info('正在生成迁移指南...')
        result.migration = await this.provider.generateMigration(content)
      }

      result.processingTime = Date.now() - startTime
      logger.success(`AI 增强完成，耗时 ${result.processingTime}ms`)

      return result
    } catch (error: any) {
      logger.error('AI 增强失败', error)
      throw error
    }
  }

  /**
   * 翻译内容
   */
  async translate(
    text: string,
    targetLanguage: string
  ): Promise<string> {
    const prompt = `Translate the following text to ${targetLanguage}. Keep the formatting and structure:

${text}

Translation:`

    return await this.provider.generateText(prompt)
  }
}

/**
 * 创建 AI 增强器
 */
export function createAIEnhancer(config: AIConfig): AIEnhancer {
  return new AIEnhancer(config)
}
