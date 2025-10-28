/**
 * Changelog 配置类型定义
 */

/**
 * Changelog 主配置
 */
export interface ChangelogConfig {
  /** 工作目录 */
  cwd?: string

  /** 输出文件路径 */
  output?: string

  /** 输出格式 */
  format?: 'markdown' | 'json' | 'html'

  /** 自定义模板路径 */
  template?: string

  /** 提交类型配置 */
  types?: CommitTypeConfig[]

  /** 是否按类型分组 */
  groupByType?: boolean

  /** 是否包含作者 */
  includeAuthors?: boolean

  /** 是否包含 PR 链接 */
  includePRLinks?: boolean

  /** 是否包含 commit hash */
  includeCommitHash?: boolean

  /** 是否包含所有提交 */
  includeAllCommits?: boolean

  /** 日期格式 */
  dateFormat?: string

  /** 语言 */
  language?: 'zh-CN' | 'en-US' | 'ja-JP'

  /** 标题格式 */
  headerFormat?: string

  /** 是否重新生成完整 changelog */
  regenerate?: boolean

  /** 更新模式：prepend（新版本添加到顶部）、append（添加到底部）、overwrite（覆盖） */
  updateMode?: 'prepend' | 'append' | 'overwrite'

  /** 是否保留历史版本 */
  keepHistory?: boolean

  /** 仓库 URL */
  repositoryUrl?: string

  /** 版本号格式 */
  versionFormat?: string

  /** 格式选项 */
  formatOptions?: FormatOptions

  /** scope 过滤（只包含指定 scope 的提交） */
  scopeFilter?: string[]

  /** 按作者分组 */
  groupByAuthor?: boolean

  /** 是否单独显示依赖更新 */
  separateDependencies?: boolean

  /** 是否标记安全修复 */
  highlightSecurity?: boolean

  /** Monorepo 配置 */
  monorepo?: MonorepoConfig
}

/**
 * 提交类型配置
 */
export interface CommitTypeConfig {
  /** 类型标识 */
  type: string

  /** 章节标题 */
  section?: string

  /** 是否隐藏 */
  hidden?: boolean

  /** 排序优先级（数字越小优先级越高） */
  priority?: number

  /** 描述 */
  description?: string
}

/**
 * 格式选项
 */
export interface FormatOptions {
  /** Markdown 选项 */
  markdown?: MarkdownFormatOptions

  /** JSON 选项 */
  json?: JsonFormatOptions

  /** HTML 选项 */
  html?: HtmlFormatOptions
}

/**
 * Markdown 格式选项
 */
export interface MarkdownFormatOptions {
  /** 是否生成目录 */
  generateToc?: boolean

  /** 标题级别 */
  headingLevel?: number

  /** 是否使用 emoji */
  useEmoji?: boolean
}

/**
 * JSON 格式选项
 */
export interface JsonFormatOptions {
  /** 是否美化输出 */
  pretty?: boolean

  /** 缩进空格数 */
  indent?: number

  /** 是否包含元数据 */
  includeMetadata?: boolean
}

/**
 * HTML 格式选项
 */
export interface HtmlFormatOptions {
  /** 页面标题 */
  title?: string

  /** 是否包含样式 */
  includeStyles?: boolean

  /** 是否包含搜索功能 */
  includeSearch?: boolean

  /** 主题 */
  theme?: 'light' | 'dark' | 'auto'
}

/**
 * Monorepo 配置
 */
export interface MonorepoConfig {
  /** 是否为每个包生成独立的 changelog */
  enabled: boolean

  /** 包路径列表 */
  packages?: string[]

  /** tag 前缀格式（例：@scope/package-name@） */
  tagPrefix?: string

  /** 是否合并所有包的 changelog */
  mergeChangelogs?: boolean

  /** 输出文件名模式 */
  outputPattern?: string
}

/**
 * 模板配置
 */
export interface TemplateConfig {
  /** 模板路径 */
  path: string

  /** 模板引擎 */
  engine?: 'ejs' | 'handlebars'

  /** 自定义辅助函数 */
  helpers?: Record<string, Function>

  /** 模板变量 */
  variables?: Record<string, any>
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Required<Omit<ChangelogConfig, 'template' | 'repositoryUrl' | 'formatOptions'>> = {
  cwd: process.cwd(),
  output: 'CHANGELOG.md',
  format: 'markdown',
  types: [
    { type: 'feat', section: '✨ 新功能', priority: 1 },
    { type: 'fix', section: '🐛 Bug 修复', priority: 2 },
    { type: 'perf', section: '⚡ 性能优化', priority: 3 },
    { type: 'refactor', section: '♻️ 代码重构', priority: 4 },
    { type: 'docs', section: '📝 文档更新', priority: 5 },
    { type: 'style', section: '💄 代码样式', priority: 6 },
    { type: 'test', section: '✅ 测试', priority: 7 },
    { type: 'build', section: '📦 构建系统', priority: 8 },
    { type: 'ci', section: '👷 CI/CD', priority: 9 },
    { type: 'chore', section: '🔧 其他', priority: 10 },
  ],
  groupByType: true,
  includeAuthors: true,
  includePRLinks: true,
  includeCommitHash: true,
  includeAllCommits: false,
  dateFormat: 'YYYY-MM-DD',
  language: 'zh-CN',
  headerFormat: '## [{version}] - {date}',
  regenerate: false,
  updateMode: 'prepend',
  keepHistory: true,
  versionFormat: 'v{version}',
}

/**
 * 语言配置
 */
export const LANGUAGE_CONFIG: Record<string, Record<string, string>> = {
  'zh-CN': {
    newFeatures: '✨ 新功能',
    bugFixes: '🐛 Bug 修复',
    performance: '⚡ 性能优化',
    refactor: '♻️ 代码重构',
    documentation: '📝 文档更新',
    styles: '💄 代码样式',
    tests: '✅ 测试',
    build: '📦 构建系统',
    ci: '👷 CI/CD',
    chore: '🔧 其他',
    breakingChanges: '💥 破坏性变更',
    contributors: '👥 贡献者',
  },
  'en-US': {
    newFeatures: '✨ Features',
    bugFixes: '🐛 Bug Fixes',
    performance: '⚡ Performance',
    refactor: '♻️ Code Refactoring',
    documentation: '📝 Documentation',
    styles: '💄 Styles',
    tests: '✅ Tests',
    build: '📦 Build System',
    ci: '👷 CI/CD',
    chore: '🔧 Chores',
    breakingChanges: '💥 Breaking Changes',
    contributors: '👥 Contributors',
  },
  'ja-JP': {
    newFeatures: '✨ 新機能',
    bugFixes: '🐛 バグ修正',
    performance: '⚡ パフォーマンス',
    refactor: '♻️ リファクタリング',
    documentation: '📝 ドキュメント',
    styles: '💄 スタイル',
    tests: '✅ テスト',
    build: '📦 ビルドシステム',
    ci: '👷 CI/CD',
    chore: '🔧 その他',
    breakingChanges: '💥 破壊的変更',
    contributors: '👥 貢献者',
  },
}

