# @ldesign/changelog

> 📝 自动化的版本管理工具，让变更日志维护变得轻松

## ✨ 特性

- 📝 **自动生成** - 基于 commit 信息自动生成 CHANGELOG
- 📌 **版本标记** - 自动版本号管理和 Git tag 创建
- 📑 **多格式输出** - 支持 Markdown/JSON/HTML 格式
- 🎨 **模板定制** - 自定义 CHANGELOG 模板
- 🔗 **Issue 关联** - 自动关联 Issue 和 PR 链接
- 📊 **统计分析** - 版本变更统计
- 🤖 **CI/CD 集成** - 自动化发布流程

## 📦 安装

```bash
npm install @ldesign/changelog --save-dev
```

## 🚀 快速开始

### 生成 CHANGELOG

```bash
# 生成最新版本的 changelog
npx ldesign-changelog generate

# 指定版本
npx ldesign-changelog generate --version 1.2.0
```

### 发布版本

```bash
# 自动更新版本号、生成 changelog、创建 tag
npx ldesign-changelog release

# 指定版本类型
npx ldesign-changelog release --type patch
```

## ⚙️ 配置

创建 `changelog.config.js`：

```javascript
module.exports = {
  // Commit 类型映射
  types: [
    { type: 'feat', section: '✨ Features' },
    { type: 'fix', section: '🐛 Bug Fixes' },
    { type: 'docs', section: '📝 Documentation' },
    { type: 'style', section: '💄 Styles' },
    { type: 'refactor', section: '♻️ Code Refactoring' },
    { type: 'perf', section: '⚡ Performance' },
    { type: 'test', section: '✅ Tests' },
  ],
  
  // 版本格式
  versionFormat: 'v${version}',
  
  // 输出配置
  output: {
    file: 'CHANGELOG.md',
    format: 'markdown',
  },
};
```

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📄 许可证

MIT © LDesign Team
@ldesign/changelog - Version management tool
