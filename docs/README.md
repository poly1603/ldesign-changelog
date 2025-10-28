# @ldesign/changelog 文档

完整的 VitePress 文档已创建。

## 文档结构

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress 配置
├── index.md               # 主页
├── guide/                 # 指南
│   ├── introduction.md    # 介绍
│   ├── getting-started.md # 快速开始
│   ├── concepts.md        # 核心概念
│   ├── features/          # 功能
│   │   ├── basic.md
│   │   ├── incremental.md
│   │   ├── validation.md
│   │   ├── preview.md
│   │   ├── customization.md
│   │   ├── monorepo.md
│   │   ├── github-release.md
│   │   └── interactive.md
│   ├── advanced/          # 进阶
│   │   ├── plugin-dev.md
│   │   ├── templates.md
│   │   ├── ci-cd.md
│   │   └── best-practices.md
│   ├── faq.md
│   ├── troubleshooting.md
│   └── migration.md
├── api/                   # API 参考
│   ├── core.md
│   ├── generator.md
│   ├── parser.md
│   ├── validator.md
│   ├── formatters.md
│   └── utils.md
├── plugins/               # 插件
│   ├── builtin.md
│   ├── api.md
│   └── community.md
├── reference/             # 参考
│   ├── config.md
│   ├── cli.md
│   └── types.md
└── examples/              # 示例
    ├── basic.md
    ├── monorepo.md
    ├── ci-cd.md
    └── custom-plugin.md
```

## 启动文档服务器

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run docs:dev

# 构建
pnpm run docs:build

# 预览构建结果
pnpm run docs:preview
```

## 文档特点

- ✅ 完整的导航和侧边栏
- ✅ 搜索功能
- ✅ 暗黑模式
- ✅ 移动端适配
- ✅ 代码高亮
- ✅ 多语言支持（可扩展）

## 贡献

欢迎提交文档改进！请查看 [贡献指南](../CONTRIBUTING.md)。
