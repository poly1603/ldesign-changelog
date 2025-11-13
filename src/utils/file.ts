/**
 * 文件操作工具
 */

import { readFile, writeFile, mkdir, copyFile } from 'fs/promises'
import { existsSync } from 'fs'
import { dirname } from 'path'

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


