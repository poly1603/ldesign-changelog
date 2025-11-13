/**
 * GitLab Release 管理器
 */

import { readFile } from 'fs/promises'
import { basename } from 'path'
import type { ChangelogContent } from '../types/changelog.js'
import type { IReleaseManager, ReleaseManagerConfig, ReleaseData } from '../types/integrations.js'
import { logger } from '../utils/logger.js'

/**
 * GitLab Release 管理器
 */
export class GitLabReleaseManager implements IReleaseManager {
  private config: Required<Omit<ReleaseManagerConfig, 'token' | 'owner' | 'repo' | 'assets'>> & {
    token?: string
    owner?: string
    repo?: string
    assets?: string[]
  }

  constructor(config: ReleaseManagerConfig = {}) {
    this.config = {
      token: config.token || process.env.GITLAB_TOKEN,
      owner: config.owner,
      repo: config.repo,
      prerelease: config.prerelease || false,
      draft: config.draft || false,
      titleTemplate: config.titleTemplate || 'Release {{version}}',
      assets: config.assets,
      generateReleaseNotes: config.generateReleaseNotes || false,
      baseUrl: config.baseUrl || 'https://gitlab.com/api/v4',
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

    logger.info(`正在创建 GitLab Release: ${releaseData.name}`)

    try {
      const projectId = await this.getProjectId()
      
      await this.callGitLabAPI('POST', `/projects/${projectId}/releases`, {
        tag_name: releaseData.tagName,
        name: releaseData.name,
        description: releaseData.body,
        released_at: new Date().toISOString(),
        // GitLab 不支持 draft，但可以用 milestones 等其他方式标记
      })

      logger.success('GitLab Release 创建成功')

      // 上传资源
      if (releaseData.assets && releaseData.assets.length > 0) {
        await this.uploadAssets(projectId, releaseData.tagName, releaseData.assets)
      }
    } catch (error: any) {
      logger.error('创建 GitLab Release 失败', error)
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

    logger.info(`正在更新 GitLab Release: ${tagName}`)

    try {
      const projectId = await this.getProjectId()

      await this.callGitLabAPI(
        'PUT',
        `/projects/${projectId}/releases/${encodeURIComponent(tagName)}`,
        {
          name: releaseData.name,
          description: releaseData.body,
        }
      )

      logger.success('GitLab Release 更新成功')
    } catch (error: any) {
      logger.error('更新 GitLab Release 失败', error)
      throw error
    }
  }

  /**
   * 删除 Release
   */
  async deleteRelease(tagName: string): Promise<void> {
    this.validateConfig()

    logger.info(`正在删除 GitLab Release: ${tagName}`)

    try {
      const projectId = await this.getProjectId()

      await this.callGitLabAPI(
        'DELETE',
        `/projects/${projectId}/releases/${encodeURIComponent(tagName)}`
      )

      logger.success('GitLab Release 删除成功')
    } catch (error: any) {
      logger.error('删除 GitLab Release 失败', error)
      throw error
    }
  }

  /**
   * 获取 Release
   */
  async getRelease(tagName: string): Promise<any> {
    this.validateConfig()

    try {
      const projectId = await this.getProjectId()

      const response = await this.callGitLabAPI(
        'GET',
        `/projects/${projectId}/releases/${encodeURIComponent(tagName)}`
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
        lines.push(`- 关联 MR: ${changelog.stats.prCount}`)
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
   * 获取项目 ID
   */
  private async getProjectId(): Promise<string> {
    if (!this.config.owner || !this.config.repo) {
      throw new Error('未配置 owner 或 repo')
    }

    return encodeURIComponent(`${this.config.owner}/${this.config.repo}`)
  }

  /**
   * 调用 GitLab API
   */
  private async callGitLabAPI(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.config.baseUrl}${path}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.config.token) {
      headers['PRIVATE-TOKEN'] = this.config.token
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GitLab API 错误: ${response.status} - ${error}`)
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
    projectId: string,
    tagName: string,
    assets: string[]
  ): Promise<void> {
    logger.info(`正在上传 ${assets.length} 个资源文件...`)

    for (const assetPath of assets) {
      try {
        const content = await readFile(assetPath)
        const filename = basename(assetPath)

        // 先上传文件到项目
        const uploadResponse = await this.callGitLabAPI(
          'POST',
          `/projects/${projectId}/uploads`,
          {
            file: content.toString('base64'),
          }
        )

        // 然后将上传的文件链接添加到 Release
        await this.callGitLabAPI(
          'POST',
          `/projects/${projectId}/releases/${encodeURIComponent(tagName)}/assets/links`,
          {
            name: filename,
            url: uploadResponse.url,
          }
        )

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
      throw new Error('未配置 GitLab Token，请设置 GITLAB_TOKEN 环境变量或在配置中提供 token')
    }

    if (!this.config.owner || !this.config.repo) {
      throw new Error('未配置 owner 或 repo')
    }
  }
}

