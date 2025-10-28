# 🎉 新增功能

本文档列出了 @ldesign/changelog 最新版本中新增的功能和改进。

## ✨ 已完成的功能

### 1. 增量更新模式

支持三种 Changelog 更新模式，让版本管理更灵活：

```javascript
// changelog.config.js
module.exports = {
  updateMode: 'prepend', // 默认：新版本添加到顶部
  // updateMode: 'append',    // 新版本添加到底部
  // updateMode: 'overwrite', // 完全覆盖现有内容
  
  keepHistory: true, // 保留历史版本
}
```

**使用场景:**
- `prepend`: 标准模式，符合常规 Changelog 习惯（最新版本在上）
- `append`: 适合需要按时间顺序阅读的场景
- `overwrite`: 只关注当前版本的 Changelog

---

### 2. Changelog 验证功能

新增 `validate` 命令来验证 Changelog 文件格式是否正确：

```bash
# 验证 CHANGELOG.md
ld-changelog validate

# 验证指定文件
ld-changelog validate HISTORY.md

# 严格模式（警告视为错误）
ld-changelog validate --strict

# JSON 输出
ld-changelog validate --json
```

**验证内容:**
- ✅ 版本号格式（SemVer）
- ✅ 日期格式
- ✅ 重复版本检查
- ✅ 文档结构完整性

---

### 3. 提交消息规范检查

新增 `lint` 命令检查提交消息是否符合 Conventional Commits 规范：

```bash
# 检查所有提交
ld-changelog lint

# 检查版本范围
ld-changelog lint --from v1.0.0 --to HEAD

# 严格模式
ld-changelog lint --strict

# 自定义规则
ld-changelog lint --max-subject-length 80 --require-scope
```

**检查项:**
- ✅ 提交类型是否有效
- ✅ 格式是否符合 `type(scope): subject`
- ✅ 主题长度是否合理
- ✅ 是否包含 Breaking Changes
- ✅ 统计分析和建议

**输出示例:**
```
统计项        数量
总提交数      45
有效提交      42
无效提交      3

提交类型分布:
feat        15
fix         12
docs        8
chore       7

❌ 发现 3 个错误:
  • abc123 提交消息格式不符合 Conventional Commits 规范
    Subject: Update readme
    建议: type(scope): subject
```

---

### 4. 预览功能

新增 `preview` 命令在生成前预览 Changelog 内容：

```bash
# 预览即将生成的内容
ld-changelog preview

# 预览特定版本
ld-changelog preview --version 2.0.0 --from v1.0.0

# 显示统计信息
ld-changelog preview --stats

# 纯文本输出（无颜色）
ld-changelog preview --no-color
```

**功能特点:**
- 🎨 语法高亮显示
- 📊 可选统计信息
- 👀 零风险预览（不写入文件）

---

### 5. 版本对比功能

新增 `diff` 命令对比两个版本之间的差异：

```bash
# 对比两个版本
ld-changelog diff v1.0.0 v2.0.0

# 详细模式（显示具体提交）
ld-changelog diff v1.0.0 v2.0.0 --detailed

# 表格格式输出
ld-changelog diff v1.0.0 v2.0.0 --format table

# JSON 输出
ld-changelog diff v1.0.0 v2.0.0 --format json
```

**对比内容:**
- 📈 新增/删除的提交数
- 👥 新贡献者
- 📊 各类型提交变化
- 🔍 详细提交列表（可选）

**输出示例:**
```
📊 版本对比: v1.0.0 → v2.0.0

概览:
  + 23 个新提交
  + 3 位新贡献者

提交类型变化:
  feat: +8
  fix: +5
  docs: +3
```

---

### 6. 更多自定义选项

#### 6.1 Scope 过滤

只生成特定 scope 的 Changelog：

```javascript
module.exports = {
  scopeFilter: ['api', 'ui', 'core'], // 只包含这些 scope
}
```

```bash
ld-changelog generate --scope-filter api,ui
```

