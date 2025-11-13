/**
 * GitHub Release 管理器
 */

import { readFile } from 'fs/promises'
import { basename } from 'path'
import type { ChangelogContent } from '../types/changelog.js'
import type { ReleaseData, ReleaseManagerConfig } from '../types/integrations.js'
import { logger } from '../utils/logger.js'

/**
 * GitHub Release 配置
 */
export interface GitHubReleaseConfig extends ReleaseManagerConfig {
  /** 是否生成发布说明 */
  generateReleaseNotes?: boolean
}

/**
 * GitHub Release 管理器
 */
export class GitHubReleaseManager {
  private config: Required<Omit<GitHubReleaseConfig, 'token' | 'owner' | 'repo' | 'assets'>> & {
    token?: string
    owner?: string
    repo?: string
    assets?: string[]
  }

  constructor(config: GitHubReleaseConfig = {}) {
    this.config = {
      token: config.token || process.env.GITHUB_TOKEN,
      owner: config.owner,
      repo: config.repo,
      prerelease: config.prerelease || false,
      draft: config.draft || false,
      titleTemplate: config.titleTemplate || 'Release {{version}}',
      assets: config.assets,
      generateReleaseNotes: config.generateReleaseNotes || false,
      baseUrl: config.baseUrl || 'https://api.github.com',
    }
  }

  /**
   * 创建 Release
   */
  async createRelease(
    version: string,
    changelog: ChangelogContent,
    options?: Partial<GitHubReleaseConfig>
  ): Promise<void> {
    // 验证配置
    this.validateConfig()

    const releaseData = this.prepareReleaseData(version, changelog, options)

    logger.info(`正在创建 GitHub Release: ${releaseData.name}`)

    try {
      await this.callGitHubAPI('POST', '/repos/{owner}/{repo}/releases', releaseData)
      logger.success('GitHub Release 创建成功')

      // 上传资源
      if (releaseData.assets && releaseData.assets.length > 0) {
        await this.uploadAssets(releaseData.tagName, releaseData.assets)
      }
    } catch (error: any) {
      logger.error('创建 GitHub Release 失败', error)
      throw error
    }
  }

  /**
   * 更新 Release
   */
  async updateRelease(
    tagName: string,
    changelog: ChangelogContent,
    options?: Partial<GitHubReleaseConfig>
  ): Promise<void> {
    this.validateConfig()

    const releaseData = this.prepareReleaseData(tagName, changelog, options)

    logger.info(`正在更新 GitHub Release: ${tagName}`)

    try {
      // 获取现有 Release
      const release = await this.getReleaseByTag(tagName)
      
      if (!release) {
        throw new Error(`未找到 tag ${tagName} 的 Release`)
      }

      await this.callGitHubAPI(
        'PATCH',
        `/repos/{owner}/{repo}/releases/${release.id}`,
        releaseData
      )
      
      logger.success('GitHub Release 更新成功')
    } catch (error: any) {
      logger.error('更新 GitHub Release 失败', error)
      throw error
    }
  }

  /**
   * 删除 Release
   */
  async deleteRelease(tagName: string): Promise<void> {
    this.validateConfig()

    logger.info(`正在删除 GitHub Release: ${tagName}`)

    try {
      const release = await this.getReleaseByTag(tagName)
      
      if (!release) {
        throw new Error(`未找到 tag ${tagName} 的 Release`)
      }

      await this.callGitHubAPI(
        'DELETE',
        `/repos/{owner}/{repo}/releases/${release.id}`
      )
      
      logger.success('GitHub Release 删除成功')
    } catch (error: any) {
      logger.error('删除 GitHub Release 失败', error)
      throw error
    }
  }

  /**
   * 获取 Release
   */
  async getRelease(tagName: string): Promise<any> {
    this.validateConfig()
    return await this.getReleaseByTag(tagName)
  }

  /**
   * 准备 Release 数据
   */
  private prepareReleaseData(
    version: string,
    changelog: ChangelogContent,
    options?: Partial<GitHubReleaseConfig>
  ): ReleaseData {
    const tagName = version.startsWith('v') ? version : `v${version}`
    const name = this.config.titleTemplate.replace('{{version}}', version)
    const body = this.formatReleaseBody(changelog)

    return {
      tagName,
      name,
      body,
      prerelease: options?.prerelease ?? this.config.prerelease,
      draft: options?.draft ?? this.config.draft,
      assets: options?.assets ?? this.config.assets,
    }
  }

