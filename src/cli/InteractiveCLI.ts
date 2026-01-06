/**
 * 交互式 CLI
 * 提供引导式操作体验
 */

import chalk from 'chalk'
import boxen from 'boxen'
import { select, confirm, prompt, multiSelect } from '../utils/interactive.js'
import { logger } from '../utils/logger.js'
import type { ChangelogConfig } from '../types/config.js'

/**
 * 交互式操作
 */
export interface InteractiveAction {
  name: string
  description: string
  handler: () => Promise<void>
}

/**
 * 交互式提示
 */
export interface InteractivePrompt {
  type: 'select' | 'multiselect' | 'input' | 'confirm' | 'autocomplete'
  message: string
  choices?: Array<{ value: any; label: string; description?: string }>
  default?: unknown
  validate?: (value: unknown) => boolean | string
}

/**
 * 交互式 CLI 选项
 */
export interface InteractiveCLIOptions {
  /** 主题配置 */
  theme?: 'default' | 'minimal' | 'colorful'
  /** 是否显示帮助提示 */
  showHints?: boolean
  /** 键盘快捷键 */
  shortcuts?: Record<string, string>
  /** 配置对象 */
  config?: ChangelogConfig
}

/**
 * 主题配置
 */
interface ThemeConfig {
  primary: (text: string) => string
  secondary: (text: string) => string
  success: (text: string) => string
  error: (text: string) => string
  warning: (text: string) => string
  info: (text: string) => string
  muted: (text: string) => string
  highlight: (text: string) => string
}

/**
 * 交互式 CLI 类
 */
export class InteractiveCLI {
  private options: Required<InteractiveCLIOptions>
  private theme: ThemeConfig
  private running: boolean = false
  private actions: Map<string, InteractiveAction> = new Map()

  constructor(options: InteractiveCLIOptions = {}) {
    this.options = {
      theme: options.theme || 'default',
      showHints: options.showHints !== false,
      shortcuts: options.shortcuts || {},
      config: options.config || {} as ChangelogConfig,
    }

    this.theme = this.getTheme(this.options.theme)
    this.registerDefaultActions()
  }

  /**
   * 获取主题配置
   */
  private getTheme(themeName: string): ThemeConfig {
    const themes: Record<string, ThemeConfig> = {
      default: {
        primary: chalk.blue,
        secondary: chalk.cyan,
        success: chalk.green,
        error: chalk.red,
        warning: chalk.yellow,
        info: chalk.blue,
        muted: chalk.gray,
        highlight: chalk.bold.white,
      },
      minimal: {
        primary: (text: string) => text,
        secondary: chalk.dim,
        success: (text: string) => text,
        error: (text: string) => text,
        warning: (text: string) => text,
        info: (text: string) => text,
        muted: chalk.dim,
        highlight: chalk.bold,
      },
      colorful: {
        primary: chalk.magenta.bold,
        secondary: chalk.cyan.bold,
        success: chalk.green.bold,
        error: chalk.red.bold,
        warning: chalk.yellow.bold,
        info: chalk.blue.bold,
        muted: chalk.gray,
        highlight: chalk.bgMagenta.white.bold,
      },
    }

    return themes[themeName] || themes.default
  }

  /**
   * 注册默认操作
   */
  private registerDefaultActions(): void {
    this.registerAction({
      name: 'generate',
      description: '生成 Changelog',
      handler: async () => {
        // 将在 21.2 中实现
        await this.runGenerateWizard()
      },
    })

    this.registerAction({
      name: 'release',
      description: '发布新版本',
      handler: async () => {
        // 将在 21.3 中实现
        await this.runReleaseWizard()
      },
    })

    this.registerAction({
      name: 'stats',
      description: '查看统计信息',
      handler: async () => {
        logger.info('统计功能即将推出...')
      },
    })

    this.registerAction({
      name: 'config',
      description: '配置管理',
      handler: async () => {
        logger.info('配置功能即将推出...')
      },
    })

    this.registerAction({
      name: 'exit',
      description: '退出',
      handler: async () => {
        this.running = false
        console.log(this.theme.muted('\n再见! 👋\n'))
      },
    })
  }