#### 6.2 依赖更新分类

自动识别并单独显示依赖更新：

```javascript
module.exports = {
  separateDependencies: true,
}
```

生成的 Changelog 会有专门的"📦 依赖更新"章节，包含：
- chore(deps): bump xxx
- build(deps): update yyy

#### 6.3 安全修复标记

自动识别并高亮安全相关的修复：

```javascript
module.exports = {
  highlightSecurity: true,
}
```

自动检测关键词：`security`, `vulnerability`, `CVE`, `XSS`, `CSRF`, `injection` 等

生成的 Changelog 中安全修复会被标记为：
```markdown
### 🔒 安全修复
- fix(auth): 修复 XSS 漏洞 🛡️
- fix(api): 修复 SQL 注入问题 🛡️
```

#### 6.4 按作者分组

按贡献者分组显示提交：

```javascript
module.exports = {
  groupByAuthor: true,
}
```

---

---

### 7. Monorepo 支持

为 monorepo 项目中的每个包生成独立 changelog：

为 monorepo 项目中的每个包生成独立 changelog：

```javascript
module.exports = {
  monorepo: {
    enabled: true,
    packages: ['packages/*'],
    tagPrefix: '@scope/{{package}}@',
    mergeChangelogs: false,
    outputPattern: '{{package}}/CHANGELOG.md',
  },
}
```

---

### 8. GitHub Releases 集成

自动创建 GitHub Release：

```bash
# 发布并创建 GitHub Release
ld-changelog release --github-release

# 上传资源文件
ld-changelog release --github-release --assets dist/*.zip

# 标记为预发布
ld-changelog release --github-release --prerelease

# 创建草稿
ld-changelog release --github-release --draft
```

**配置示例：**
```bash
# 设置 GitHub Token
export GITHUB_TOKEN=your_token_here

# 或在配置中指定
module.exports = {
  github: {
    token: process.env.GITHUB_TOKEN,
    owner: 'your-org',
    repo: 'your-repo',
  },
}
```

---

### 9. 交互式模式

交互式选择要包含的提交：

```bash
# 交互式选择提交类型和具体提交
ld-changelog generate --interactive

# 编辑生成的 Changelog
ld-changelog generate --edit

# 组合使用
ld-changelog generate --interactive --edit
```

**交互流程：**
1. 选择要包含的提交类型（feat, fix, 等）
2. （可选）进一步选择具体的提交
3. （可选）编辑生成的 Changelog 文本
4. 确认并生成

---

### 10. 插件系统

支持自定义插件扩展功能：

```javascript
import { createPlugin } from '@ldesign/changelog'

// 自定义插件
const myPlugin = createPlugin(
  'my-custom-plugin',
  {
    // 解析前钩子
    beforeParse: (commits) => {
      console.log(`处理 ${commits.length} 个提交`)
      return commits
    },
    
    // 解析后钩子
    afterParse: (commits) => {
      return commits.map(c => ({
        ...c,
        subject: `[Custom] ${c.subject}`,
      }))
    },
    
    // 生成后钩子
    afterGenerate: (content) => {
      console.log(`生成了 ${content.sections.length} 个章节`)
      return content
    },
    
    // 格式化后钩子
    afterFormat: (formatted, content) => {
      return formatted + '\n\n<!-- Generated by my-plugin -->'
    },
  },
  {
    version: '1.0.0',
    description: '我的自定义插件',
  }
)

// 使用插件
const { createPluginManager } = require('@ldesign/changelog')
const pluginManager = createPluginManager()
pluginManager.register(myPlugin)
```

**内置插件：**

```javascript
import {
  emojiEnhancerPlugin,        // Emoji 增强
  deduplicatePlugin,          // 去重
  sortByDatePlugin,           // 按日期排序
  breakingChangesHighlightPlugin, // Breaking Changes 高亮
  statsEnhancerPlugin,        // 统计增强
} from '@ldesign/changelog'

const pluginManager = createPluginManager()
pluginManager.register(emojiEnhancerPlugin)
pluginManager.register(statsEnhancerPlugin)
```

