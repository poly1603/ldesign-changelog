/**
 * Gitee Release 管理器
 */

import { readFile } from 'fs/promises'
import { basename } from 'path'
import type { ChangelogContent } from '../types/changelog.js'
import type { IReleaseManager, ReleaseManagerConfig, ReleaseData } from '../types/integrations.js'
import { logger } from '../utils/logger.js'

/**
 * Gitee Release 管理器
 */
export class GiteeReleaseManager implements IReleaseManager {
  private config: Required<Omit<ReleaseManagerConfig, 'token' | 'owner' | 'repo' | 'assets'>> & {
    token?: string
    owner?: string
    repo?: string
    assets?: string[]
  }

  constructor(config: ReleaseManagerConfig = {}) {
    this.config = {
      token: config.token || process.env.GITEE_TOKEN,
      owner: config.owner,
      repo: config.repo,
      prerelease: config.prerelease || false,
      draft: config.draft || false,
      titleTemplate: config.titleTemplate || 'Release {{version}}',
      assets: config.assets,
      generateReleaseNotes: config.generateReleaseNotes || false,
      baseUrl: config.baseUrl || 'https://gitee.com/api/v5',
    }
  }

  /**
   * 创建 Release
   */
  async createRelease(
    version: string,
    changelog: ChangelogContent,
    options?: Partial<ReleaseManagerConfig>
  ): Promise<void> {
    this.validateConfig()

    const releaseData = this.prepareReleaseData(version, changelog, options)

    logger.info(`正在创建 Gitee Release: ${releaseData.name}`)

    try {
      await this.callGiteeAPI('POST', `/repos/${this.config.owner}/${this.config.repo}/releases`, {
        access_token: this.config.token,
        tag_name: releaseData.tagName,
        name: releaseData.name,
        body: releaseData.body,
        prerelease: releaseData.prerelease,
        // Gitee 不直接支持 draft，需要使用其他方式
      })

      logger.success('Gitee Release 创建成功')

      // 上传资源
      if (releaseData.assets && releaseData.assets.length > 0) {
        await this.uploadAssets(releaseData.tagName, releaseData.assets)
      }
    } catch (error: any) {
      logger.error('创建 Gitee Release 失败', error)
      throw error
    }
  }

  /**
   * 更新 Release
   */
  async updateRelease(
    tagName: string,
    changelog: ChangelogContent,
    options?: Partial<ReleaseManagerConfig>
  ): Promise<void> {
    this.validateConfig()

    const releaseData = this.prepareReleaseData(tagName, changelog, options)

    logger.info(`正在更新 Gitee Release: ${tagName}`)

    try {
      // 先获取 Release ID
      const release = await this.getRelease(tagName)
      
      if (!release) {
        throw new Error(`未找到 tag ${tagName} 的 Release`)
      }

      await this.callGiteeAPI(
        'PATCH',
        `/repos/${this.config.owner}/${this.config.repo}/releases/${release.id}`,
        {
          access_token: this.config.token,
          tag_name: releaseData.tagName,
          name: releaseData.name,
          body: releaseData.body,
          prerelease: releaseData.prerelease,
        }
      )

      logger.success('Gitee Release 更新成功')
    } catch (error: any) {
      logger.error('更新 Gitee Release 失败', error)
      throw error
    }
  }

  /**
   * 删除 Release
   */
  async deleteRelease(tagName: string): Promise<void> {
    this.validateConfig()

    logger.info(`正在删除 Gitee Release: ${tagName}`)

    try {
      // 先获取 Release ID
      const release = await this.getRelease(tagName)
      
      if (!release) {
        throw new Error(`未找到 tag ${tagName} 的 Release`)
      }

      await this.callGiteeAPI(
        'DELETE',
        `/repos/${this.config.owner}/${this.config.repo}/releases/${release.id}`,
        {
          access_token: this.config.token,
        }
      )

      logger.success('Gitee Release 删除成功')
    } catch (error: any) {
      logger.error('删除 Gitee Release 失败', error)
      throw error
    }
  }

  /**
   * 获取 Release
   */
  async getRelease(tagName: string): Promise<any> {
    this.validateConfig()

    try {
      const response = await this.callGiteeAPI(
        'GET',
        `/repos/${this.config.owner}/${this.config.repo}/releases/tags/${tagName}?access_token=${this.config.token}`
      )

      return response
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * 准备 Release 数据
   */
  private prepareReleaseData(
    version: string,
    changelog: ChangelogContent,
    options?: Partial<ReleaseManagerConfig>
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
        if (breaking.migration) {
          lines.push(`  - 迁移: ${breaking.migration}`)
        }
      }
      lines.push('')
    }

    // 按类型分组的变更
    for (const section of changelog.sections) {
      lines.push(`## ${section.title}`)
      lines.push('')
      for (const commit of section.commits) {
        let line = `- ${commit.subject}`
        if (commit.scope) {
          line = `- **${commit.scope}**: ${commit.subject}`
        }
        if (commit.commitLink) {
          line += ` ([${commit.shortHash}](${commit.commitLink}))`
        }
        lines.push(line)
      }
      lines.push('')
    }

    // 贡献者
    if (changelog.contributors && changelog.contributors.length > 0) {
      lines.push('## 👥 贡献者')
      lines.push('')
      lines.push('感谢以下贡献者的付出：')
      lines.push('')
      for (const contributor of changelog.contributors) {
        lines.push(`- ${contributor.name} (@${contributor.username || contributor.name})`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 调用 Gitee API
   */
  private async callGiteeAPI(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.config.baseUrl}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body && method !== 'GET' ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gitee API 错误: ${response.status} - ${error}`)
    }

    if (method === 'DELETE') {
      return null
    }

    return response.json()
  }

  /**
   * 上传资源文件
   */
  private async uploadAssets(
    tagName: string,
    assets: string[]
  ): Promise<void> {
    logger.info(`正在上传 ${assets.length} 个资源文件...`)

    for (const assetPath of assets) {
      try {
        const content = await readFile(assetPath)
        const filename = basename(assetPath)

        // Gitee 的文件上传需要使用 multipart/form-data
        const formData = new FormData()
        formData.append('access_token', this.config.token!)
        formData.append('file', new Blob([new Uint8Array(content)]), filename)

        const response = await fetch(
          `${this.config.baseUrl}/repos/${this.config.owner}/${this.config.repo}/releases/${tagName}/attach_files`,
          {
            method: 'POST',
            body: formData,
          }
        )

        if (!response.ok) {
          throw new Error(`上传失败: ${response.status}`)
        }

        logger.debug(`已上传: ${filename}`)
      } catch (error: any) {
        logger.warn(`上传资源文件失败: ${assetPath}`)
      }
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): void {
    if (!this.config.token) {
      throw new Error('未配置 Gitee Token，请设置 GITEE_TOKEN 环境变量或在配置中提供 token')
    }

    if (!this.config.owner || !this.config.repo) {
      throw new Error('未配置 owner 或 repo')
    }
  }
}

