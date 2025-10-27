/**
 * Release 命令
 */

import { Command } from 'commander'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import {
  incrementVersion,
  isValidVersion,
  cleanVersion,
  type VersionType,
} from '../../utils/version.js'
import {
  createGitTag,
  pushGitTag,
  isWorkingTreeClean,
  getLatestTag,
} from '../../utils/git-utils.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'

/**
 * 创建 release 命令
 */
export function createReleaseCommand(): Command {
  const command = new Command('release')

  command
    .description('发布新版本（更新版本号、生成 Changelog、创建 Git tag）')
    .option('--type <type>', '版本类型 (major|minor|patch|premajor|preminor|prepatch|prerelease)', 'patch')
    .option('--version <version>', '指定版本号（覆盖自动递增）')
    .option('--preid <identifier>', '预发布标识符 (alpha|beta|rc)')
    .option('--tag', '创建 Git tag', false)
    .option('--push', '推送 tag 到远程', false)
    .option('--remote <remote>', '远程仓库名', 'origin')
    .option('--config <file>', '配置文件路径')
    .option('--skip-changelog', '跳过 Changelog 生成')
    .option('--force', '强制执行（跳过工作区检查）')
    .action(async (options) => {
      try {
        const spinner = logger.startSpinner('准备发布...')

        // 检查工作区是否干净
        if (!options.force) {
          const isClean = await isWorkingTreeClean()
          if (!isClean) {
            logger.stopSpinner(false)
            logger.error('工作区有未提交的更改，请先提交或使用 --force 强制执行')
            process.exit(1)
          }
        }

        // 获取当前版本
        const cwd = process.cwd()
        const packageJsonPath = join(cwd, 'package.json')
        let currentVersion: string

        try {
          const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
          currentVersion = packageJson.version
        } catch {
          // 如果没有 package.json，尝试从 git tag 获取
          const latestTag = await getLatestTag()
          if (latestTag) {
            currentVersion = cleanVersion(latestTag)
          } else {
            logger.stopSpinner(false)
            logger.error('无法确定当前版本号')
            process.exit(1)
          }
        }

        logger.updateSpinner(`当前版本: ${currentVersion}`)

        // 计算新版本号
        let newVersion: string

        if (options.version) {
          newVersion = cleanVersion(options.version)
          if (!isValidVersion(newVersion)) {
            logger.stopSpinner(false)
            logger.error(`无效的版本号: ${newVersion}`)
            process.exit(1)
          }
        } else {
          const versionType = options.type as VersionType
          newVersion = incrementVersion(currentVersion, versionType, options.preid)
        }

        logger.updateSpinner(`新版本: ${newVersion}`)

        // 生成 Changelog
        if (!options.skipChangelog) {
          logger.updateSpinner('正在生成 Changelog...')

          const config = await loadConfig(options.config)
          const generator = createChangelogGenerator(config)

          const lastTag = await getLatestTag()
          await generator.generateAndWrite(newVersion, lastTag || undefined, 'HEAD')

          logger.updateSpinner('Changelog 已生成')
        }

        // 创建 Git tag
        if (options.tag) {
          logger.updateSpinner('正在创建 Git tag...')

          const tagName = `v${newVersion}`
          const tagMessage = `Release ${tagName}`
          await createGitTag(tagName, tagMessage)

          logger.updateSpinner(`Git tag 已创建: ${tagName}`)

          // 推送 tag
          if (options.push) {
            logger.updateSpinner('正在推送 tag 到远程...')
            await pushGitTag(tagName, options.remote)
            logger.updateSpinner(`Tag 已推送到 ${options.remote}`)
          }
        }

        logger.stopSpinner(true, `版本 ${newVersion} 发布成功！`)

        // 输出后续步骤提示
        logger.info('\n后续步骤:')
        if (!options.skipChangelog) {
          logger.info('1. 检查生成的 Changelog')
        }
        logger.info('2. 提交更改: git add . && git commit -m "chore: release v' + newVersion + '"')
        if (!options.tag) {
          logger.info('3. 创建 tag: git tag v' + newVersion)
        }
        if (!options.push) {
          logger.info('4. 推送到远程: git push && git push --tags')
        }
      } catch (error: any) {
        logger.stopSpinner(false)
        logger.error('发布失败', error)
        process.exit(1)
      }
    })

  return command
}

