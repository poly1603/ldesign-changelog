/**
 * Git 工具函数
 */

import { execa } from 'execa'
import type { GitCommit, RepositoryInfo } from '../types/index.js'

/**
 * Git 工具配置
 */
export interface GitUtilsConfig {
  /** 工作目录 */
  cwd?: string
}

/**
 * 执行 Git 命令
 */
async function execGit(args: string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await execa('git', args, { cwd: cwd || process.cwd() })
    return stdout.trim()
  } catch (error) {
    throw new Error(`Git 命令执行失败: ${(error as Error).message}`)
  }
}

/**
 * 获取 Git 提交历史
 */
export async function getGitCommits(from?: string, to = 'HEAD', cwd?: string): Promise<GitCommit[]> {
  const range = from ? `${from}..${to}` : to
  const format = '%H%n%h%n%s%n%b%n%an%n%ae%n%ai%n%at%n%D%n---END---'

  const output = await execGit(['log', range, `--format=${format}`], cwd)

  if (!output) return []

  const commits: GitCommit[] = []
  const commitBlocks = output.split('---END---\n').filter(Boolean)

  for (const block of commitBlocks) {
    const lines = block.split('\n')
    if (lines.length < 8) continue

    const [hash, shortHash, subject, ...rest] = lines

    // 找到邮箱和日期的位置
    let bodyEndIndex = rest.length - 4
    for (let i = 0; i < rest.length - 3; i++) {
      if (rest[i + 2].match(/^\d{4}-\d{2}-\d{2}/)) {
        bodyEndIndex = i
        break
      }
    }

    const body = rest.slice(0, bodyEndIndex).join('\n').trim()
    const authorName = rest[bodyEndIndex]
    const authorEmail = rest[bodyEndIndex + 1]
    const date = rest[bodyEndIndex + 2]
    const timestamp = parseInt(rest[bodyEndIndex + 3], 10)
    const refs = rest[bodyEndIndex + 4]

    const tags = refs ? refs.split(', ')
      .filter(ref => ref.startsWith('tag: '))
      .map(ref => ref.replace('tag: ', ''))
      : []

    commits.push({
      hash,
      shortHash,
      subject,
      body: body || undefined,
      authorName,
      authorEmail,
      date,
      timestamp,
      tags: tags.length > 0 ? tags : undefined,
    })
  }

  return commits
}

/**
 * 获取 Git 标签列表
 */
export async function getGitTags(cwd?: string): Promise<string[]> {
  const output = await execGit(['tag', '--sort=-version:refname'], cwd)
  return output ? output.split('\n').filter(Boolean) : []
}

/**
 * 获取最新标签
 */
export async function getLatestTag(cwd?: string): Promise<string | null> {
  try {
    const tags = await getGitTags(cwd)
    return tags.length > 0 ? tags[0] : null
  } catch {
    return null
  }
}

/**
 * 获取远程仓库 URL
 */
export async function getRemoteUrl(remote = 'origin', cwd?: string): Promise<string> {
  return await execGit(['remote', 'get-url', remote], cwd)
}

/**
 * 解析仓库 URL
 */
export function parseRepositoryUrl(remoteUrl: string): string {
  let url = remoteUrl.replace(/\.git$/, '')

  // 转换 SSH URL 为 HTTPS
  url = url.replace(/^git@([^:]+):(.+)$/, 'https://$1/$2')

  // 移除 git:// 协议
  url = url.replace(/^git:\/\//, 'https://')

  return url
}

/**
 * 检测仓库类型
 */
export function detectRepositoryType(url: string): 'github' | 'gitlab' | 'gitee' | 'bitbucket' | 'other' {
  if (url.includes('github.com')) {
    return 'github'
  } else if (url.includes('gitlab.com') || url.includes('gitlab.')) {
    return 'gitlab'
  } else if (url.includes('gitee.com')) {
    return 'gitee'
  } else if (url.includes('bitbucket.org')) {
    return 'bitbucket'
  }
  return 'other'
}

/**
 * 获取仓库信息
 */
export async function getRepositoryInfo(cwd?: string): Promise<RepositoryInfo> {
  const remoteUrl = await getRemoteUrl('origin', cwd)
  const url = parseRepositoryUrl(remoteUrl)
  const type = detectRepositoryType(url)

  // 提取所有者和仓库名
  const match = url.match(/https?:\/\/[^/]+\/([^/]+)\/([^/]+)/)
  const owner = match ? match[1] : undefined
  const name = match ? match[2] : undefined

  return {
    url,
    type,
    owner,
    name,
  }
}

/**
 * 生成 PR 链接
 */
export function generatePRLink(pr: string, repoInfo: RepositoryInfo): string {
  const { url, type } = repoInfo

  switch (type) {
    case 'github':
    case 'gitee':
      return `${url}/pull/${pr}`
    case 'gitlab':
      return `${url}/merge_requests/${pr}`
    case 'bitbucket':
      return `${url}/pull-requests/${pr}`
    default:
      return `#${pr}`
  }
}

/**
 * 生成 Issue 链接
 */
export function generateIssueLink(issue: string, repoInfo: RepositoryInfo): string {
  const { url, type } = repoInfo

  switch (type) {
    case 'github':
    case 'gitlab':
    case 'gitee':
    case 'bitbucket':
      return `${url}/issues/${issue}`
    default:
      return `#${issue}`
  }
}

/**
 * 生成 Commit 链接
 */
export function generateCommitLink(hash: string, repoInfo: RepositoryInfo): string {
  const { url } = repoInfo
  return `${url}/commit/${hash}`
}

/**
 * 生成比较链接
 */
export function generateCompareLink(from: string, to: string, repoInfo: RepositoryInfo): string {
  const { url, type } = repoInfo

  switch (type) {
    case 'github':
    case 'gitee':
      return `${url}/compare/${from}...${to}`
    case 'gitlab':
      return `${url}/-/compare/${from}...${to}`
    case 'bitbucket':
      return `${url}/branches/compare/${to}..${from}`
    default:
      return url
  }
}

/**
 * 创建 Git 标签
 */
export async function createGitTag(tag: string, message?: string, cwd?: string): Promise<void> {
  const args = ['tag']
  if (message) {
    args.push('-a', tag, '-m', message)
  } else {
    args.push(tag)
  }
  await execGit(args, cwd)
}

/**
 * 推送标签到远程
 */
export async function pushGitTag(tag: string, remote = 'origin', cwd?: string): Promise<void> {
  await execGit(['push', remote, tag], cwd)
}

/**
 * 检查是否为 Git 仓库
 */
export async function isGitRepository(cwd?: string): Promise<boolean> {
  try {
    await execGit(['rev-parse', '--git-dir'], cwd)
    return true
  } catch {
    return false
  }
}

/**
 * 获取当前分支名
 */
export async function getCurrentBranch(cwd?: string): Promise<string> {
  return await execGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
}

/**
 * 检查工作区是否干净
 */
export async function isWorkingTreeClean(cwd?: string): Promise<boolean> {
  const output = await execGit(['status', '--porcelain'], cwd)
  return output.length === 0
}

