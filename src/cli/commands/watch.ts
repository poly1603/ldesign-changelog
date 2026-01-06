/**
 * Watch 命令
 */

import { Command } from 'commander'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { createWatchManager } from '../../core/WatchManager.js'
import { logger } from '../../utils/logger.js'
import { loadConfig } from '../config-loader.js'

/**
 * 创建 watch 命令
 */
export function createWatchCommand(): Command {
  const command = new Command('watch')

  command
    .description('监视模式 - 自动检测新提交并生成 Changelog')
    .option('--interval <ms>', '检查间隔（毫秒）', '60000')
    .option('--immediate', '立即执行一次生成', false)
    .option('--state-file <file>', '状态文件路径', '.changelog-watch-state.json')
    .option('--cron <expression>', 'Cron 表达式（例如: "*/5 * * * *"）')
    .option('--config <file>', '配置文件路径')
    .option('--track-deps', '追踪依赖变更')
    .option('--scan-security', '扫描安全问题')
    .action(async (options) => {
      try {
        logger.info('启动 Changelog 监视模式...')

        // 加载配置
        const config = await loadConfig(options.config)

        // 创建生成器
        const generator = createChangelogGenerator(config)

        // 启用依赖追踪（如果指定）
        if (options.trackDeps) {
          generator.enableDependencyTracking(true)
          logger.debug('已启用依赖追踪')
        }

        // 启用安全扫描（如果指定）
        if (options.scanSecurity) {
          generator.enableSecurityScanning(true)
          logger.debug('已启用安全扫描')
        }

        // 解析间隔
        const interval = parseInt(options.interval, 10)
        if (isNaN(interval) || interval < 1000) {
          logger.error('间隔必须是大于等于 1000 的数字（毫秒）')
          process.exit(1)
        }

        // 确定触发器
        const triggers: ('commit' | 'tag' | 'schedule')[] = ['commit']
        if (options.cron) {
          triggers.push('schedule')
        }

        // 创建监视管理器
        const watchManager = createWatchManager(generator, {
          interval,
          immediate: options.immediate,
          stateFile: options.stateFile,
          triggers,
          cron: options.cron,
          cwd: config.cwd,
        })

        // 注册回调
        watchManager.onGenerate((content) => {
          logger.success(`✓ Changelog 已更新 (版本: ${content.version})`)
          logger.info(`  - 提交数: ${content.commits.length}`)
          logger.info(`  - 章节数: ${content.sections.length}`)
        })

        // 启动监视
        await watchManager.start()

        // 处理退出信号
        const cleanup = () => {
          logger.info('\n正在停止监视模式...')
          watchManager.stop()
          process.exit(0)
        }

        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)

        // 保持进程运行
        logger.info('监视模式已启动，按 Ctrl+C 停止')
        logger.info(`检查间隔: ${interval}ms`)
        if (options.cron) {
          logger.info(`Cron 表达式: ${options.cron}`)
        }
        logger.info(`状态文件: ${options.stateFile}`)

        // 显示当前状态
        const state = watchManager.getState()
        if (state) {
          logger.info(`最后处理的提交: ${state.lastCommit.substring(0, 7)}`)
          logger.info(`最后运行时间: ${state.lastRun.toLocaleString()}`)
          logger.info(`运行次数: ${state.runCount}`)
        } else {
          logger.info('首次运行，尚无状态记录')
        }
      } catch (error: any) {
        logger.error('启动监视模式失败', error)
        process.exit(1)
      }
    })

  return command
}
