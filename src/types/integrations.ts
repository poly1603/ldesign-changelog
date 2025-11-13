/**
 * 集成相关类型定义
 */

import type { ChangelogContent } from './changelog.js'

/**
 * Release Manager 通用配置
 */
export interface ReleaseManagerConfig {
  /** 访问 Token */
  token?: string

  /** 仓库所有者 */
  owner?: string

  /** 仓库名称 */
  repo?: string

  /** 是否为预发布 */
  prerelease?: boolean

  /** 是否为草稿 */
  draft?: boolean

  /** Release 标题模板 */
  titleTemplate?: string

  /** 要上传的资源文件 */
  assets?: string[]

  /** 是否生成发布说明 */
  generateReleaseNotes?: boolean

  /** API Base URL */
  baseUrl?: string
}

/**
 * Release 数据
 */
export interface ReleaseData {
  /** 标签名 */
  tagName: string

  /** Release 名称 */
  name: string

  /** Release 内容 */
  body: string

  /** 是否为预发布 */
  prerelease: boolean

  /** 是否为草稿 */
  draft: boolean

  /** 资源文件路径 */
  assets?: string[]
}

/**
 * Release Manager 接口
 */
export interface IReleaseManager {
  /** 创建 Release */
  createRelease(
    version: string,
    changelog: ChangelogContent,
    options?: Partial<ReleaseManagerConfig>
  ): Promise<void>

  /** 更新 Release */
  updateRelease(
    tagName: string,
    changelog: ChangelogContent,
    options?: Partial<ReleaseManagerConfig>
  ): Promise<void>

  /** 删除 Release */
  deleteRelease(tagName: string): Promise<void>

  /** 获取 Release */
  getRelease(tagName: string): Promise<any>
}

/**
 * Webhook 配置
 */
export interface WebhookConfig {
  /** Webhook URL */
  url: string

  /** 触发事件 */
  events?: ('release' | 'generate' | 'error')[]

  /** 自定义请求头 */
  headers?: Record<string, string>

  /** 超时时间（毫秒） */
  timeout?: number

  /** 重试次数 */
  retries?: number
}

/**
 * Slack Webhook 配置
 */
export interface SlackWebhookConfig extends WebhookConfig {
  /** 频道名称 */
  channel?: string

  /** 用户名 */
  username?: string

  /** 图标 Emoji */
  iconEmoji?: string

  /** 图标 URL */
  iconUrl?: string
}

/**
 * Discord Webhook 配置
 */
export interface DiscordWebhookConfig extends WebhookConfig {
  /** 用户名 */
  username?: string

  /** 头像 URL */
  avatarUrl?: string

  /** 是否使用 TTS */
  tts?: boolean
}

/**
 * Teams Webhook 配置
 */
export interface TeamsWebhookConfig extends WebhookConfig {
  /** 主题颜色 */
  themeColor?: string

  /** 卡片类型 */
  cardType?: 'MessageCard' | 'AdaptiveCard'
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  /** 是否启用通知 */
  enabled?: boolean

  /** Slack 配置 */
  slack?: SlackWebhookConfig

  /** Discord 配置 */
  discord?: DiscordWebhookConfig

  /** Teams 配置 */
  teams?: TeamsWebhookConfig

  /** 自定义 Webhook */
  custom?: WebhookConfig[]
}
