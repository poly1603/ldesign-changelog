# 快速开始

本指南将帮助你在 5 分钟内开始使用 @ldesign/changelog。

## 安装

::: code-group

```bash [pnpm]
pnpm add -D @ldesign/changelog
```

```bash [npm]
npm install --save-dev @ldesign/changelog
```

```bash [yarn]
yarn add -D @ldesign/changelog
```

:::

## 基本使用

### 生成 Changelog

最简单的方式,生成从最新的 tag 到 HEAD 的 changelog:

```bash
npx ld-changelog generate
```

### 指定版本范围

生成特定版本范围的 changelog:

```bash
# 从 v1.0.0 到 v2.0.0
npx ld-changelog generate --from v1.0.0 --to v2.0.0

# 从指定 tag 到当前 HEAD
npx ld-changelog generate --from v1.0.0

# 所有版本的完整 changelog
npx ld-changelog generate --from $(git rev-list --max-parents=0 HEAD)
```

### 输出格式

支持多种输出格式:

```bash
# Markdown (默认)
npx ld-changelog generate

# JSON
npx ld-changelog generate --format json --output changelog.json

# HTML
npx ld-changelog generate --format html --output changelog.html
```

## 配置文件

创建 `changelog.config.js` 配置文件:

```js path=null start=null
export default {
  output: 'CHANGELOG.md',
  format: 'markdown',
  types: {
    feat: { title: '✨ Features', bump: 'minor' },
    fix: { title: '🐛 Bug Fixes', bump: 'patch' },
    docs: { title: '📝 Documentation', bump: 'patch' },
    style: { title: '💅 Styles', bump: 'patch' },
    refactor: { title: '♻️ Code Refactoring', bump: 'patch' },
    perf: { title: '⚡ Performance', bump: 'patch' },
    test: { title: '✅ Tests', bump: 'patch' },
    chore: { title: '🔧 Chore', bump: 'patch' },
  },
  github: {
    repo: 'owner/repo',
    linkReferences: true,
  },
}
```

## Commit 规范

@ldesign/changelog 基于 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 示例

```
feat(api): add user authentication

Implement JWT-based authentication for API endpoints

Closes #123
```

### Type 类型

- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式 (不影响代码运行的变动)
- `refactor` - 重构 (既不是新增功能,也不是修复bug)
- `perf` - 性能优化
- `test` - 测试
- `chore` - 构建过程或辅助工具的变动

### Breaking Changes

使用 `BREAKING CHANGE:` 标记不兼容的变更:

```
feat(api): change authentication method

BREAKING CHANGE: JWT tokens are now required for all API requests
```

## 工作流示例

### 1. 开发新功能

```bash
git commit -m "feat(user): add profile page"
git commit -m "feat(user): add avatar upload"
```

### 2. 修复 Bug

```bash
git commit -m "fix(auth): resolve login timeout issue

Closes #456"
```

### 3. 发布新版本

```bash
# 创建版本标签
git tag v1.1.0

# 生成 changelog
npx ld-changelog generate

# 提交 changelog
git add CHANGELOG.md
git commit -m "chore: update changelog for v1.1.0"

# 推送到远程
git push --follow-tags
```

## 命令速查

```bash
# 生成 changelog
npx ld-changelog generate

# 验证 changelog 文件
npx ld-changelog validate

# 检查 commit 消息
npx ld-changelog lint

# 预览 changelog
npx ld-changelog preview --from v1.0.0

# 对比两个版本
npx ld-changelog diff v1.0.0 v2.0.0

# 创建 GitHub Release
npx ld-changelog release --version v1.1.0
```

## 下一步

- [核心概念](/guide/concepts) - 了解基本概念
- [功能详解](/guide/features/basic) - 探索所有功能
- [配置参考](/reference/config) - 查看完整配置选项
- [CLI 命令](/reference/cli) - 所有命令的详细说明
