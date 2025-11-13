/**
 * Release Manager 工厂
 */

import type { RepositoryInfo } from '../types/changelog.js'
import type { IReleaseManager, ReleaseManagerConfig } from '../types/integrations.js'
import { GitHubReleaseManager } from './GitHubReleaseManager.js'
import { GitLabReleaseManager } from './GitLabReleaseManager.js'
import { GiteeReleaseManager } from './GiteeReleaseManager.js'
import { getRepositoryInfo } from '../utils/git-utils.js'
import { logger } from '../utils/logger.js'

/**
 * 创建 Release Manager
 * 
 * 根据仓库类型自动选择合适的 Release Manager
 */
export async function createReleaseManager(
  config?: ReleaseManagerConfig & { cwd?: string }
): Promise<IReleaseManager> {
  const cwd = config?.cwd || process.cwd()
  
  // 尝试从 Git 获取仓库信息
  let repoInfo: RepositoryInfo | null = null
  
  try {
    repoInfo = await getRepositoryInfo(cwd)
  } catch (error) {
    logger.debug('无法从 Git 获取仓库信息')
  }
  
  // 如果有仓库信息，从中提取 owner 和 repo
  if (repoInfo && repoInfo.owner && repoInfo.name) {
    config = {
      ...config,
      owner: config?.owner || repoInfo.owner,
      repo: config?.repo || repoInfo.name,
    }
  }
  
  // 根据仓库类型或配置选择 Manager
  const repoType = repoInfo?.type || detectRepoTypeFromConfig(config)
  
  switch (repoType) {
    case 'github':
      logger.debug('使用 GitHub Release Manager')
      return new GitHubReleaseManager(config)
      
    case 'gitlab':
      logger.debug('使用 GitLab Release Manager')
      return new GitLabReleaseManager(config)
      
    case 'gitee':
      logger.debug('使用 Gitee Release Manager')
      return new GiteeReleaseManager(config)
      
    default:
      // 默认使用 GitHub
      logger.debug('未识别仓库类型，使用 GitHub Release Manager')
      return new GitHubReleaseManager(config)
  }
}

/**
 * 从配置中检测仓库类型
 */
function detectRepoTypeFromConfig(
  config?: ReleaseManagerConfig & { cwd?: string }
): RepositoryInfo['type'] {
  if (!config?.baseUrl) {
    return 'github' // 默认
  }
  
  const url = config.baseUrl.toLowerCase()
  
  if (url.includes('gitlab')) {
    return 'gitlab'
  }
  
  if (url.includes('gitee')) {
    return 'gitee'
  }
  
  if (url.includes('github')) {
    return 'github'
  }
  
  return 'other'
}

/**
 * 创建特定类型的 Release Manager
 */
export function createGitHubReleaseManager(config?: ReleaseManagerConfig): GitHubReleaseManager {
  return new GitHubReleaseManager(config)
}

export function createGitLabReleaseManager(config?: ReleaseManagerConfig): GitLabReleaseManager {
  return new GitLabReleaseManager(config)
}

export function createGiteeReleaseManager(config?: ReleaseManagerConfig): GiteeReleaseManager {
  return new GiteeReleaseManager(config)
}
