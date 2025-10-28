import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@ldesign/changelog',
  description: '📝 自动化的版本管理工具,让变更日志维护变得轻松',
  base: '/',
  
  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: 'API', link: '/api/core' },
      { text: '插件', link: '/plugins/builtin' },
      { text: '示例', link: '/examples/basic' },
      {
        text: '更多',
        items: [
          { text: '配置参考', link: '/reference/config' },
          { text: 'CLI 命令', link: '/reference/cli' },
          { text: '常见问题', link: '/guide/faq' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '核心概念', link: '/guide/concepts' },
          ],
        },
        {
          text: '功能',
          items: [
            { text: '基础功能', link: '/guide/features/basic' },
            { text: '增量更新', link: '/guide/features/incremental' },
            { text: '验证与检查', link: '/guide/features/validation' },
            { text: '预览与对比', link: '/guide/features/preview' },
            { text: '自定义选项', link: '/guide/features/customization' },
            { text: 'Monorepo 支持', link: '/guide/features/monorepo' },
            { text: 'GitHub Release', link: '/guide/features/github-release' },
            { text: '交互式模式', link: '/guide/features/interactive' },
          ],
        },
        {
          text: '进阶',
          items: [
            { text: '插件开发', link: '/guide/advanced/plugin-dev' },
            { text: '自定义模板', link: '/guide/advanced/templates' },
            { text: 'CI/CD 集成', link: '/guide/advanced/ci-cd' },
            { text: '最佳实践', link: '/guide/advanced/best-practices' },
          ],
        },
        {
          text: '其他',
          items: [
            { text: '常见问题', link: '/guide/faq' },
            { text: '故障排查', link: '/guide/troubleshooting' },
            { text: '迁移指南', link: '/guide/migration' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '核心 API', link: '/api/core' },
            { text: '生成器', link: '/api/generator' },
            { text: '解析器', link: '/api/parser' },
            { text: '验证器', link: '/api/validator' },
            { text: '格式化器', link: '/api/formatters' },
            { text: '工具函数', link: '/api/utils' },
          ],
        },
      ],
      '/plugins/': [
        {
          text: '插件',
          items: [
            { text: '内置插件', link: '/plugins/builtin' },
            { text: '插件 API', link: '/plugins/api' },
            { text: '社区插件', link: '/plugins/community' },
          ],
        },
      ],
      '/reference/': [
        {
          text: '参考',
          items: [
            { text: '配置参考', link: '/reference/config' },
            { text: 'CLI 命令', link: '/reference/cli' },
            { text: '类型定义', link: '/reference/types' },
          ],
        },
      ],
      '/examples/': [
        {
          text: '示例',
          items: [
            { text: '基础示例', link: '/examples/basic' },
            { text: 'Monorepo 示例', link: '/examples/monorepo' },
            { text: 'CI/CD 示例', link: '/examples/ci-cd' },
            { text: '自定义插件', link: '/examples/custom-plugin' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ldesign/changelog' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present LDesign Team',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/ldesign/changelog/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
})