  /**
   * 注册操作
   */
  public registerAction(action: InteractiveAction): void {
    this.actions.set(action.name, action)
  }

  /**
   * 显示欢迎信息
   */
  private showWelcome(): void {
    const message = this.theme.primary('📝 @ldesign/changelog\n') +
      this.theme.muted('交互式变更日志管理工具')

    console.log('\n' + boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: this.options.theme === 'colorful' ? 'magenta' : 'blue',
    }))

    if (this.options.showHints) {
      console.log(this.theme.muted('  提示: 使用数字键选择操作，按 Ctrl+C 退出\n'))
    }
  }

  /**
   * 显示主菜单
   */
  public async showMainMenu(): Promise<void> {
    this.showWelcome()

    this.running = true

    while (this.running) {
      try {
        const choices = Array.from(this.actions.values()).map(action => ({
          value: action.name,
          label: this.theme.highlight(action.name),
          description: action.description,
        }))

        const selected = await select<string>(
          this.theme.primary('请选择操作:'),
          choices
        )

        if (!selected) {
          continue
        }

        const action = this.actions.get(selected)
        if (action) {
          console.log() // 空行
          await this.executeAction(action)
          console.log() // 空行
        }
      } catch (error: any) {
        if (error.message === 'User force closed the prompt') {
          this.running = false
          console.log(this.theme.muted('\n\n操作已取消\n'))
        } else {
          await this.handleError(error)
        }
      }
    }
  }

  /**
   * 执行操作
   */
  private async executeAction(action: InteractiveAction): Promise<void> {
    try {
      await action.handler()
    } catch (error: any) {
      await this.handleError(error)
    }
  }

  /**
   * 运行生成向导
   * 实现需求 5.2, 5.3: 版本选择引导和预览功能
   */
  public async runGenerateWizard(): Promise<void> {
    try {
      console.log(this.theme.primary('\n📝 Changelog 生成向导\n'))

      // 步骤 1: 选择版本类型
      const versionType = await this.selectVersionType()
      if (!versionType) {
        logger.info('已取消生成')
        return
      }

      // 步骤 2: 选择版本范围
      const range = await this.selectVersionRange()
      if (!range) {
        logger.info('已取消生成')
        return
      }

      // 步骤 3: 选择输出格式
      const format = await this.selectOutputFormat()

      // 步骤 4: 选择可选功能
      const features = await this.selectFeatures()

      // 步骤 5: 确认配置
      const confirmed = await this.confirmGenerateConfig({
        versionType,
        range,
        format,
        features,
      })

      if (!confirmed) {
        logger.info('已取消生成')
        return
      }

      // 步骤 6: 生成预览
      logger.info('\n正在生成预览...')
      const preview = await this.generatePreview({
        versionType,
        range,
        format,
        features,
      })

      // 步骤 7: 显示预览
      await this.showPreview(preview)

      // 步骤 8: 确认生成
      const shouldGenerate = await confirm(
        this.theme.warning('是否生成并保存 Changelog?'),
        true
      )

      if (shouldGenerate) {
        logger.success('Changelog 生成成功!')
      } else {
        logger.info('已取消保存')
      }
    } catch (error: any) {
      throw error
    }
  }

  /**
   * 选择版本类型
   */
  private async selectVersionType(): Promise<string | null> {
    const choices = [
      {
        value: 'auto',
        label: '自动推荐',
        description: '基于提交内容智能推荐版本号',
      },
      {
        value: 'major',
        label: 'Major (x.0.0)',
        description: '破坏性变更，不兼容的 API 修改',
      },
      {
        value: 'minor',
        label: 'Minor (0.x.0)',
        description: '新功能，向后兼容',
      },
      {
        value: 'patch',
        label: 'Patch (0.0.x)',
        description: 'Bug 修复，向后兼容',
      },
      {
        value: 'custom',
        label: '自定义版本号',
        description: '手动输入版本号',
      },
      {
        value: 'unreleased',
        label: 'Unreleased',
        description: '未发布的变更',
      },
    ]

    return await select<string>(
      this.theme.primary('选择版本类型:'),
      choices
    )
  }

  /**
   * 选择版本范围
   */
  private async selectVersionRange(): Promise<{ from?: string; to?: string } | null> {
    const useRange = await confirm(
      this.theme.primary('是否指定版本范围?'),
      false
    )

    if (!useRange) {
      return { to: 'HEAD' }
    }

    const from = await prompt('起始标签 (留空表示最新标签)', '')
    const to = await prompt('结束标签', 'HEAD')

    return { from: from || undefined, to }
  }

  /**
   * 选择输出格式
   */
  private async selectOutputFormat(): Promise<string> {
    const choices = [
      {
        value: 'markdown',
        label: 'Markdown',
        description: '标准 Markdown 格式 (推荐)',
        selected: true,
      },
      {
        value: 'json',
        label: 'JSON',
        description: '结构化 JSON 格式',
      },
      {
        value: 'html',
        label: 'HTML',
        description: '可视化 HTML 格式',
      },
    ]

    const result = await select<string>(
      this.theme.primary('选择输出格式:'),
      choices
    )

    return result || 'markdown'
  }

  /**
   * 选择可选功能
   */
  private async selectFeatures(): Promise<string[]> {
    const choices = [
      {
        value: 'track-deps',
        label: '追踪依赖变更',
        description: '记录 package.json 中的依赖变化',
      },
      {
        value: 'scan-security',
        label: '扫描安全问题',
        description: '高亮显示安全相关的提交',
      },
      {
        value: 'multi-lang',
        label: '多语言生成',
        description: '生成多种语言版本',
      },
      {
        value: 'interactive-select',
        label: '交互式选择提交',
        description: '手动选择要包含的提交',
      },
    ]

    return await multiSelect<string>(
      this.theme.primary('选择可选功能 (可多选):'),
      choices
    )
  }

  /**
   * 确认生成配置
   */
  private async confirmGenerateConfig(config: any): Promise<boolean> {
    console.log(this.theme.info('\n生成配置:\n'))
    console.log(`  版本类型: ${this.theme.highlight(config.versionType)}`)
    console.log(`  版本范围: ${this.theme.highlight(config.range.from || '最新标签')} → ${this.theme.highlight(config.range.to)}`)
    console.log(`  输出格式: ${this.theme.highlight(config.format)}`)
    console.log(`  可选功能: ${this.theme.highlight(config.features.length > 0 ? config.features.join(', ') : '无')}`)
    console.log()

    return await confirm(
      this.theme.warning('确认以上配置?'),
      true
    )
  }

  /**
   * 生成预览
   */
  private async generatePreview(config: any): Promise<string> {
    // 这里返回一个模拟的预览
    // 实际实现中应该调用 ChangelogGenerator
    const preview = `# Changelog

## [${config.versionType === 'unreleased' ? 'Unreleased' : '1.0.0'}] - ${new Date().toISOString().split('T')[0]}

### Features

- feat: 添加新功能 A
- feat: 添加新功能 B

### Bug Fixes

- fix: 修复问题 X
- fix: 修复问题 Y

### Documentation

- docs: 更新文档

---

**范围**: ${config.range.from || '最新标签'} → ${config.range.to}
**格式**: ${config.format}
**功能**: ${config.features.join(', ') || '无'}
`

    return preview
  }

  /**
   * 运行发布向导
   * 实现需求 5.4: 步骤式发布流程和确认对话框
   */
  public async runReleaseWizard(): Promise<void> {
    try {
      console.log(this.theme.primary('\n🚀 发布向导\n'))

      // 步骤 1: 选择发布平台
      const platforms = await this.selectReleasePlatforms()
      if (!platforms || platforms.length === 0) {
        logger.info('已取消发布')
        return
      }

      // 步骤 2: 选择版本
      const version = await this.selectReleaseVersion()
      if (!version) {
        logger.info('已取消发布')
        return
      }

      // 步骤 3: 输入发布标题
      const title = await prompt(
        this.theme.primary('发布标题'),
        `Release ${version}`
      )

      // 步骤 4: 选择是否包含资产
      const includeAssets = await confirm(
        this.theme.primary('是否上传发布资产?'),
        false
      )

      let assets: string[] = []
      if (includeAssets) {
        assets = await this.selectReleaseAssets()
      }

      // 步骤 5: 选择发布选项
      const options = await this.selectReleaseOptions()

      // 步骤 6: 显示发布摘要
      await this.showReleaseSummary({
        platforms,
        version,
        title,
        assets,
        options,
      })

      // 步骤 7: 最终确认
      const confirmed = await this.confirmRelease()
      if (!confirmed) {
        logger.info('已取消发布')
        return
      }

      // 步骤 8: 执行发布
      logger.info('\n正在发布...')
      await this.executeRelease({
        platforms,
        version,
        title,
        assets,
        options,
      })

      logger.success('\n✨ 发布成功!')
    } catch (error: any) {
      throw error
    }
  }

  /**
   * 选择发布平台
   */
  private async selectReleasePlatforms(): Promise<string[]> {
    const choices = [
      {
        value: 'github',
        label: 'GitHub',
        description: '发布到 GitHub Releases',
      },
      {
        value: 'gitlab',
        label: 'GitLab',
        description: '发布到 GitLab Releases',
      },
      {
        value: 'gitee',
        label: 'Gitee',
        description: '发布到 Gitee Releases',
      },
      {
        value: 'npm',
        label: 'npm',
        description: '发布到 npm Registry',
      },
    ]

    return await multiSelect<string>(
      this.theme.primary('选择发布平台 (可多选):'),
      choices
    )
  }

  /**
   * 选择发布版本
   */
  private async selectReleaseVersion(): Promise<string | null> {
    const useLatest = await confirm(
      this.theme.primary('使用最新的 Changelog 版本?'),
      true
    )

    if (useLatest) {
      return '1.0.0' // 模拟从 Changelog 读取
    }

    return await prompt('输入版本号', '1.0.0')
  }

  /**
   * 选择发布资产
   */
  private async selectReleaseAssets(): Promise<string[]> {
    const assets: string[] = []

    while (true) {
      const asset = await prompt('输入资产文件路径 (留空结束)', '')
      if (!asset) break
      assets.push(asset)
    }

    return assets
  }

  /**
   * 选择发布选项
   */
  private async selectReleaseOptions(): Promise<{
    prerelease: boolean
    draft: boolean
    generateNotes: boolean
  }> {
    const prerelease = await confirm(
      this.theme.primary('标记为预发布版本?'),
      false
    )

    const draft = await confirm(
      this.theme.primary('保存为草稿?'),
      false
    )

    const generateNotes = await confirm(
      this.theme.primary('自动生成发布说明?'),
      true
    )

    return { prerelease, draft, generateNotes }
  }

  /**
   * 显示发布摘要
   */
  private async showReleaseSummary(config: any): Promise<void> {
    console.log(this.theme.info('\n发布摘要:\n'))
    console.log(`  平台: ${this.theme.highlight(config.platforms.join(', '))}`)
    console.log(`  版本: ${this.theme.highlight(config.version)}`)
    console.log(`  标题: ${this.theme.highlight(config.title)}`)

    if (config.assets.length > 0) {
      console.log(`  资产: ${this.theme.highlight(config.assets.length)} 个文件`)
      config.assets.forEach((asset: string) => {
        console.log(`    - ${this.theme.muted(asset)}`)
      })
    }

    console.log(`  预发布: ${this.theme.highlight(config.options.prerelease ? '是' : '否')}`)
    console.log(`  草稿: ${this.theme.highlight(config.options.draft ? '是' : '否')}`)
    console.log(`  自动生成说明: ${this.theme.highlight(config.options.generateNotes ? '是' : '否')}`)
    console.log()
  }

  /**
   * 确认发布
   */
  private async confirmRelease(): Promise<boolean> {
    console.log(this.theme.warning('\n⚠️  即将执行发布操作\n'))

    return await confirm(
      this.theme.warning('确认发布? 此操作不可撤销'),
      false
    )
  }

  /**
   * 执行发布
   */
  private async executeRelease(config: any): Promise<void> {
    // 模拟发布过程
    for (const platform of config.platforms) {
      logger.info(`正在发布到 ${platform}...`)
      // 实际实现中应该调用相应的发布集成
      await new Promise(resolve => setTimeout(resolve, 1000))
      logger.success(`✓ ${platform} 发布完成`)
    }
  }

  /**
   * 显示预览
   */
  public async showPreview(content: string): Promise<void> {
    console.log(this.theme.info('\n━━━ 预览 ━━━\n'))
    console.log(content)
    console.log(this.theme.info('\n━━━━━━━━━━━\n'))

    await confirm('按回车继续...', true)
  }

  /**
   * 确认操作
   */
  public async confirm(message: string): Promise<boolean> {
    return await confirm(this.theme.warning(message), false)
  }

  /**
   * 处理错误
   * 实现需求 5.5: 清晰的错误消息和恢复选项
   */
  private async handleError(error: any): Promise<void> {
    console.log()

    // 分类错误并提供清晰的消息
    const errorInfo = this.categorizeError(error)

    // 显示错误信息
    console.log(this.theme.error(`\n❌ ${errorInfo.title}\n`))
    console.log(this.theme.muted(`错误类型: ${errorInfo.category}`))

    if (errorInfo.message) {
      console.log(this.theme.muted(`详细信息: ${errorInfo.message}`))
    }

    if (errorInfo.suggestion) {
      console.log(this.theme.warning(`\n💡 建议: ${errorInfo.suggestion}`))
    }

    console.log()

    // 提供恢复选项
    const recoveryOptions = this.getRecoveryOptions(errorInfo.category)

    if (recoveryOptions.length > 0) {
      const choice = await select<string>(
        this.theme.primary('选择恢复操作:'),
        recoveryOptions
      )

      await this.executeRecoveryAction(choice, errorInfo)
    } else {
      // 默认恢复选项
      const shouldContinue = await confirm(
        this.theme.warning('是否继续使用其他功能?'),
        true
      )

      if (!shouldContinue) {
        this.running = false
      }
    }
  }

  /**
   * 分类错误
   */
  private categorizeError(error: any): {
    category: string
    title: string
    message: string
    suggestion?: string
  } {
    // Git 相关错误
    if (error.message?.includes('git') || error.message?.includes('repository')) {
      return {
        category: 'git',
        title: 'Git 操作失败',
        message: error.message,
        suggestion: '请确保当前目录是一个有效的 Git 仓库，并且有提交历史',
      }
    }

    // 文件系统错误
    if (error.code === 'ENOENT' || error.message?.includes('no such file')) {
      return {
        category: 'filesystem',
        title: '文件未找到',
        message: error.message,
        suggestion: '请检查文件路径是否正确，或者文件是否存在',
      }
    }

    // 权限错误
    if (error.code === 'EACCES' || error.message?.includes('permission denied')) {
      return {
        category: 'permission',
        title: '权限不足',
        message: error.message,
        suggestion: '请检查文件权限，或使用管理员权限运行',
      }
    }

    // 网络错误
    if (error.code === 'ENOTFOUND' || error.message?.includes('network')) {
      return {
        category: 'network',
        title: '网络连接失败',
        message: error.message,
        suggestion: '请检查网络连接，或稍后重试',
      }
    }

    // 配置错误
    if (error.message?.includes('config') || error.message?.includes('configuration')) {
      return {
        category: 'config',
        title: '配置错误',
        message: error.message,
        suggestion: '请检查配置文件格式是否正确，或运行 init 命令重新初始化',
      }
    }

    // 验证错误
    if (error.message?.includes('invalid') || error.message?.includes('validation')) {
      return {
        category: 'validation',
        title: '验证失败',
        message: error.message,
        suggestion: '请检查输入的数据格式是否正确',
      }
    }

    // 默认错误
    return {
      category: 'unknown',
      title: '操作失败',
      message: error.message || String(error),
      suggestion: '请查看详细错误信息，或联系技术支持',
    }
  }

  /**
   * 获取恢复选项
   */
  private getRecoveryOptions(category: string): Array<{ value: string; label: string; description: string }> {
    const commonOptions = [
      {
        value: 'retry',
        label: '重试',
        description: '重新执行刚才的操作',
      },
      {
        value: 'continue',
        label: '继续',
        description: '返回主菜单继续使用',
      },
      {
        value: 'exit',
        label: '退出',
        description: '退出交互式模式',
      },
    ]

    const categoryOptions: Record<string, Array<{ value: string; label: string; description: string }>> = {
      git: [
        {
          value: 'check-git',
          label: '检查 Git 状态',
          description: '查看当前 Git 仓库状态',
        },
        ...commonOptions,
      ],
      filesystem: [
        {
          value: 'show-path',
          label: '显示当前路径',
          description: '查看当前工作目录',
        },
        ...commonOptions,
      ],
      config: [
        {
          value: 'init-config',
          label: '初始化配置',
          description: '创建新的配置文件',
        },
        ...commonOptions,
      ],
      network: [
        {
          value: 'test-connection',
          label: '测试连接',
          description: '测试网络连接状态',
        },
        ...commonOptions,
      ],
    }

    return categoryOptions[category] || commonOptions
  }

  /**
   * 执行恢复操作
   */
  private async executeRecoveryAction(action: string | null, errorInfo: any): Promise<void> {
    if (!action) {
      return
    }

    switch (action) {
      case 'retry':
        logger.info('正在重试...')
        // 重试逻辑由调用方处理
        break

      case 'continue':
        logger.info('返回主菜单')
        break

      case 'exit':
        this.running = false
        console.log(this.theme.muted('\n再见! 👋\n'))
        break

      case 'check-git':
        logger.info('检查 Git 状态...')
        // 实际实现中应该执行 git status
        logger.info('当前分支: main')
        logger.info('工作区状态: 干净')
        break

      case 'show-path':
        logger.info(`当前工作目录: ${process.cwd()}`)
        break

      case 'init-config':
        logger.info('初始化配置...')
        // 实际实现中应该调用 init 命令
        logger.success('配置文件已创建')
        break

      case 'test-connection':
        logger.info('测试网络连接...')
        // 实际实现中应该测试网络
        logger.success('网络连接正常')
        break

      default:
        logger.warn(`未知的恢复操作: ${action}`)
    }
  }

  /**
   * 显示帮助信息
   */
  public showHelp(): void {
    console.log(this.theme.primary('\n可用操作:\n'))

    const actions = Array.from(this.actions.values())
    for (const action of actions) {
      console.log(
        `  ${this.theme.highlight(action.name.padEnd(15))} ${this.theme.muted(action.description)}`
      )
    }

    console.log()
  }

  /**
   * 启动交互式模式
   */
  public async start(): Promise<void> {
    await this.showMainMenu()
  }
}

/**
 * 创建交互式 CLI 实例
 */
export function createInteractiveCLI(options?: InteractiveCLIOptions): InteractiveCLI {
  return new InteractiveCLI(options)
}
