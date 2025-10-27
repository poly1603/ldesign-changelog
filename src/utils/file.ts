/**
 * 文件操作工具
 */

import { readFile, writeFile, access, mkdir, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname, join, resolve, isAbsolute } from 'path'

/**
 * 读取文件内容
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8')
  } catch (error) {
    throw new Error(`无法读取文件 ${filePath}: ${(error as Error).message}`)
  }
}

/**
 * 写入文件内容
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
  try {
    await ensureDir(dirname(filePath))
    await writeFile(filePath, content, 'utf-8')
  } catch (error) {
    throw new Error(`无法写入文件 ${filePath}: ${(error as Error).message}`)
  }
}

/**
 * 检查文件是否存在
 */
export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}

/**
 * 检查文件是否可访问
 */
export async function isAccessible(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true })
    }
  } catch (error) {
    throw new Error(`无法创建目录 ${dirPath}: ${(error as Error).message}`)
  }
}

/**
 * 备份文件
 */
export async function backupFile(filePath: string): Promise<string> {
  if (!fileExists(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }

  const backupPath = `${filePath}.backup`
  await copyFile(filePath, backupPath)
  return backupPath
}

/**
 * 恢复文件
 */
export async function restoreFile(backupPath: string, targetPath: string): Promise<void> {
  if (!fileExists(backupPath)) {
    throw new Error(`备份文件不存在: ${backupPath}`)
  }

  await copyFile(backupPath, targetPath)
}

/**
 * 解析路径
 */
export function resolvePath(path: string, cwd = process.cwd()): string {
  return isAbsolute(path) ? path : resolve(cwd, path)
}

/**
 * 规范化路径
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

/**
 * 获取文件名（不含扩展名）
 */
export function getFilenameWithoutExt(filePath: string): string {
  const parts = filePath.split('/')
  const filename = parts[parts.length - 1]
  const dotIndex = filename.lastIndexOf('.')
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filePath: string): string {
  const dotIndex = filePath.lastIndexOf('.')
  return dotIndex > 0 ? filePath.substring(dotIndex + 1) : ''
}

/**
 * 连接路径
 */
export function joinPath(...paths: string[]): string {
  return normalizePath(join(...paths))
}

