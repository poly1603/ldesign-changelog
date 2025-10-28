---
layout: home

hero:
  name: "@ldesign/changelog"
  text: 自动化变更日志工具
  tagline: 让版本管理变得轻松，专业的 Changelog 生成解决方案
  image:
    src: /logo.svg
    alt: ldesign changelog
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看示例
      link: /examples/basic
    - theme: alt
      text: GitHub
      link: https://github.com/ldesign/changelog

features:
  - icon: ✨
    title: 自动生成
    details: 基于 Conventional Commits 规范自动生成专业的 CHANGELOG，无需手动维护
  
  - icon: 📌
    title: 智能版本管理
    details: 自动递增版本号，创建 Git tag，支持 SemVer 全部版本类型
  
  - icon: 📑
    title: 多格式输出
    details: 支持 Markdown、JSON、HTML 三种输出格式，满足不同场景需求
  
  - icon: 🎨
    title: 灵活模板
    details: 基于 EJS 的模板系统，支持完全自定义 Changelog 样式
  
  - icon: 🔗
    title: 智能关联
    details: 自动识别并生成 Issue、PR、Commit 链接，完美集成 GitHub/GitLab
  
  - icon: 📊
    title: 统计分析
    details: 详细的提交统计、贡献者分析、类型分布等数据可视化
  
  - icon: ✅
    title: 验证与检查
    details: 内置 Changelog 验证和 Commit 规范检查，确保代码质量
  
  - icon: 👀
    title: 预览与对比
    details: 生成前预览内容，对比不同版本差异，避免错误发布
  
  - icon: 🎯
    title: Monorepo 支持
    details: 完美支持 Monorepo 项目，为每个包生成独立 Changelog
  
  - icon: 🚀
    title: GitHub Release
    details: 一键创建 GitHub Release，自动上传资源文件
  
  - icon: 💬
    title: 交互式模式
    details: 友好的交互式界面，手动选择和编辑提交内容
  
  - icon: 🔌
    title: 插件系统
    details: 强大的插件系统，轻松扩展功能，6+ 内置插件开箱即用
  
  - icon: 🌍
    title: 多语言支持
    details: 支持中文、英文、日文，轻松切换输出语言
  
  - icon: 🤖
    title: CI/CD 就绪
    details: 易于集成到 GitHub Actions、GitLab CI 等自动化流程
  
  - icon: 🎓
    title: TypeScript
    details: 完整的 TypeScript 类型定义，开发体验极佳
  
  - icon: ⚡
    title: 高性能
    details: 异步处理、智能缓存，处理大型项目依然快速
---

## 快速体验

```bash
# 安装
pnpm add -D @ldesign/changelog

# 生成 Changelog
npx ld-changelog generate --version 1.0.0

# 发布新版本
npx ld-changelog release --tag --push
```

## 为什么选择 @ldesign/changelog？

### 🎯 功能完整

从基础的 Changelog 生成到高级的 Monorepo 支持、GitHub Release 集成，覆盖版本管理的方方面面。

### 💎 易于使用

简洁的 CLI 命令、交互式界面、详细的文档，让你快速上手，立即提升工作效率。

### 🔧 高度可定制

灵活的配置选项、自定义模板、插件系统，满足各种定制化需求。

### 🏆 生产就绪

经过充分测试，TypeScript 编写，完整的错误处理，可靠地应用于生产环境。

## 谁在使用？

@ldesign/changelog 适用于：

- 📦 **开源项目** - 自动维护专业的 CHANGELOG
- 🏢 **企业项目** - 规范化版本管理流程
- 🔨 **Monorepo** - 统一管理多包版本
- 🤖 **CI/CD** - 自动化发布流程

## 社区

- [GitHub 讨论](https://github.com/ldesign/changelog/discussions) - 提问和分享
- [Issue 追踪](https://github.com/ldesign/changelog/issues) - 报告 Bug
- [贡献指南](https://github.com/ldesign/changelog/blob/main/CONTRIBUTING.md) - 参与贡献

## 开源协议

[MIT License](https://github.com/ldesign/changelog/blob/main/LICENSE) © 2024-present LDesign Team
