# @ldesign/changelog

<p align="center">
  <img src="https://img.shields.io/npm/v/@ldesign/changelog.svg" alt="npm version">
  <img src="https://img.shields.io/npm/l/@ldesign/changelog.svg" alt="license">
  <img src="https://img.shields.io/npm/dm/@ldesign/changelog.svg" alt="downloads">
  <img src="https://img.shields.io/node/v/@ldesign/changelog.svg" alt="node version">
</p>

📝 自动化的版本管理工具，让变更日志维护变得轻松。支持多格式输出、自定义模板、统计分析、AI 增强等功能。

## ✨ 特性

- 🎯 **Conventional Commits** - 完整支持约定式提交规范
- 📊 **统计分析** - 详细的提交统计、贡献者分析、频率分析
- 🎨 **多格式输出** - 支持 Markdown、JSON、HTML 格式
- 🔧 **高度可配置** - 灵活的配置选项和自定义模板
- 🤖 **AI 增强** - 使用 LLM 优化提交信息和生成摘要
- 🔌 **插件系统** - 扩展功能的插件机制
- 📦 **Monorepo 支持** - 完美支持多包仓库
- 🌐 **多平台集成** - GitHub、GitLab、Gitee Release 管理
- 🔔 **通知集成** - Slack、Discord、Teams Webhook 通知
- 🌍 **国际化** - 支持中文、英文、日文

## 📦 安装

```bash
# 使用 pnpm
pnpm add -D @ldesign/changelog

# 使用 npm
npm install -D @ldesign/changelog

# 使用 yarn
yarn add -D @ldesign/changelog

# 全局安装
npm install -g @ldesign/changelog
```

## 🚀 快速开始

### 1. 初始化配置

```bash
# 创建默认配置文件
ldesign-changelog init

# 或使用短命令
ld-changelog init
```

### 2. 生成 Changelog

```bash
# 生成最新版本的 Changelog
ldesign-changelog generate

# 指定版本范围
ldesign-changelog generate --from v1.0.0 --to HEAD

# 生成特定版本
ldesign-changelog generate --version 2.0.0
```

### 3. 发布新版本

```bash
# 发布新的 patch 版本
ldesign-changelog release --type patch

# 发布新的 minor 版本并创建 GitHub Release
ldesign-changelog release --type minor --github-release

# 发布 major 版本并推送 tag
ldesign-changelog release --type major --tag --push
```

## 📖 CLI 命令

### `generate` - 生成 Changelog

生成版本变更日志。

```bash
ldesign-changelog generate [options]

选项：
  --version <version>     指定版本号
  --from <ref>           起始 Git 引用（tag/branch/commit）
  --to <ref>             结束 Git 引用（默认：HEAD）
  --output <file>        输出文件路径（默认：CHANGELOG.md）
  --format <type>        输出格式：markdown|json|html（默认：markdown）
  --config <file>        配置文件路径
  --regenerate           重新生成完整 Changelog
  --preset <name>        使用预设配置
```

**示例：**

```bash
# 生成 v2.0.0 的 Changelog
ldesign-changelog generate --version 2.0.0 --from v1.0.0 --to HEAD

# 生成 JSON 格式
ldesign-changelog generate --format json --output CHANGELOG.json

# 重新生成完整历史
ldesign-changelog generate --regenerate
```

### `release` - 发布新版本

自动化发布流程：更新版本号、生成 Changelog、创建 Git tag。

```bash
ldesign-changelog release [options]

选项：
  --type <type>          版本类型：major|minor|patch|premajor|preminor|prepatch|prerelease
  --version <version>    指定版本号（覆盖自动递增）
  --preid <identifier>   预发布标识符：alpha|beta|rc
  --tag                  创建 Git tag
  --push                 推送 tag 到远程
  --remote <remote>      远程仓库名（默认：origin）
  --skip-changelog       跳过 Changelog 生成
  --force                强制执行（跳过工作区检查）
  --github-release       创建 GitHub Release
  --prerelease           标记为预发布版本
  --draft                创建为草稿
  --assets <files...>    要上传的资源文件
```

**示例：**

```bash
# 发布 patch 版本
ldesign-changelog release --type patch --tag --push

# 发布 beta 版本
ldesign-changelog release --type prerelease --preid beta

# 发布并创建 GitHub Release
ldesign-changelog release --type minor --github-release --assets dist.zip
```

