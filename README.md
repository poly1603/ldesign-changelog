# @ldesign/changelog

> 📝 自动化的版本管理工具，让变更日志维护变得轻松

[![npm version](https://img.shields.io/npm/v/@ldesign/changelog.svg)](https://www.npmjs.com/package/@ldesign/changelog)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## ✨ 特性

- 📝 **自动生成** - 基于 Conventional Commits 规范自动生成 CHANGELOG
- 📌 **版本管理** - 智能版本号递增和 Git tag 创建
- 📑 **多格式输出** - 支持 Markdown、JSON、HTML 三种格式
- 🎨 **模板定制** - 基于 EJS 的灵活模板系统
- 🔗 **智能关联** - 自动识别并链接 Issue 和 PR
- 📊 **统计分析** - 详细的提交统计和贡献者分析
- 🌍 **多语言支持** - 支持中文、英文、日文
- 🤖 **CI/CD 就绪** - 易于集成到自动化发布流程

## 📦 安装

```bash
# 使用 npm
npm install @ldesign/changelog --save-dev

# 使用 pnpm
pnpm add -D @ldesign/changelog

# 使用 yarn
yarn add -D @ldesign/changelog
```

## 🚀 快速开始

### 1. 初始化配置

```bash
npx ldesign-changelog init
```

这将在项目根目录生成 `changelog.config.js` 配置文件。

### 2. 生成 Changelog

```bash
# 生成最新版本的 changelog
npx ldesign-changelog generate --version 1.0.0

# 指定版本范围
npx ldesign-changelog generate --from v0.9.0 --to HEAD

# 输出到不同文件
npx ldesign-changelog generate --output HISTORY.md

# 生成 HTML 格式
npx ldesign-changelog generate --format html
```

### 3. 发布新版本

```bash
# 自动递增 patch 版本并生成 changelog
npx ldesign-changelog release

# 递增 minor 版本
npx ldesign-changelog release --type minor

# 递增 major 版本
npx ldesign-changelog release --type major

# 创建预发布版本
npx ldesign-changelog release --type prerelease --preid alpha

# 发布并创建 Git tag
npx ldesign-changelog release --tag --push
```

### 4. 查看统计信息

```bash
# 显示提交统计
npx ldesign-changelog stats

# 指定版本范围
npx ldesign-changelog stats --from v1.0.0 --to v2.0.0

# 输出为 JSON
npx ldesign-changelog stats --format json
```

## ⚙️ 配置

创建 `changelog.config.js`：

```javascript
module.exports = {
  // 输出文件路径
  output: 'CHANGELOG.md',

  // 输出格式 (markdown | json | html)
  format: 'markdown',

  // 提交类型配置
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
    { type: 'chore', section: '🔧 其他', priority: 10, hidden: true },
  ],

  // 是否按类型分组
  groupByType: true,

  // 是否包含作者信息
  includeAuthors: true,

  // 是否包含 PR 链接
  includePRLinks: true,

  // 是否包含 commit hash
  includeCommitHash: true,

  // 日期格式
  dateFormat: 'YYYY-MM-DD',

  // 语言 (zh-CN | en-US | ja-JP)
  language: 'zh-CN',

  // 标题格式
  headerFormat: '## [{version}] - {date}',

  // 版本号格式
  versionFormat: 'v{version}',

  // 格式选项
  formatOptions: {
    markdown: {
      generateToc: false,
      headingLevel: 2,
      useEmoji: true,
    },
    json: {
      pretty: true,
      indent: 2,
      includeMetadata: true,
    },
    html: {
      title: 'Changelog',
      includeStyles: true,
      includeSearch: true,
      theme: 'light',
    },
  },
}
```

## 📚 使用示例

### 程序化使用

```typescript
import { createChangelogGenerator } from '@ldesign/changelog'

// 创建生成器
const generator = createChangelogGenerator({
  output: 'CHANGELOG.md',
  format: 'markdown',
  includeAuthors: true,
})

// 生成 Changelog
const content = await generator.generate('1.0.0', 'v0.9.0', 'HEAD')

// 写入文件
await generator.write(content)

// 或者一步到位
await generator.generateAndWrite('1.0.0', 'v0.9.0', 'HEAD')
```

### 自定义模板

创建 `custom-template.ejs`：

```ejs
## <%= version %> - <%= date %>

<% sections.forEach(function(section) { %>
### <%= section.title %>

<% section.commits.forEach(function(commit) { %>
- <%= commit.subject %> (<%= commit.author.name %>)
<% }) %>
<% }) %>
```

使用自定义模板：

```bash
npx ldesign-changelog generate --template custom-template.ejs
```

### CI/CD 集成

#### GitHub Actions

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Changelog
        run: npx ldesign-changelog generate --version ${{ github.ref_name }}
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body_path: CHANGELOG.md
```

## 📖 API 文档

### ChangelogGenerator

主要的 Changelog 生成器类。

```typescript
class ChangelogGenerator {
  constructor(config?: ChangelogConfig)
  
  // 生成 Changelog 内容
  async generate(version: string, from?: string, to?: string): Promise<ChangelogContent>
  
  // 格式化 Changelog
  format(content: ChangelogContent, format?: 'markdown' | 'json' | 'html'): string
  
  // 写入文件
  async write(content: ChangelogContent): Promise<void>
  
  // 生成并写入
  async generateAndWrite(version: string, from?: string, to?: string): Promise<void>
}
```

### CommitParser

提交解析器，解析 Conventional Commits。

```typescript
class CommitParser {
  constructor(config?: CommitParserConfig)
  
  // 解析提交列表
  parse(commits: GitCommit[]): ChangelogCommit[]
  
  // 解析单个提交
  parseCommit(commit: GitCommit): ChangelogCommit | null
  
  // 按类型分组
  groupByType(commits: ChangelogCommit[]): Map<string, ChangelogCommit[]>
  
  // 提取 Breaking Changes
  extractBreakingChanges(commits: ChangelogCommit[]): ChangelogCommit[]
}
```

### StatsAnalyzer

统计分析器，分析提交数据。

```typescript
class StatsAnalyzer {
  constructor(options?: StatsAnalysisOptions)
  
  // 分析提交统计
  analyze(commits: ChangelogCommit[]): StatsAnalysisResult
}
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
npx ldesign-changelog release --tag --push
git push && git push --tags
```

## 🔧 故障排查

### 问题：无法获取 Git 提交

**解决方案**：确保在 Git 仓库中运行命令，并且有提交历史。

### 问题：生成的 Changelog 为空

**解决方案**：
1. 确保提交消息遵循 Conventional Commits 规范
2. 或者启用 `includeAllCommits: true` 包含所有提交

### 问题：链接无法生成

**解决方案**：确保已配置远程仓库 URL：

```bash
git remote -v
```

或在配置中手动指定：

```javascript
module.exports = {
  repositoryUrl: 'https://github.com/username/repo',
}
```

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

[MIT](./LICENSE) © LDesign Team

## 🔗 相关链接

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)

---

Made with ❤️ by [LDesign Team](https://github.com/ldesign)
