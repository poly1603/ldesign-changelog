/**
 * 插件系统
 */

import type { GitCommit, ChangelogCommit, ChangelogContent } from '../types/changelog.js'
import { logger } from '../utils/logger.js'

/**
 * 插件钩子
 */
export interface PluginHooks {
  /** 解析前钩子 */
  beforeParse?: (commits: GitCommit[]) => Promise<GitCommit[]> | GitCommit[]

  /** 解析后钩子 */
  afterParse?: (commits: ChangelogCommit[]) => Promise<ChangelogCommit[]> | ChangelogCommit[]

  /** 生成前钩子 */
  beforeGenerate?: (content: Partial<ChangelogContent>) => Promise<Partial<ChangelogContent>> | Partial<ChangelogContent>

  /** 生成后钩子 */
  afterGenerate?: (content: ChangelogContent) => Promise<ChangelogContent> | ChangelogContent

  /** 格式化前钩子 */
  beforeFormat?: (content: ChangelogContent) => Promise<ChangelogContent> | ChangelogContent

  /** 格式化后钩子 */
  afterFormat?: (formatted: string, content: ChangelogContent) => Promise<string> | string

  /** 写入前钩子 */
  beforeWrite?: (formatted: string, path: string) => Promise<string> | string

  /** 写入后钩子 */
  afterWrite?: (path: string) => Promise<void> | void
}

/**
 * 插件接口
 */
export interface Plugin {
  /** 插件名称 */
  name: string

  /** 插件版本 */
  version?: string

  /** 插件描述 */
  description?: string

  /** 钩子实现 */
  hooks: PluginHooks

  /** 初始化插件 */
  init?: () => Promise<void> | void

  /** 销毁插件 */
  destroy?: () => Promise<void> | void
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /** 配置 */
  config: any

  /** 日志记录器 */
  logger: typeof logger

  /** 自定义数据 */
  data: Map<string, any>
}

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Plugin[] = []
  private context: PluginContext

  constructor(config: any = {}) {
    this.context = {
      config,
      logger,
      data: new Map(),
    }
  }

  /**
   * 注册插件
   */
  register(plugin: Plugin): void {
    if (this.plugins.some(p => p.name === plugin.name)) {
      logger.warn(`插件 ${plugin.name} 已注册，跳过`)
      return
    }

    this.plugins.push(plugin)
    logger.debug(`已注册插件: ${plugin.name}`)

    // 初始化插件
    if (plugin.init) {
      Promise.resolve(plugin.init()).catch(error => {
        logger.error(`插件 ${plugin.name} 初始化失败`, error)
      })
    }
  }

  /**
   * 取消注册插件
   */
  unregister(name: string): void {
    const index = this.plugins.findIndex(p => p.name === name)
    
    if (index === -1) {
      logger.warn(`插件 ${name} 未找到`)
      return
    }

    const plugin = this.plugins[index]
    
    // 销毁插件
    if (plugin.destroy) {
      Promise.resolve(plugin.destroy()).catch(error => {
        logger.error(`插件 ${name} 销毁失败`, error)
      })
    }

    this.plugins.splice(index, 1)
    logger.debug(`已取消注册插件: ${name}`)
  }

  /**
   * 执行钩子
   */
  async executeHook<K extends keyof PluginHooks>(
    hookName: K,
    ...args: Parameters<NonNullable<PluginHooks[K]>>
  ): Promise<any> {
    let result = args[0]

    for (const plugin of this.plugins) {
      const hook = plugin.hooks[hookName]
      
      if (hook) {
        try {
          // @ts-ignore
          result = await Promise.resolve(hook(result, ...args.slice(1)))
        } catch (error) {
          logger.error(`插件 ${plugin.name} 的钩子 ${hookName} 执行失败`, error as Error)
        }
      }
    }

    return result
  }

  /**
   * 获取所有插件
   */
  getPlugins(): Plugin[] {
    return [...this.plugins]
  }

  /**
   * 获取插件
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.find(p => p.name === name)
  }

  /**
   * 清空所有插件
   */
  async clear(): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.destroy) {
        try {
          await plugin.destroy()
        } catch (error) {
          logger.error(`插件 ${plugin.name} 销毁失败`, error as Error)
        }
      }
    }

    this.plugins = []
  }

  /**
   * 获取上下文
   */
  getContext(): PluginContext {
    return this.context
  }
}

/**
 * 创建插件管理器
 */
export function createPluginManager(config?: any): PluginManager {
  return new PluginManager(config)
}

/**
 * 创建简单插件
 */
export function createPlugin(
  name: string,
  hooks: PluginHooks,
  options?: {
    version?: string
    description?: string
    init?: () => Promise<void> | void
    destroy?: () => Promise<void> | void
  }
): Plugin {
  return {
    name,
    version: options?.version,
    description: options?.description,
    hooks,
    init: options?.init,
    destroy: options?.destroy,
  }
}
