## [Unreleased] - 2025-11-13

### ✨ 新功能

- 实现完整的文档系统与插件架构 ([f009372](https://github.com/poly1603/ldesign-changelog/commit/f009372ac7afe98e6f583c962e28fc7984148b52)) - @swimly

### 📝 文档更新

- **readme**: 更新README文档以增强可读性和功能描述 ([a71f707](https://github.com/poly1603/ldesign-changelog/commit/a71f7079ed76fe9ad9da49acc5ba6cab95173ac0)) - @swimly
- **readme**: 完善项目README文档 ([d567a5f](https://github.com/poly1603/ldesign-changelog/commit/d567a5f760681745588e682a689cb6ef87e1d793)) - @swimly

### 🔧 其他

- 移除过时的文档文件 ([8659a43](https://github.com/poly1603/ldesign-changelog/commit/8659a431e81b96a46d3b82d68d5acd64377f9491)) - @swimly

### 👥 Contributors

swimly

### 📊 Statistics

- Total Commits: **4**
- Contributors: **1**


# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-27

### ✨ Features

- **core**: 完整实现 Changelog 生成器
- **parser**: 实现 Conventional Commits 解析器
- **formatters**: 支持 Markdown、JSON、HTML 三种输出格式
- **template**: 基于 EJS 的模板系统
- **stats**: 详细的统计分析功能
- **cli**: 完整的命令行工具（generate、release、stats、init）
- **i18n**: 多语言支持（中文、英文、日文）

### 📝 Documentation

- 完整的 README 文档
- API 参考文档
- 配置指南
- 使用示例

### ✅ Tests

- CommitParser 单元测试
- StatsAnalyzer 单元测试
- MarkdownFormatter 单元测试
- Version 工具测试

### 📦 Infrastructure

- TypeScript 配置
- tsup 构建配置
- Vitest 测试配置
- ESLint 配置

