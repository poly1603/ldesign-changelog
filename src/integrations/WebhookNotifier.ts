/**
 * Webhook 通知管理器
 */

import type { ChangelogContent } from '../types/changelog.js'
import type {
  NotificationConfig,
  WebhookConfig,
  SlackWebhookConfig,
  DiscordWebhookConfig,
  TeamsWebhookConfig,
} from '../types/integrations.js'
import { logger } from '../utils/logger.js'

/**
 * 通知事件类型
 */
export type NotificationEvent = 'release' | 'generate' | 'error'

/**
 * 通知数据
 */
export interface NotificationData {
  /** 事件类型 */
  event: NotificationEvent

  /** Changelog 内容（可选） */
  changelog?: ChangelogContent

  /** 版本号 */
  version?: string

  /** 错误信息（可选） */
  error?: string

  /** 额外数据 */
  metadata?: Record<string, any>
}

/**
 * Webhook 通知管理器
 */
export class WebhookNotifier {
  private config: NotificationConfig

  constructor(config: NotificationConfig = {}) {
    this.config = {
      enabled: config.enabled !== false,
      ...config,
    }
  }

  /**
   * 发送通知
   */
  async notify(data: NotificationData): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('通知已禁用')
      return
    }

    const promises: Promise<void>[] = []

    // Slack 通知
    if (this.config.slack && this.shouldSendNotification(this.config.slack, data.event)) {
      promises.push(this.sendSlackNotification(this.config.slack, data))
    }

    // Discord 通知
    if (this.config.discord && this.shouldSendNotification(this.config.discord, data.event)) {
      promises.push(this.sendDiscordNotification(this.config.discord, data))
    }

    // Teams 通知
    if (this.config.teams && this.shouldSendNotification(this.config.teams, data.event)) {
      promises.push(this.sendTeamsNotification(this.config.teams, data))
    }

    // 自定义 Webhook
    if (this.config.custom) {
      for (const webhook of this.config.custom) {
        if (this.shouldSendNotification(webhook, data.event)) {
          promises.push(this.sendCustomNotification(webhook, data))
        }
      }
    }

    // 等待所有通知发送完成
    await Promise.allSettled(promises)
  }

  /**
   * 判断是否应该发送通知
   */
  private shouldSendNotification(config: WebhookConfig, event: NotificationEvent): boolean {
    if (!config.events || config.events.length === 0) {
      return true // 默认发送所有事件
    }
    return config.events.includes(event)
  }

  /**
   * 发送 Slack 通知
   */
  private async sendSlackNotification(
    config: SlackWebhookConfig,
    data: NotificationData
  ): Promise<void> {
    try {
      const payload = this.formatSlackPayload(config, data)

      await this.sendWebhook(config.url, payload, config)

      logger.debug('Slack 通知发送成功')
    } catch (error: any) {
      logger.warn('Slack 通知发送失败')
    }
  }

  /**
   * 格式化 Slack 消息
   */
  private formatSlackPayload(config: SlackWebhookConfig, data: NotificationData): any {
    const { event, changelog, version, error } = data

    const payload: any = {
      username: config.username || 'Changelog Bot',
      icon_emoji: config.iconEmoji || ':memo:',
    }

    if (config.channel) {
      payload.channel = config.channel
    }

    if (config.iconUrl) {
      payload.icon_url = config.iconUrl
    }

    // 根据事件类型生成消息
    if (event === 'release' && changelog) {
      payload.text = `🎉 新版本发布: *${version}*`
      payload.attachments = [
        {
          color: 'good',
          fields: [
            {
              title: '版本号',
              value: version,
              short: true,
            },
            {
              title: '提交数',
              value: changelog.stats?.totalCommits || 0,
              short: true,
            },
            {
              title: '贡献者',
              value: changelog.stats?.contributorCount || 0,
              short: true,
            },
          ],
          footer: 'Changelog Generator',
          ts: Math.floor(Date.now() / 1000),
        },
      ]

      if (changelog.compareUrl) {
        payload.attachments[0].title = '查看完整变更'
        payload.attachments[0].title_link = changelog.compareUrl
      }
    } else if (event === 'generate' && changelog) {
      payload.text = `📝 Changelog 生成完成: *${version}*`
      payload.attachments = [
        {
          color: '#36a64f',
          text: `包含 ${changelog.commits.length} 个提交`,
        },
      ]
    } else if (event === 'error') {
      payload.text = `❌ 错误: ${error || '未知错误'}`
      payload.attachments = [
        {
          color: 'danger',
          text: error,
        },
      ]
    }

    return payload
  }

  /**
   * 发送 Discord 通知
   */
  private async sendDiscordNotification(
    config: DiscordWebhookConfig,
    data: NotificationData
  ): Promise<void> {
    try {
      const payload = this.formatDiscordPayload(config, data)

      await this.sendWebhook(config.url, payload, config)

      logger.debug('Discord 通知发送成功')
    } catch (error: any) {
      logger.warn('Discord 通知发送失败')
    }
  }

  /**
   * 格式化 Discord 消息
   */
  private formatDiscordPayload(config: DiscordWebhookConfig, data: NotificationData): any {
    const { event, changelog, version, error } = data

    const payload: any = {
      username: config.username || 'Changelog Bot',
      tts: config.tts || false,
    }

    if (config.avatarUrl) {
      payload.avatar_url = config.avatarUrl
    }

    // 根据事件类型生成消息
    if (event === 'release' && changelog) {
      payload.content = `🎉 **新版本发布: ${version}**`
      payload.embeds = [
        {
          title: `Version ${version}`,
          color: 3066993, // 绿色
          fields: [
            {
              name: '提交数',
              value: `${changelog.stats?.totalCommits || 0}`,
              inline: true,
            },
            {
              name: '贡献者',
              value: `${changelog.stats?.contributorCount || 0}`,
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ]

      if (changelog.compareUrl) {
        payload.embeds[0].url = changelog.compareUrl
      }
    } else if (event === 'generate' && changelog) {
      payload.content = `📝 **Changelog 生成完成: ${version}**`
      payload.embeds = [
        {
          description: `包含 ${changelog.commits.length} 个提交`,
          color: 5793266, // 蓝色
        },
      ]
    } else if (event === 'error') {
      payload.content = `❌ **错误发生**`
      payload.embeds = [
        {
          description: error || '未知错误',
          color: 15158332, // 红色
        },
      ]
    }

    return payload
  }

  /**
   * 发送 Teams 通知
   */
  private async sendTeamsNotification(
    config: TeamsWebhookConfig,
    data: NotificationData
  ): Promise<void> {
    try {
      const payload = this.formatTeamsPayload(config, data)

      await this.sendWebhook(config.url, payload, config)

      logger.debug('Teams 通知发送成功')
    } catch (error: any) {
      logger.warn('Teams 通知发送失败')
    }
  }

  /**
   * 格式化 Teams 消息
   */
  private formatTeamsPayload(config: TeamsWebhookConfig, data: NotificationData): any {
    const { event, changelog, version, error } = data
    const cardType = config.cardType || 'MessageCard'

    if (cardType === 'MessageCard') {
      const payload: any = {
        '@type': 'MessageCard',
        '@context': 'https://schema.org/extensions',
        themeColor: config.themeColor || '0076D7',
        summary: `Changelog ${event}`,
      }

      if (event === 'release' && changelog) {
        payload.title = `🎉 新版本发布: ${version}`
        payload.sections = [
          {
            facts: [
              {
                name: '版本号',
                value: version,
              },
              {
                name: '提交数',
                value: `${changelog.stats?.totalCommits || 0}`,
              },
              {
                name: '贡献者',
                value: `${changelog.stats?.contributorCount || 0}`,
              },
            ],
          },
        ]

        if (changelog.compareUrl) {
          payload.potentialAction = [
            {
              '@type': 'OpenUri',
              name: '查看完整变更',
              targets: [
                {
                  os: 'default',
                  uri: changelog.compareUrl,
                },
              ],
            },
          ]
        }
      } else if (event === 'generate' && changelog) {
        payload.title = `📝 Changelog 生成完成: ${version}`
        payload.text = `包含 ${changelog.commits.length} 个提交`
      } else if (event === 'error') {
        payload.title = '❌ 错误发生'
        payload.text = error || '未知错误'
        payload.themeColor = 'FF0000'
      }

      return payload
    }

    // TODO: 支持 AdaptiveCard 格式
    return {}
  }

  /**
   * 发送自定义 Webhook
   */
  private async sendCustomNotification(
    config: WebhookConfig,
    data: NotificationData
  ): Promise<void> {
    try {
      await this.sendWebhook(config.url, data, config)

      logger.debug('自定义 Webhook 发送成功')
    } catch (error: any) {
      logger.warn('自定义 Webhook 发送失败')
    }
  }

  /**
   * 发送 Webhook 请求
   */
  private async sendWebhook(
    url: string,
    payload: any,
    config: WebhookConfig
  ): Promise<void> {
    const timeout = config.timeout || 5000
    const retries = config.retries || 1

    let lastError: Error | null = null

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...config.headers,
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`)
        }

        return // 成功
      } catch (error: any) {
        lastError = error
        
        if (attempt < retries - 1) {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    throw lastError
  }
}

/**
 * 创建 Webhook 通知器
 */
export function createWebhookNotifier(config?: NotificationConfig): WebhookNotifier {
  return new WebhookNotifier(config)
}