  /**
   * 格式化 Release 内容
   */
  private formatReleaseBody(changelog: ChangelogContent): string {
    const lines: string[] = []

    // 添加统计信息
    if (changelog.stats) {
      lines.push('## 📊 统计')
      lines.push('')
      lines.push(`- 提交数: ${changelog.stats.totalCommits}`)
      lines.push(`- 贡献者: ${changelog.stats.contributorCount}`)
      
      if (changelog.stats.issueCount) {
        lines.push(`- 关联 Issue: ${changelog.stats.issueCount}`)
      }
      
      if (changelog.stats.prCount) {
        lines.push(`- 关联 PR: ${changelog.stats.prCount}`)
      }
      
      lines.push('')
    }

    // Breaking Changes
    if (changelog.breakingChanges && changelog.breakingChanges.length > 0) {
      lines.push('## 💥 破坏性变更')
      lines.push('')
      for (const breaking of changelog.breakingChanges) {
        lines.push(`- ${breaking.description}`)
      }
      lines.push('')
    }

    // 各类型更新
    for (const section of changelog.sections) {
      lines.push(`## ${section.title}`)
      lines.push('')
      
      for (const commit of section.commits) {
        let line = `- ${commit.subject}`
        
        if (commit.scope) {
          line = `- **${commit.scope}**: ${commit.subject}`
        }
        
        if (commit.prLink) {
          line += ` (${commit.prLink})`
        }
        
        if (commit.author && commit.author.name) {
          line += ` by @${commit.author.name}`
        }
        
        lines.push(line)
      }
      
      lines.push('')
    }

    // 贡献者
    if (changelog.contributors && changelog.contributors.length > 0) {
      lines.push('## 👥 贡献者')
      lines.push('')
      
      for (const contributor of changelog.contributors) {
        lines.push(`- @${contributor.name} (${contributor.commitCount} 次提交)`)
      }
      
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 上传资源
   */
  private async uploadAssets(tagName: string, assetPaths: string[]): Promise<void> {
    logger.info(`正在上传 ${assetPaths.length} 个资源文件...`)

    for (const assetPath of assetPaths) {
      try {
        const fileName = basename(assetPath)
        const content = await readFile(assetPath)
        
        logger.info(`上传: ${fileName}`)
        
        await this.callGitHubAPI(
          'POST',
          `/repos/{owner}/{repo}/releases/tags/${tagName}/assets?name=${fileName}`,
          content,
          {
            'Content-Type': 'application/octet-stream',
          }
        )
        
        logger.success(`${fileName} 上传成功`)
      } catch (error) {
        logger.error(`上传资源失败: ${assetPath}`, error as Error)
      }
    }
  }

  /**
   * 获取 Release by Tag
   */
  private async getReleaseByTag(tagName: string): Promise<any> {
    try {
      const response = await this.callGitHubAPI(
        'GET',
        `/repos/{owner}/{repo}/releases/tags/${tagName}`
      )
      return response
    } catch {
      return null
    }
  }

  /**
   * 调用 GitHub API
   */
  private async callGitHubAPI(
    method: string,
    endpoint: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const url = `https://api.github.com${this.replacePathParams(endpoint)}`

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    })

    if (!response.ok) {
      const error: any = await response.json()
      throw new Error(`GitHub API 错误: ${error.message || response.statusText}`)
    }

    return response.json()
  }

  /**
   * 替换路径参数
   */
  private replacePathParams(endpoint: string): string {
    return endpoint
      .replace('{owner}', this.config.owner || '')
      .replace('{repo}', this.config.repo || '')
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.token) {
      throw new Error('缺少 GitHub Token，请设置 GITHUB_TOKEN 环境变量或在配置中提供')
    }

    if (!this.config.owner || !this.config.repo) {
      throw new Error('缺少仓库信息（owner/repo）')
    }
  }

  /**
   * 从仓库 URL 解析 owner 和 repo
   */
  static parseRepoUrl(url: string): { owner: string; repo: string } | null {
    // 支持多种格式
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // git@github.com:owner/repo.git
    const patterns = [
      /github\.com[:/]([^/]+)\/([^/.]+)(\.git)?$/,
      /github\.com\/([^/]+)\/([^/]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        }
      }
    }

    return null
  }
}

