# 核心概念

## Conventional Commits

@ldesign/changelog 基于 [Conventional Commits](https://www.conventionalcommits.org/) 规范解析 Git 提交历史。

### 提交格式

```
<type>(<scope>): <subject>

[body]

[footer]
```

- **type**: 提交类型 (feat, fix, docs, etc.)
- **scope**: 影响范围 (可选)
- **subject**: 简短描述
- **body**: 详细描述 (可选)
- **footer**: 关联 issue、breaking changes (可选)

### 示例

```
feat(auth): add OAuth2 support

Implement OAuth2 authentication flow using passport

Closes #123
BREAKING CHANGE: removed basic auth support
```

## 版本管理

### 语义化版本

遵循 [Semantic Versioning](https://semver.org/) 规范:

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向下兼容的功能新增
- **PATCH**: 向下兼容的问题修复

### 版本映射

不同的提交类型会影响版本号:

- `feat` → MINOR 版本升级
- `fix` → PATCH 版本升级
- `BREAKING CHANGE` → MAJOR 版本升级
- 其他类型 → PATCH 版本升级

## Changelog 结构

### 基本结构

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### ✨ Features
- feat(api): add user authentication

### 🐛 Bug Fixes
- fix(ui): resolve button alignment issue

## [1.0.0] - 2024-01-01
...
```

### 分组规则

Commits 按以下规则分组:

1. **按版本** - 每个版本独立一节
2. **按类型** - 同一版本内按 type 分组
3. **按 scope** - 可选,同一类型内按 scope 分组
4. **按作者** - 可选,通过配置启用

## 配置系统

### 配置文件

支持多种配置文件格式:

- `changelog.config.js` (推荐)
- `changelog.config.mjs`
- `changelog.config.cjs`
- `changelog.config.json`
- `package.json` 中的 `changelog` 字段

### 配置优先级

1. 命令行参数
2. 配置文件
3. 默认配置

### 配置合并

配置项支持继承和覆盖:

```js path=null start=null
// 继承默认配置
export default {
  types: {
    // 覆盖 feat 配置
    feat: { title: '🎉 New Features', bump: 'minor' },
    // 新增自定义类型
    security: { title: '🔒 Security', bump: 'patch' },
  },
}
```

## 插件机制

### 插件架构

插件通过钩子 (hooks) 扩展功能:

```js path=null start=null
export default {
  name: 'my-plugin',
  hooks: {
    'commits:parse': (commits) => {
      // 处理解析后的 commits
      return commits
    },
    'changelog:format': (content) => {
      // 处理格式化后的内容
      return content
    },
  },
}
```

### 生命周期钩子

1. **commits:parse** - 解析 commits 后
2. **changelog:generate** - 生成 changelog 前
3. **changelog:format** - 格式化内容后
4. **changelog:write** - 写入文件前

### 内置插件

- `emojiEnhancerPlugin` - 添加 emoji
- `deduplicatePlugin` - 去重
- `sortByDatePlugin` - 按日期排序
- `breakingChangesHighlightPlugin` - 高亮 breaking changes
- `linkEnhancerPlugin` - 增强链接
- `statsEnhancerPlugin` - 添加统计信息

## Git 工作流

### Tag 管理

changelog 生成依赖 Git tags:

```bash
# 创建 tag
git tag v1.0.0

# 推送 tag
git push --tags

# 生成 changelog (从最新 tag 到 HEAD)
ld-changelog generate
```

### 版本范围

支持多种版本范围指定方式:

```bash
# 从指定 tag 到 HEAD
ld-changelog generate --from v1.0.0

# 两个 tag 之间
ld-changelog generate --from v1.0.0 --to v2.0.0

# 从第一个 commit 到 HEAD
ld-changelog generate --from $(git rev-list --max-parents=0 HEAD)
```

## 下一步

- [基础功能](/guide/features/basic) - 了解基础功能
- [配置参考](/reference/config) - 查看完整配置
- [插件 API](/plugins/api) - 开发自定义插件
