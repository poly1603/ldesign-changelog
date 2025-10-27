/**
 * 配置加载器
 */

import { join } from 'path'
import { pathToFileURL } from 'url'
import { fileExists } from '../utils/file.js'
import { logger } from '../utils/logger.js'
import type { ChangelogConfig } from '../types/config.js'
import { DEFAULT_CONFIG } from '../types/config.js'

/**
 * 配置文件名列表
 */
const CONFIG_FILES = [
  'changelog.config.js',
  'changelog.config.cjs',
  'changelog.config.mjs',
  '.changelogrc.js',
  '.changelogrc.cjs',
]

/**
 * 加载配置文件
 */
export async function loadConfig(configPath?: string): Promise<ChangelogConfig> {
  const cwd = process.cwd()

  // 如果指定了配置文件路径
  if (configPath) {
    const fullPath = join(cwd, configPath)
    if (!fileExists(fullPath)) {
      throw new Error(`配置文件不存在: ${configPath}`)
    }
    return await loadConfigFile(fullPath)
  }

  // 自动查找配置文件
  for (const filename of CONFIG_FILES) {
    const fullPath = join(cwd, filename)
    if (fileExists(fullPath)) {
      logger.debug(`找到配置文件: ${filename}`)
      return await loadConfigFile(fullPath)
    }
  }

  // 未找到配置文件，使用默认配置
  logger.debug('未找到配置文件，使用默认配置')
  return DEFAULT_CONFIG
}

/**
 * 加载配置文件
 */
async function loadConfigFile(filePath: string): Promise<ChangelogConfig> {
  try {
    // 转换为 file:// URL (ESM 需要)
    const fileUrl = pathToFileURL(filePath).href

    // 动态导入
    const module = await import(fileUrl)
    const config = module.default || module

    // 合并默认配置
    return {
      ...DEFAULT_CONFIG,
      ...config,
    }
  } catch (error) {
    logger.error(`加载配置文件失败: ${filePath}`, error as Error)
    return DEFAULT_CONFIG
  }
}

