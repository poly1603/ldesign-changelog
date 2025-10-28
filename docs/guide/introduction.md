# 介绍

## 什么是 @ldesign/changelog?

@ldesign/changelog 是一个现代化的 changelog 生成工具,帮助开发者自动生成规范的变更日志。它基于 [Conventional Commits](https://www.conventionalcommits.org/) 规范,支持多种输出格式,提供丰富的自定义选项。

## 主要特性

### 🚀 自动生成

- 基于 Git 提交历史自动生成 changelog
- 支持 Conventional Commits 规范
- 智能识别版本标签和语义化版本
- 自动关联 Issue 和 PR

### 📦 多格式输出

- **Markdown** - 标准的 changelog 格式
- **JSON** - 结构化数据,便于程序处理
- **HTML** - 美观的网页展示
- **自定义模板** - 使用 EJS 创建自定义格式

### 🎨 高度可定制

- 灵活的配置选项
- 自定义模板系统
- 强大的插件机制
- 丰富的 CLI 选项

### 🔧 开发者友好

- TypeScript 编写,类型安全
- 完整的 API 文档
- 丰富的使用示例
- 活跃的社区支持

### 🌟 企业级功能

- **Monorepo 支持** - 多包项目的 changelog 管理
- **增量更新** - prepend/append/overwrite 模式
- **验证与检查** - changelog 和 commit 消息验证
- **GitHub Release** - 自动创建和更新 GitHub Release
- **交互式模式** - 命令行交互式选择和编辑

## 设计理念

### 约定优于配置

@ldesign/changelog 遵循 Conventional Commits 规范,开箱即用。同时提供灵活的配置选项,满足各种定制需求。

### 渐进式增强

从最简单的用法开始,逐步使用高级功能:

1. 零配置 - 直接运行命令生成 changelog
2. 基础配置 - 使用配置文件自定义选项
3. 模板定制 - 创建自定义输出格式
4. 插件扩展 - 开发插件实现复杂需求

### 开发体验优先

- 清晰的错误提示
- 详细的日志输出
- 交互式命令行界面
- 完善的文档和示例

## 使用场景

### 开源项目

- 自动生成标准的 CHANGELOG.md
- 与 GitHub Release 集成
- 为用户提供清晰的版本变更记录

### 企业项目

- 统一团队的提交规范
- 自动化发布流程
- 追踪功能开发和 bug 修复

### Monorepo

- 管理多个包的 changelog
- 过滤特定包的提交
- 独立或合并发布

### CI/CD 集成

- GitHub Actions 自动化
- GitLab CI 集成
- 自动发布和标签管理

## 为什么选择 @ldesign/changelog?

### 🎯 功能全面

相比其他工具,@ldesign/changelog 提供更多开箱即用的功能:

- 完整的命令行工具集 (generate, validate, lint, preview, diff, release)
- 内置 6 种增强插件
- Monorepo 完整支持
- GitHub Release 集成

### 🛠️ 高度灵活

- 支持自定义模板和插件
- 灵活的配置系统
- 多种增量更新模式
- 丰富的过滤和分组选项

### 📚 文档完善

- 详细的使用指南
- 完整的 API 文档
- 丰富的使用示例
- 活跃的社区支持

### 🚀 性能优异

- TypeScript 编写,性能优秀
- 智能缓存机制
- 并行处理支持

## 下一步

- [快速开始](/guide/getting-started) - 5 分钟上手
- [核心概念](/guide/concepts) - 了解基本概念
- [功能详解](/guide/features/basic) - 探索所有功能
- [API 参考](/api/core) - 查看 API 文档