**可用钩子：**
- `beforeParse`: 解析前（GitCommit[] → GitCommit[])
- `afterParse`: 解析后（ChangelogCommit[] → ChangelogCommit[])
- `beforeGenerate`: 生成前
- `afterGenerate`: 生成后
- `beforeFormat`: 格式化前
- `afterFormat`: 格式化后
- `beforeWrite`: 写入前
- `afterWrite`: 写入后

---

## 📝 配置示例

完整的配置示例，展示所有新功能：

```javascript
// changelog.config.js
module.exports = {
  // 基础配置
  output: 'CHANGELOG.md',
  format: 'markdown',
  
  // 更新模式
  updateMode: 'prepend',
  keepHistory: true,
  
  // 提交类型配置
  types: [
    { type: 'feat', section: '✨ 新功能', priority: 1 },
    { type: 'fix', section: '🐛 Bug 修复', priority: 2 },
    { type: 'security', section: '🔒 安全修复', priority: 3 },
    { type: 'perf', section: '⚡ 性能优化', priority: 4 },
    { type: 'refactor', section: '♻️ 代码重构', priority: 5 },
    { type: 'docs', section: '📝 文档更新', priority: 6 },
    { type: 'deps', section: '📦 依赖更新', priority: 7, hidden: false },
    { type: 'style', section: '💄 代码样式', priority: 8 },
    { type: 'test', section: '✅ 测试', priority: 9 },
    { type: 'build', section: '📦 构建系统', priority: 10 },
    { type: 'ci', section: '👷 CI/CD', priority: 11 },
    { type: 'chore', section: '🔧 其他', priority: 12, hidden: true },
  ],
  
  // 高级过滤
  scopeFilter: [], // 为空则包含所有
  
  // 分类显示
  groupByType: true,
  groupByAuthor: false,
  separateDependencies: true,
  highlightSecurity: true,
  
  // 包含内容
  includeAuthors: true,
  includePRLinks: true,
  includeCommitHash: true,
  
  // 日期格式
  dateFormat: 'YYYY-MM-DD',
  language: 'zh-CN',
  
  // 仓库信息
  repositoryUrl: 'https://github.com/username/repo',
  
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

---

## 🎯 使用建议

### CI/CD 集成

在 CI/CD 流程中集成新功能：

```yaml
# .github/workflows/release.yml
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
      
      # 验证提交消息
      - name: Lint commits
        run: npx ld-changelog lint --strict
      
      # 预览 Changelog
      - name: Preview Changelog
        run: npx ld-changelog preview --stats
      
      # 生成 Changelog
      - name: Generate Changelog
        run: npx ld-changelog generate --version ${{ github.ref_name }}
      
      # 验证生成的 Changelog
      - name: Validate Changelog
        run: npx ld-changelog validate --strict
      
      # 创建 Release（未来功能）
      # - name: Create GitHub Release
      #   run: npx ld-changelog release --github-release
```

### 本地开发流程

推荐的开发工作流：

```bash
# 1. 开发过程中定期检查提交规范
ld-changelog lint

# 2. 发布前预览 Changelog
ld-changelog preview --stats

# 3. 对比版本差异
ld-changelog diff v1.0.0 HEAD --detailed

# 4. 生成 Changelog
ld-changelog generate --version 1.1.0

# 5. 验证生成结果
ld-changelog validate --strict

# 6. 发布
ld-changelog release --tag --push
```

---

## 🐛 已知问题

目前没有已知严重问题。如发现 bug，请提交 Issue。

---

## 📚 文档链接

- [主文档](./README.md)
- [API 文档](./docs/api.md)
- [配置指南](./docs/configuration.md)
- [最佳实践](./docs/best-practices.md)

---

**Made with ❤️ by LDesign Team**