### `stats` - 统计分析

显示项目的提交统计信息。

```bash
ldesign-changelog stats [options]

选项：
  --from <ref>           起始引用
  --to <ref>             结束引用（默认：HEAD）
  --format <type>        输出格式：table|json|chart
  --output <file>        导出统计报告
```

**示例：**

```bash
# 显示统计信息
ldesign-changelog stats

# 生成统计报告
ldesign-changelog stats --format json --output stats.json
```

### `init` - 初始化配置

创建默认配置文件。

```bash
ldesign-changelog init [options]

选项：
  --preset <name>        使用预设：conventional|angular|atom|ember
  --force                强制覆盖现有配置
```

### `validate` - 验证提交信息

验证提交信息是否符合规范。

```bash
ldesign-changelog validate [options]

选项：
  --from <ref>           起始引用
  --to <ref>             结束引用（默认：HEAD）
  --strict               严格模式
```

### `lint` - 检查提交信息

检查提交信息的格式和质量。

```bash
ldesign-changelog lint [options]

选项：
  --from <ref>           起始引用
  --to <ref>             结束引用（默认：HEAD）
  --fix                  自动修复可修复的问题
```

### `preview` - 预览 Changelog

预览生成的 Changelog 而不写入文件。

```bash
ldesign-changelog preview [options]

选项：
  --from <ref>           起始引用
  --to <ref>             结束引用
  --format <type>        输出格式
```

### `diff` - 对比版本差异

对比两个版本之间的差异。

```bash
ldesign-changelog diff <from> <to> [options]

选项：
  --format <type>        输出格式
  --detailed             显示详细差异
```

## 🔧 配置文件

在项目根目录创建 `.changelogrc.json` 或 `changelog.config.js`：

### JSON 配置示例

```json
{
  "output": "CHANGELOG.md",
  "format": "markdown",
  "language": "zh-CN",
  "types": [
    { "type": "feat", "section": "✨ 新功能", "priority": 1 },
    { "type": "fix", "section": "🐛 Bug 修复", "priority": 2 },
    { "type": "perf", "section": "⚡ 性能优化", "priority": 3 },
    { "type": "refactor", "section": "♻️ 代码重构", "priority": 4 },
    { "type": "docs", "section": "📝 文档更新", "priority": 5 },
    { "type": "style", "section": "💄 代码样式", "hidden": true },
    { "type": "test", "section": "✅ 测试", "hidden": true },
    { "type": "build", "section": "📦 构建系统", "priority": 8 },
    { "type": "ci", "section": "👷 CI/CD", "hidden": true },
    { "type": "chore", "section": "🔧 其他", "priority": 10 }
  ],
  "groupByType": true,
  "includeAuthors": true,
  "includePRLinks": true,
  "includeCommitHash": true,
  "dateFormat": "YYYY-MM-DD",
  "headerFormat": "## [{version}] - {date}",
  "repositoryUrl": "https://github.com/ldesign/tools",
  "updateMode": "prepend",
  "keepHistory": true,
  "formatOptions": {
    "markdown": {
      "generateToc": true,
      "headingLevel": 2,
      "useEmoji": true
    },
    "json": {
      "pretty": true,
      "indent": 2,
      "includeMetadata": true
    },
    "html": {
      "title": "Changelog",
      "includeStyles": true,
      "includeSearch": true,
      "theme": "light"
    }
  }
}
```

### JavaScript 配置示例

```javascript
// changelog.config.js
export default {
  output: 'CHANGELOG.md',
  format: 'markdown',
  language: 'zh-CN',
  
  // 自定义类型配置
  types: [
    { type: 'feat', section: '✨ 新功能', priority: 1 },
    { type: 'fix', section: '🐛 Bug 修复', priority: 2 },
    // ...
  ],
  
  // 自定义模板
  template: './templates/changelog.ejs',
  
  // AI 增强配置
  ai: {
    enabled: true,
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-3.5-turbo',
    enhanceCommits: true,
    generateSummary: true,
  },
  
  // 插件配置
  plugins: [
    ['@ldesign/changelog-plugin-jira', {
      host: 'https://jira.example.com',
      projectKey: 'PROJ',
    }],
  ],
  
  // Monorepo 配置
  monorepo: {
    enabled: true,
    packages: ['packages/*'],
    tagPrefix: '@scope/package-name@',
  },
}
```

