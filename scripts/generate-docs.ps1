# 批量生成文档的 PowerShell 脚本

$DocsPath = "D:\WorkBench\ldesign\tools\changelog\docs"

# 文档内容定义
$docs = @{
    "guide/introduction.md" = @"
# 介绍

## 什么是 @ldesign/changelog？

@ldesign/changelog 是一个功能强大的自动化 Changelog 生成工具，专为现代软件开发团队设计。它基于 [Conventional Commits](https://www.conventionalcommits.org/) 规范，自动从 Git 提交历史中生成专业、规范的变更日志。

## 主要特性

### 🚀 核心功能

- **自动生成** - 解析 Git 提交历史，自动生成 Changelog
- **版本管理** - 智能递增版本号，支持 SemVer 全部类型
- **多格式输出** - Markdown、JSON、HTML 三种格式
- **智能关联** - 自动链接 Issue、PR、Commit

### ✨ 高级功能

- **验证与检查** - 验证 Changelog 格式，检查提交规范
- **预览与对比** - 生成前预览，版本间对比
- **Monorepo 支持** - 完美支持 Monorepo 项目
- **GitHub Release** - 一键创建 GitHub Release
- **交互式模式** - 友好的交互式界面
- **插件系统** - 强大的插件扩展能力

## 设计理念

### 自动化优先

手动维护 Changelog 既耗时又容易出错。@ldesign/changelog 通过自动化解放你的双手，让你专注于编码。

### 规范驱动

基于 Conventional Commits 规范，确保提交历史清晰、可追溯，生成的 Changelog 专业规范。

### 灵活可扩展

从基础配置到自定义模板，从内置插件到自定义插件，满足各种定制化需求。

### 开发体验

TypeScript 编写，完整类型定义，友好的 CLI 交互，让开发体验极致舒适。

## 使用场景

### 开源项目

自动维护专业的 CHANGELOG.md，展示项目进展，吸引更多贡献者。

### 企业项目

规范化版本管理流程，提升团队协作效率，确保发布质量。

### Monorepo

统一管理多包版本，为每个包生成独立 Changelog。

### CI/CD 集成

集成到自动化流程，实现版本管理全自动化。

## 下一步

- [快速开始](/guide/getting-started) - 5分钟上手
- [核心概念](/guide/concepts) - 理解关键概念
- [功能详解](/guide/features/basic) - 深入了解功能

"@

    "guide/getting-started.md" = @"
# 快速开始

本指南将帮助你在 5 分钟内上手 @ldesign/changelog。

## 安装

### 使用 npm

\`\`\`bash
npm install -D @ldesign/changelog
\`\`\`

### 使用 pnpm

\`\`\`bash
pnpm add -D @ldesign/changelog
\`\`\`

### 使用 yarn

\`\`\`bash
yarn add -D @ldesign/changelog
\`\`\`

## 初始化

在项目根目录运行初始化命令：

\`\`\`bash
npx ld-changelog init
\`\`\`

这将创建 \`changelog.config.js\` 配置文件：

\`\`\`javascript
module.exports = {
  output: 'CHANGELOG.md',
  format: 'markdown',
  types: [
    { type: 'feat', section: '✨ 新功能', priority: 1 },
    { type: 'fix', section: '🐛 Bug 修复', priority: 2 },
    { type: 'perf', section: '⚡ 性能优化', priority: 3 },
    // ...更多配置
  ],
}
\`\`\`

## 基础使用

### 生成 Changelog

\`\`\`bash
# 生成指定版本的 changelog
npx ld-changelog generate --version 1.0.0

# 生成版本范围的 changelog
npx ld-changelog generate --from v0.9.0 --to HEAD
\`\`\`

### 发布新版本

\`\`\`bash
# 自动递增 patch 版本并生成 changelog
npx ld-changelog release

# 递增 minor 版本
npx ld-changelog release --type minor

# 递增 major 版本
npx ld-changelog release --type major
\`\`\`

### 验证 Changelog

\`\`\`bash
# 验证 changelog 格式
npx ld-changelog validate

# 检查提交规范
npx ld-changelog lint
\`\`\`

## 提交规范

@ldesign/changelog 基于 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

### 示例

\`\`\`bash
# 新功能
git commit -m "feat(auth): add user login"

# Bug 修复
git commit -m "fix(api): handle null response"

# Breaking Change
git commit -m "feat(api): redesign authentication

BREAKING CHANGE: The auth endpoint has been changed"
\`\`\`

## 工作流示例

### 开发流程

\`\`\`bash
# 1. 开发功能，遵循提交规范
git commit -m "feat: add new feature"
git commit -m "fix: fix bug"

# 2. 预览 changelog
npx ld-changelog preview --stats

# 3. 生成 changelog
npx ld-changelog generate --version 1.1.0

# 4. 验证
npx ld-changelog validate

# 5. 提交和发布
git add CHANGELOG.md
git commit -m "chore: release v1.1.0"
git tag v1.1.0
git push && git push --tags
\`\`\`

### 一键发布

\`\`\`bash
# 自动完成版本递增、changelog 生成、tag 创建和推送
npx ld-changelog release --tag --push
\`\`\`

## package.json 集成

添加到 npm scripts：

\`\`\`json
{
  "scripts": {
    "changelog": "ld-changelog generate",
    "changelog:preview": "ld-changelog preview --stats",
    "changelog:lint": "ld-changelog lint --strict",
    "release": "ld-changelog release --tag --push"
  }
}
\`\`\`

使用：

\`\`\`bash
npm run changelog:preview
npm run release
\`\`\`

## 下一步

- [核心概念](/guide/concepts) - 理解关键概念
- [配置参考](/reference/config) - 详细配置选项
- [CLI 命令](/reference/cli) - 所有命令详解
- [功能详解](/guide/features/basic) - 深入了解功能

"@

    "reference/cli.md" = @"
# CLI 命令参考

@ldesign/changelog 提供了一套完整的 CLI 命令。

## 命令概览

| 命令 | 描述 |
|------|------|
| \`generate\` | 生成 Changelog |
| \`release\` | 发布新版本 |
| \`validate\` | 验证 Changelog 格式 |
| \`lint\` | 检查提交消息规范 |
| \`preview\` | 预览 Changelog |
| \`diff\` | 对比版本差异 |
| \`stats\` | 显示统计信息 |
| \`init\` | 初始化配置 |

## generate

生成 Changelog 文件。

### 语法

\`\`\`bash
ld-changelog generate [options]
\`\`\`

### 选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| \`--version <version>\` | 指定版本号 | - |
| \`--from <tag>\` | 起始标签 | 最后一个 tag |
| \`--to <tag>\` | 结束标签 | HEAD |
| \`--output <file>\` | 输出文件 | CHANGELOG.md |
| \`--format <format>\` | 输出格式 (markdown\\|json\\|html) | markdown |
| \`--template <file>\` | 自定义模板路径 | - |
| \`--config <file>\` | 配置文件路径 | changelog.config.js |
| \`--no-write\` | 不写入文件，仅输出 | false |
| \`--interactive\` | 交互式选择提交 | false |
| \`--edit\` | 编辑生成的内容 | false |

### 示例

\`\`\`bash
# 生成指定版本
ld-changelog generate --version 1.0.0

# 生成版本范围
ld-changelog generate --from v0.9.0 --to v1.0.0

# 输出为 JSON
ld-changelog generate --format json --output changelog.json

# 交互式生成
ld-changelog generate --interactive --edit

# 仅输出到控制台
ld-changelog generate --no-write
\`\`\`

## release

发布新版本，包括版本递增、Changelog 生成、Tag 创建。

### 语法

\`\`\`bash
ld-changelog release [options]
\`\`\`

### 选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| \`--type <type>\` | 版本类型 | patch |
| \`--version <version>\` | 指定版本号 | - |
| \`--preid <id>\` | 预发布标识符 | - |
| \`--tag\` | 创建 Git tag | false |
| \`--push\` | 推送到远程 | false |
| \`--remote <name>\` | 远程仓库名 | origin |
| \`--skip-changelog\` | 跳过 Changelog 生成 | false |
| \`--force\` | 强制执行 | false |
| \`--github-release\` | 创建 GitHub Release | false |
| \`--prerelease\` | 标记为预发布 | false |
| \`--draft\` | 创建为草稿 | false |
| \`--assets <files...>\` | 上传资源文件 | - |

### 版本类型

- \`major\` - 主版本号 (1.0.0 → 2.0.0)
- \`minor\` - 次版本号 (1.0.0 → 1.1.0)
- \`patch\` - 补丁版本号 (1.0.0 → 1.0.1)
- \`premajor\` - 预发布主版本 (1.0.0 → 2.0.0-0)
- \`preminor\` - 预发布次版本 (1.0.0 → 1.1.0-0)
- \`prepatch\` - 预发布补丁 (1.0.0 → 1.0.1-0)
| \`prerelease\` - 预发布递增 (1.0.0-0 → 1.0.0-1)

### 示例

\`\`\`bash
# 发布 patch 版本
ld-changelog release

# 发布 minor 版本
ld-changelog release --type minor

# 发布并创建 tag
ld-changelog release --tag --push

# 发布 alpha 版本
ld-changelog release --type prerelease --preid alpha

# 创建 GitHub Release
ld-changelog release --github-release --assets dist/*.zip
\`\`\`

## validate

验证 Changelog 文件格式。

### 语法

\`\`\`bash
ld-changelog validate [file] [options]
\`\`\`

### 选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| \`file\` | Changelog 文件路径 | CHANGELOG.md |
| \`--config <file>\` | 配置文件路径 | - |
| \`--strict\` | 严格模式 | false |
| \`--json\` | JSON 输出 | false |

### 示例

\`\`\`bash
# 验证默认文件
ld-changelog validate

# 验证指定文件
ld-changelog validate HISTORY.md

# 严格模式
ld-changelog validate --strict
\`\`\`

## lint

检查提交消息是否符合 Conventional Commits 规范。

### 语法

\`\`\`bash
ld-changelog lint [options]
\`\`\`

### 选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| \`--from <tag>\` | 起始标签 | - |
| \`--to <tag>\` | 结束标签 | HEAD |
| \`--strict\` | 严格模式 | false |
| \`--json\` | JSON 输出 | false |
| \`--max-subject-length <n>\` | 主题最大长度 | 72 |
| \`--require-scope\` | 要求 scope | false |

### 示例

\`\`\`bash
# 检查所有提交
ld-changelog lint

# 检查版本范围
ld-changelog lint --from v1.0.0

# 严格模式
ld-changelog lint --strict --require-scope
\`\`\`

## preview

预览即将生成的 Changelog 内容。

### 语法

\`\`\`bash
ld-changelog preview [options]
\`\`\`

### 选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| \`--version <version>\` | 版本号 | Unreleased |
| \`--from <tag>\` | 起始标签 | - |
| \`--to <tag>\` | 结束标签 | HEAD |
| \`--format <format>\` | 输出格式 | markdown |
| \`--no-color\` | 禁用颜色 | false |
| \`--stats\` | 显示统计信息 | false |

### 示例

\`\`\`bash
# 预览
ld-changelog preview

# 显示统计
ld-changelog preview --stats

# 纯文本输出
ld-changelog preview --no-color
\`\`\`

## diff

对比两个版本的差异。

### 语法

\`\`\`bash
ld-changelog diff <from> <to> [options]
\`\`\`

### 选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| \`--format <format>\` | 输出格式 (text\\|json\\|table) | text |
| \`--detailed\` | 显示详细差异 | false |

### 示例

\`\`\`bash
# 对比版本
ld-changelog diff v1.0.0 v2.0.0

# 详细模式
ld-changelog diff v1.0.0 v2.0.0 --detailed

# 表格输出
ld-changelog diff v1.0.0 v2.0.0 --format table
\`\`\`

## 全局选项

所有命令都支持以下全局选项：

| 选项 | 描述 |
|------|------|
| \`-v, --version\` | 显示版本号 |
| \`-h, --help\` | 显示帮助信息 |
| \`-d, --debug\` | 启用调试模式 |
| \`--silent\` | 静默模式 |

### 示例

\`\`\`bash
# 查看版本
ld-changelog --version

# 查看命令帮助
ld-changelog generate --help

# 调试模式
ld-changelog generate --debug
\`\`\`

"@
}

# 生成文档
foreach ($file in $docs.Keys) {
    $path = Join-Path $DocsPath $file
    $content = $docs[$file]
    
    Write-Host "Creating $path" -ForegroundColor Green
    New-Item -Path $path -ItemType File -Force | Out-Null
    Set-Content -Path $path -Value $content -Encoding UTF8
}

Write-Host "`nDocuments generated successfully!" -ForegroundColor Cyan
Write-Host "Total files: $($docs.Count)" -ForegroundColor Yellow
"@
