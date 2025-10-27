/**
 * 版本管理工具
 */

import semver from 'semver'

/**
 * 版本类型
 */
export type VersionType = 'major' | 'minor' | 'patch' | 'premajor' | 'preminor' | 'prepatch' | 'prerelease'

/**
 * 解析版本号
 */
export function parseVersion(version: string): semver.SemVer | null {
  return semver.parse(version)
}

/**
 * 验证版本号
 */
export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null
}

/**
 * 比较版本号
 * 
 * @returns 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  return semver.compare(v1, v2)
}

/**
 * 递增版本号
 */
export function incrementVersion(version: string, type: VersionType, identifier?: string): string {
  const newVersion = semver.inc(version, type, identifier)
  if (!newVersion) {
    throw new Error(`无法递增版本号: ${version}`)
  }
  return newVersion
}

/**
 * 获取版本号的主版本
 */
export function getMajorVersion(version: string): number {
  const parsed = parseVersion(version)
  return parsed ? parsed.major : 0
}

/**
 * 获取版本号的次版本
 */
export function getMinorVersion(version: string): number {
  const parsed = parseVersion(version)
  return parsed ? parsed.minor : 0
}

/**
 * 获取版本号的补丁版本
 */
export function getPatchVersion(version: string): number {
  const parsed = parseVersion(version)
  return parsed ? parsed.patch : 0
}

/**
 * 格式化版本号
 */
export function formatVersion(version: string, format?: string): string {
  const parsed = parseVersion(version)
  if (!parsed) return version

  if (!format) return version

  return format
    .replace('{version}', version)
    .replace('{major}', String(parsed.major))
    .replace('{minor}', String(parsed.minor))
    .replace('{patch}', String(parsed.patch))
}

/**
 * 清理版本号（移除 v 前缀）
 */
export function cleanVersion(version: string): string {
  return semver.clean(version) || version
}

/**
 * 获取版本范围内的版本列表
 */
export function getVersionsInRange(versions: string[], range: string): string[] {
  return versions.filter(v => semver.satisfies(v, range))
}

/**
 * 获取最新版本
 */
export function getLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null

  const sorted = versions
    .map(v => cleanVersion(v))
    .filter(v => isValidVersion(v))
    .sort(compareVersions)

  return sorted[sorted.length - 1] || null
}

/**
 * 判断是否为预发布版本
 */
export function isPrerelease(version: string): boolean {
  const parsed = parseVersion(version)
  return parsed ? parsed.prerelease.length > 0 : false
}

/**
 * 从版本号中提取预发布标识
 */
export function getPrereleaseIdentifier(version: string): string | null {
  const parsed = parseVersion(version)
  if (!parsed || parsed.prerelease.length === 0) return null
  return parsed.prerelease[0] as string
}