## 📚 API 使用

### 基础使用

```typescript
import { createChangelogGenerator } from '@ldesign/changelog'

// 创建生成器
const generator = createChangelogGenerator({
  output: 'CHANGELOG.md',
  format: 'markdown',
})

// 生成 Changelog
const content = await generator.generate('2.0.0', 'v1.0.0', 'HEAD')

// 写入文件
await generator.write(content)
```

### 使用不同格式化器

```typescript
import {
  createMarkdownFormatter,
  createJsonFormatter,
  createHtmlFormatter,
} from '@ldesign/changelog/formatters'

// Markdown 格式
const mdFormatter = createMarkdownFormatter({
  includeAuthors: true,
  includePRLinks: true,
})
const markdown = mdFormatter.format(content)

// JSON 格式
const jsonFormatter = createJsonFormatter({
  pretty: true,
  indent: 2,
})
const json = jsonFormatter.format(content)

// HTML 格式
const htmlFormatter = createHtmlFormatter({
  title: 'Project Changelog',
  theme: 'dark',
})
const html = htmlFormatter.format(content)
```

### 统计分析

```typescript
import { createStatsAnalyzer } from '@ldesign/changelog/core'

const analyzer = createStatsAnalyzer()
const stats = analyzer.analyze(commits)

console.log(`总提交数: ${stats.totalCommits}`)
console.log(`贡献者: ${stats.contributors.length}`)
console.log(`平均每天提交: ${stats.frequency.commitsPerDay}`)
```

### 提交验证

```typescript
import { createCommitLinter } from '@ldesign/changelog/core'

const linter = createCommitLinter({
  types: ['feat', 'fix', 'docs'],
  scopes: ['core', 'ui', 'api'],
})

const result = linter.lint(commits)

if (!result.valid) {
  console.error('发现无效的提交:')
  result.errors.forEach(error => {
    console.error(`- ${error.commit.hash}: ${error.message}`)
  })
}
```

### AI 增强

```typescript
import { createAIEnhancer } from '@ldesign/changelog/core'

const enhancer = createAIEnhancer({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
})

// 增强提交信息
const enhancedCommits = await enhancer.enhanceCommits(commits)

// 生成摘要
const summary = await enhancer.generateSummary(content)

// 生成亮点
const highlights = await enhancer.generateHighlights(content)

// 生成迁移指南
const migration = await enhancer.generateMigration(content)
```

### 插件系统

```typescript
import { createPluginManager, createPlugin } from '@ldesign/changelog/core'

// 创建自定义插件
const myPlugin = createPlugin('my-plugin', {
  beforeGenerate: async (config) => {
    console.log('生成前处理')
    return config
  },
  afterGenerate: async (content) => {
    console.log('生成后处理')
    return content
  },
})

// 使用插件
const manager = createPluginManager()
manager.register(myPlugin)

// 执行钩子
const result = await manager.executeHook('afterGenerate', content)
```

### Release 管理

```typescript
import { createReleaseManager } from '@ldesign/changelog'

// 自动检测平台
const manager = await createReleaseManager({
  token: process.env.GITHUB_TOKEN,
})

// 创建 Release
await manager.createRelease('2.0.0', changelog, {
  prerelease: false,
  draft: false,
  assets: ['dist.zip'],
})

// 更新 Release
await manager.updateRelease('v2.0.0', changelog)

// 删除 Release
await manager.deleteRelease('v2.0.0')
```

### Webhook 通知

```typescript
import { createWebhookNotifier } from '@ldesign/changelog'

const notifier = createWebhookNotifier({
  enabled: true,
  slack: {
    url: process.env.SLACK_WEBHOOK_URL,
    channel: '#releases',
    username: 'Changelog Bot',
  },
  discord: {
    url: process.env.DISCORD_WEBHOOK_URL,
  },
})

// 发送通知
await notifier.notify({
  event: 'release',
  version: '2.0.0',
  changelog: content,
})
```

## 🎨 输出格式

### Markdown 输出

```markdown
## [2.0.0] - 2024-01-15

**Full Changelog**: https://github.com/user/repo/compare/v1.0.0...v2.0.0

### 💥 Breaking Changes

- 重构了核心 API，请参考迁移指南

### ✨ 新功能

- **core**: 添加了插件系统支持 ([#123](https://github.com/user/repo/pull/123)) ([abc1234](https://github.com/user/repo/commit/abc1234)) - @username
- **ui**: 新增暗色主题 ([#124](https://github.com/user/repo/pull/124))

### 🐛 Bug 修复

- **api**: 修复了分页问题 ([#125](https://github.com/user/repo/pull/125))

### 👥 Contributors

@user1, @user2, @user3

### 📊 Statistics

- Total Commits: **45**
- Contributors: **8**
- Pull Requests: **12**
- Issues Closed: **15**
```

### JSON 输出

```json
{
  "version": "2.0.0",
  "date": "2024-01-15",
  "sections": [
    {
      "title": "✨ 新功能",
      "type": "feat",
      "commits": [...]
    }
  ],
  "breakingChanges": [...],
  "contributors": [...],
  "stats": {
    "totalCommits": 45,
    "contributorCount": 8,
    "prCount": 12,
    "issueCount": 15
  },
  "compareUrl": "https://github.com/user/repo/compare/v1.0.0...v2.0.0"
}
```

### HTML 输出

生成美观的交互式 HTML 页面，包含：
- 搜索功能
- 响应式设计
- 暗色/亮色主题
- 统计图表

## 🔥 高级功能

### 自定义模板

使用 EJS 模板自定义输出格式：

```ejs
<!-- templates/custom.ejs -->
# <%= version %> (<%= date %>)

<% if (breakingChanges && breakingChanges.length > 0) { %>
## ⚠️ BREAKING CHANGES
<% breakingChanges.forEach(change => { %>
- <%= change.description %>
<% }) %>
<% } %>

<% sections.forEach(section => { %>
## <%= section.title %>
<% section.commits.forEach(commit => { %>
- <%= commit.subject %> <%= commit.author.name %>
<% }) %>
<% }) %>
```

使用模板：

```javascript
const generator = createChangelogGenerator({
  template: './templates/custom.ejs',
})
```

### Monorepo 支持

为多包仓库生成独立的 Changelog：

```json
{
  "monorepo": {
    "enabled": true,
    "packages": [
      "packages/core",
      "packages/ui",
      "packages/utils"
    ],
    "tagPrefix": "@scope/",
    "mergeChangelogs": false,
    "outputPattern": "{package}/CHANGELOG.md"
  }
}
```

### 过滤和分组

```json
{
  "scopeFilter": ["core", "ui"],
  "groupByAuthor": true,
  "separateDependencies": true,
  "highlightSecurity": true
}
```

### CI/CD 集成

#### GitHub Actions

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - uses: pnpm/action-setup@v2
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Generate Changelog
        run: pnpm ldesign-changelog generate
      
      - name: Create Release
        run: |
          pnpm ldesign-changelog release \
            --type minor \
            --tag \
            --push \
            --github-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### GitLab CI

```yaml
release:
  stage: deploy
  only:
    - main
  script:
    - pnpm install
    - pnpm ldesign-changelog generate
    - pnpm ldesign-changelog release --type patch --tag --push
  environment:
    name: production
```

## 🎯 最佳实践

### 1. 遵循 Conventional Commits 规范

```bash
# 格式: <type>(<scope>): <subject>

feat(auth): add user login
fix(api): handle null response
docs: update README
perf(db): optimize query performance
```

### 2. 在提交消息中引用 Issue

```bash
git commit -m "fix(api): handle timeout error

Fixes #123
Closes #124"
```

### 3. 标记 Breaking Changes

```bash
git commit -m "feat(api): redesign authentication API

BREAKING CHANGE: The auth endpoint has been changed from /auth to /api/auth"
```

### 4. 定期生成 Changelog

在发布前生成 Changelog：

```bash
# 发布工作流
npm version patch
ldesign-changelog release --tag --push
git push && git push --tags
```

## 🔧 故障排除

### 常见问题

#### Q: 执行命令时提示 "Git 命令执行失败"

**原因：** Git 未安装或不在 PATH 中

```bash
# 检查 Git 是否安装
git --version

# 确保在 Git 仓库中执行
git rev-parse --git-dir
```

#### Q: 生成的 Changelog 为空

**原因：** 没有符合 Conventional Commits 规范的提交

```bash
# 检查最近的提交格式
git log --oneline -10

# 如果需要包含所有提交，使用 --include-all-commits 选项
ldesign-changelog generate --include-all-commits
```

#### Q: 文件写入权限错误

**解决方案：** 检查输出文件的写入权限

```bash
# 检查文件权限
ls -la CHANGELOG.md

# 指定其他输出路径
ldesign-changelog generate --output ./docs/CHANGELOG.md
```

#### Q: 如何在 CI 环境中处理安全警告

```bash
# 启用安全扫描
ldesign-changelog generate --scan-security

# 在配置文件中启用
# changelog.config.js
export default {
  scanSecurity: true,
  highlightSecurity: true
}
```

### 错误处理

本工具提供了统一的错误类型，方便在代码中处理：

```typescript
import {
  ChangelogError,
  GitError,
  ConfigError,
  FileError,
  ErrorCode,
  isChangelogError
} from '@ldesign/changelog'

try {
  await generator.generate('1.0.0')
} catch (error) {
  if (isChangelogError(error)) {
    switch (error.code) {
      case ErrorCode.GIT_COMMAND_FAILED:
        console.error('Git 命令失败，请检查 Git 环境')
        break
      case ErrorCode.CONFIG_INVALID:
        console.error('配置文件无效，请检查 changelog.config.js')
        break
      case ErrorCode.FILE_NOT_FOUND:
        console.error('文件未找到，请检查路径')
        break
      default:
        console.error(`错误 [${error.code}]: ${error.message}`)
    }
  }
}
```

## 📖 API 参考

### 核心模块

| 模块 | 描述 |
|--------|------|
| `ChangelogGenerator` | Changelog 生成器核心类 |
| `CommitParser` | 提交消息解析器 |
| `StatsAnalyzer` | 统计分析器 |
| `PluginManager` | 插件管理器 |
| `AIEnhancer` | AI 增强器 |

### 格式化器

| 模块 | 描述 |
|--------|------|
| `MarkdownFormatter` | Markdown 格式输出 |
| `JsonFormatter` | JSON 格式输出 |
| `HtmlFormatter` | HTML 格式输出 |

### 工具函数

| 函数 | 描述 |
|--------|------|
| `getGitCommits()` | 获取 Git 提交历史 |
| `getLatestTag()` | 获取最新标签 |
| `incrementVersion()` | 递增版本号 |
| `isValidVersion()` | 验证版本号格式 |

### 错误类

| 错误类 | 描述 |
|--------|------|
| `ChangelogError` | 基础错误类 |
| `GitError` | Git 操作错误 |
| `ConfigError` | 配置错误 |
| `FileError` | 文件操作错误 |
| `ApiError` | API 调用错误 |
| `ValidationError` | 验证错误 |

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详情。

### 开发设置

```bash
# 克隆仓库
git clone https://github.com/ldesign/tools.git
cd tools/changelog

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 运行测试
pnpm test

# 类型检查
pnpm run type-check

# 构建
pnpm build
```

### 项目结构

```
src/
├── cli/              # CLI 命令
│   ├── commands/     # 各个子命令
│   ├── index.ts      # CLI 入口
│   └── config-loader.ts
├── core/             # 核心功能
│   ├── ChangelogGenerator.ts
│   ├── CommitParser.ts
│   ├── StatsAnalyzer.ts
│   └── ...
├── formatters/       # 格式化器
│   ├── MarkdownFormatter.ts
│   ├── JsonFormatter.ts
│   └── HtmlFormatter.ts
├── integrations/     # 外部集成
│   ├── GitHubReleaseManager.ts
│   └── WebhookNotifier.ts
├── types/            # 类型定义
├── utils/            # 工具函数
│   ├── logger.ts     # 日志工具
│   ├── errors.ts     # 自定义错误
│   ├── git-utils.ts  # Git 工具
│   └── version.ts    # 版本工具
└── index.ts          # 主入口
```

## 📄 许可证

[MIT](./LICENSE) © LDesign Team

## 🙏 致谢

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)

## 📮 联系我们

- 问题反馈：[GitHub Issues](https://github.com/ldesign/tools/issues)
- 讨论交流：[GitHub Discussions](https://github.com/ldesign/tools/discussions)

---

Made with ❤️ by [LDesign Team](https://github.com/ldesign)
