# 🎉 新功能说明

本文档介绍 @ldesign/changelog 最新添加的功能特性。

## 📋 目录

- [多平台 Release 支持](#多平台-release-支持)
- [Webhook 通知集成](#webhook-通知集成)
- [版本智能建议](#版本智能建议)

---

## 多平台 Release 支持

### 概述

除了原有的 GitHub Release 支持，现在还支持 GitLab 和 Gitee 平台的自动发布功能。

### 支持的平台

- **GitHub** - 原有支持
- **GitLab** - 新增
- **Gitee** - 新增

### 使用方法

#### 1. 自动检测平台

系统会自动根据 Git 仓库的 remote URL 检测平台类型：

```typescript
import { createReleaseManager } from '@ldesign/changelog'

// 自动检测并创建合适的 Release Manager
const manager = await createReleaseManager({
  token: process.env.RELEASE_TOKEN,
})

// 创建 Release
await manager.createRelease('1.0.0', changelogContent)
```

#### 2. 手动指定平台

也可以手动创建特定平台的 Release Manager：

```typescript
import {
  createGitHubReleaseManager,
  createGitLabReleaseManager,
  createGiteeReleaseManager,
} from '@ldesign/changelog'

// GitHub
const githubManager = createGitHubReleaseManager({
  token: process.env.GITHUB_TOKEN,
  owner: 'username',
  repo: 'repository',
})

// GitLab
const gitlabManager = createGitLabReleaseManager({
  token: process.env.GITLAB_TOKEN,
  owner: 'username',
  repo: 'repository',
  baseUrl: 'https://gitlab.com/api/v4', // 可选，支持私有实例
})

// Gitee
const giteeManager = createGiteeReleaseManager({
  token: process.env.GITEE_TOKEN,
  owner: 'username',
  repo: 'repository',
})
```

### 环境变量

为不同平台设置对应的 Token：

```bash
# GitHub
export GITHUB_TOKEN=your_github_token

# GitLab
export GITLAB_TOKEN=your_gitlab_token

# Gitee
export GITEE_TOKEN=your_gitee_token
```

### 完整示例

```typescript
import { createChangelogGenerator, createReleaseManager } from '@ldesign/changelog'

async function releaseNewVersion() {
  // 生成 Changelog
  const generator = createChangelogGenerator()
  const changelog = await generator.generate('1.0.0')

  // 创建 Release (自动检测平台)
  const manager = await createReleaseManager()
  await manager.createRelease('1.0.0', changelog, {
    prerelease: false,
    draft: false,
    assets: ['dist/bundle.zip'], // 可选的附件
  })

  console.log('✅ Release 创建成功!')
}
```

---

## Webhook 通知集成

### 概述

支持在关键事件（生成、发布、错误）时自动发送通知到 Slack、Discord、Teams 等平台。

### 支持的平台

- **Slack**
- **Discord**
- **Microsoft Teams**
- **自定义 Webhook**

### 使用方法

#### 1. 基本配置

```typescript
import { createWebhookNotifier } from '@ldesign/changelog'

const notifier = createWebhookNotifier({
  enabled: true,
  
  // Slack 配置
  slack: {
    url: process.env.SLACK_WEBHOOK_URL,
    channel: '#releases',
    username: 'Release Bot',
    iconEmoji: ':rocket:',
    events: ['release', 'error'], // 仅发送这些事件
  },

  // Discord 配置
  discord: {
    url: process.env.DISCORD_WEBHOOK_URL,
    username: 'Release Bot',
    avatarUrl: 'https://example.com/avatar.png',
  },

  // Teams 配置
  teams: {
    url: process.env.TEAMS_WEBHOOK_URL,
    themeColor: '0076D7',
  },
})

// 发送通知
await notifier.notify({
  event: 'release',
  version: '1.0.0',
  changelog: changelogContent,
})
```

#### 2. 集成到发布流程

```typescript
import {
  createChangelogGenerator,
  createReleaseManager,
  createWebhookNotifier,
} from '@ldesign/changelog'

async function releaseWithNotifications() {
  const notifier = createWebhookNotifier({
    slack: {
      url: process.env.SLACK_WEBHOOK_URL,
    },
  })

  try {
    // 生成 Changelog
    const generator = createChangelogGenerator()
    const changelog = await generator.generate('1.0.0')

    await notifier.notify({
      event: 'generate',
      version: '1.0.0',
      changelog,
    })

    // 创建 Release
    const manager = await createReleaseManager()
    await manager.createRelease('1.0.0', changelog)

    // 发送成功通知
    await notifier.notify({
      event: 'release',
      version: '1.0.0',
      changelog,
    })
  } catch (error) {
    // 发送错误通知
    await notifier.notify({
      event: 'error',
      error: error.message,
    })
    throw error
  }
}
```

#### 3. 自定义 Webhook

```typescript
const notifier = createWebhookNotifier({
  custom: [
    {
      url: 'https://your-webhook.com/endpoint',
      events: ['release'],
      headers: {
        'Authorization': 'Bearer your-token',
        'X-Custom-Header': 'value',
      },
      timeout: 10000,
      retries: 3,
    },
  ],
})
```

### 通知消息格式

#### Slack

```json
{
  "text": "🎉 新版本发布: *1.0.0*",
  "attachments": [
    {
      "color": "good",
      "fields": [
        { "title": "版本号", "value": "1.0.0", "short": true },
        { "title": "提交数", "value": "42", "short": true },
        { "title": "贡献者", "value": "5", "short": true }
      ]
    }
  ]
}
```

#### Discord

```json
{
  "content": "🎉 **新版本发布: 1.0.0**",
  "embeds": [
    {
      "title": "Version 1.0.0",
      "color": 3066993,
      "fields": [
        { "name": "提交数", "value": "42", "inline": true },
        { "name": "贡献者", "value": "5", "inline": true }
      ]
    }
  ]
}
```

---

## 版本智能建议

### 概述

基于提交内容自动分析并推荐下一个合适的版本号，支持语义化版本(SemVer)。

### 功能特性

- ✅ 自动检测破坏性变更 (Breaking Changes)
- ✅ 统计新功能、修复、其他变更数量
- ✅ 检测提交消息中的版本关键词
- ✅ 提供置信度评分 (0-1)
- ✅ 生成多个版本建议供选择

### 使用方法

#### 1. 基本用法

```typescript
import { analyzeVersion } from '@ldesign/changelog'
import { getGitCommits } from '@ldesign/changelog/utils'

// 获取提交
const commits = await getGitCommits('v0.9.0', 'HEAD')

// 解析提交
const parser = new CommitParser()
const parsedCommits = parser.parse(commits)

// 分析版本
const result = await analyzeVersion('1.0.0', parsedCommits)

console.log('当前版本:', result.currentVersion)
console.log('推荐版本:', result.recommended.version)
console.log('版本类型:', result.recommended.type)
console.log('置信度:', result.recommended.confidence)
console.log('推荐原因:', result.recommended.reason)
console.log('\n摘要:\n', result.summary)
```

#### 2. 高级配置

```typescript
import { VersionAnalyzer } from '@ldesign/changelog'

const analyzer = new VersionAnalyzer({
  currentVersion: '1.0.0',
  detectVersionKeywords: true,    // 检测关键词
  considerCommitCount: true,       // 考虑提交数量
  confidenceThreshold: 0.7,        // 置信度阈值
})

const result = analyzer.analyze(parsedCommits)

// 查看所有建议
for (const suggestion of result.suggestions) {
  console.log(`${suggestion.version} (${suggestion.type}): ${suggestion.reason}`)
  console.log(`  置信度: ${(suggestion.confidence * 100).toFixed(1)}%`)
}
```

#### 3. 集成到 Release 流程

```typescript
async function smartRelease() {
  // 获取当前版本
  const packageJson = JSON.parse(await fs.readFile('package.json', 'utf-8'))
  const currentVersion = packageJson.version

  // 获取和解析提交
  const commits = await getGitCommits()
  const parser = new CommitParser()
  const parsedCommits = parser.parse(commits)

  // 分析版本
  const analysis = await analyzeVersion(currentVersion, parsedCommits)

  console.log('版本分析结果:')
  console.log(analysis.summary)

  // 使用推荐的版本
  const nextVersion = analysis.recommended.version
  
  // 生成 Changelog
  const generator = createChangelogGenerator()
  const changelog = await generator.generate(nextVersion)

  // 创建 Release
  const manager = await createReleaseManager()
  await manager.createRelease(nextVersion, changelog)

  console.log(`✅ 发布 ${nextVersion} 成功!`)
}
```

### 版本建议规则

#### Major 版本 (x.0.0)

**触发条件:**
- 包含破坏性变更 (BREAKING CHANGE)
- 提交消息包含 "major" 或 "breaking" 关键词

**置信度:**
- 有破坏性变更: 95%
- 仅有关键词: 70%

#### Minor 版本 (0.x.0)

**触发条件:**
- 包含新功能 (feat)
- 提交消息包含 "minor"、"feature" 或 "新功能" 关键词

**置信度:**
- 根据新功能占比计算: 60-90%
- 仅有关键词: 60%
- 如果有破坏性变更，置信度降低 50%

#### Patch 版本 (0.0.x)

**触发条件:**
- 包含问题修复 (fix)
- 包含任意提交

**置信度:**
- 根据修复占比计算: 50-85%
- 如果有破坏性变更或新功能，置信度降低 70%

### 输出示例

```
当前版本: 1.0.0
推荐版本: 1.1.0 (minor)
置信度: 85.5%

分析结果:
- 8 个新功能
- 3 个问题修复
- 2 个其他变更

添加了 8 个新功能
```

---

## 配置文件扩展

在 `changelog.config.js` 中添加新功能的配置：

```javascript
module.exports = {
  // ... 原有配置 ...

  // Release 管理器配置
  release: {
    // 平台类型: 'github' | 'gitlab' | 'gitee' (可选，自动检测)
    platform: 'github',
    
    // 自动创建 Release
    autoRelease: true,
    
    // 预发布
    prerelease: false,
    
    // 草稿
    draft: false,
    
    // 附件文件
    assets: ['dist/*.zip', 'build/*.tar.gz'],
  },

  // 通知配置
  notifications: {
    enabled: true,
    
    slack: {
      url: process.env.SLACK_WEBHOOK_URL,
      channel: '#releases',
      username: 'Changelog Bot',
      events: ['release', 'error'],
    },
    
    discord: {
      url: process.env.DISCORD_WEBHOOK_URL,
      username: 'Changelog Bot',
    },
    
    teams: {
      url: process.env.TEAMS_WEBHOOK_URL,
    },
  },

  // 版本分析配置
  versionAnalysis: {
    // 启用智能版本建议
    enabled: true,
    
    // 检测关键词
    detectKeywords: true,
    
    // 考虑提交数量
    considerCommitCount: true,
    
    // 置信度阈值
    confidenceThreshold: 0.7,
  },
}
```

---

## CLI 命令扩展

### 版本建议

```bash
# 分析并显示版本建议
npx ldesign-changelog suggest-version

# 指定版本范围
npx ldesign-changelog suggest-version --from v1.0.0 --to HEAD

# 输出 JSON 格式
npx ldesign-changelog suggest-version --format json
```

### 带通知的发布

```bash
# 发布并发送通知
npx ldesign-changelog release --type minor --notify

# 指定通知平台
npx ldesign-changelog release --notify slack,discord

# 测试通知（不实际发布）
npx ldesign-changelog test-notification --platform slack
```

---

## 最佳实践

### 1. 自动化发布流程

```bash
#!/bin/bash
# release.sh

# 1. 运行测试
npm test

# 2. 获取版本建议
VERSION=$(npx ldesign-changelog suggest-version --format json | jq -r '.recommended.version')

echo "推荐版本: $VERSION"

# 3. 生成 Changelog 并发布
npx ldesign-changelog release \
  --version $VERSION \
  --tag \
  --push \
  --notify slack,discord

echo "发布完成!"
```

### 2. CI/CD 集成

#### GitHub Actions

```yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (leave empty for auto-suggest)'
        required: false

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

      - name: Suggest version
        if: ${{ !github.event.inputs.version }}
        id: version
        run: |
          VERSION=$(npx ldesign-changelog suggest-version --format json | jq -r '.recommended.version')
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: |
          VERSION=${{ github.event.inputs.version || steps.version.outputs.version }}
          npx ldesign-changelog release \
            --version $VERSION \
            --tag \
            --push \
            --notify slack
```

### 3. 多平台同步发布

```typescript
import {
  createGitHubReleaseManager,
  createGitLabReleaseManager,
  createGiteeReleaseManager,
  createWebhookNotifier,
} from '@ldesign/changelog'

async function multiPlatformRelease(version: string, changelog: ChangelogContent) {
  const notifier = createWebhookNotifier({
    slack: { url: process.env.SLACK_WEBHOOK_URL },
  })

  try {
    // 同时发布到三个平台
    await Promise.all([
      createGitHubReleaseManager().createRelease(version, changelog),
      createGitLabReleaseManager().createRelease(version, changelog),
      createGiteeReleaseManager().createRelease(version, changelog),
    ])

    await notifier.notify({
      event: 'release',
      version,
      changelog,
      metadata: { platforms: ['GitHub', 'GitLab', 'Gitee'] },
    })

    console.log('✅ 多平台发布成功!')
  } catch (error) {
    await notifier.notify({
      event: 'error',
      error: error.message,
    })
    throw error
  }
}
```

---

## 迁移指南

如果你正在从旧版本升级，以下是需要注意的事项：

### 破坏性变更

无破坏性变更，所有新功能都是向后兼容的。

### 新增依赖

无新增外部依赖。

### 推荐升级步骤

1. 更新包版本
```bash
pnpm add -D @ldesign/changelog@latest
```

2. 更新配置文件（可选）
```bash
npx ldesign-changelog init --force
```

3. 设置环境变量（如需使用新功能）
```bash
export GITLAB_TOKEN=your_token
export GITEE_TOKEN=your_token
export SLACK_WEBHOOK_URL=your_webhook
```

---

## 常见问题

### Q: 如何在私有 GitLab 实例上使用？

A: 在配置中指定 `baseUrl`：

```typescript
createGitLabReleaseManager({
  token: process.env.GITLAB_TOKEN,
  baseUrl: 'https://gitlab.your-company.com/api/v4',
  owner: 'your-group',
  repo: 'your-project',
})
```

### Q: Webhook 通知失败怎么办？

A: 检查以下几点：
1. Webhook URL 是否正确
2. 网络连接是否正常
3. 查看错误日志了解详细信息
4. 可以增加重试次数：`retries: 3`

### Q: 版本建议不准确？

A: 可以调整配置参数：
- 降低置信度阈值: `confidenceThreshold: 0.6`
- 禁用关键词检测: `detectVersionKeywords: false`
- 手动审核建议后再使用

### Q: 支持哪些 Webhook 平台？

A: 目前支持：
- Slack (完整支持)
- Discord (完整支持)
- Microsoft Teams (MessageCard 格式)
- 自定义 Webhook (通用 JSON 格式)

---

## 反馈与支持

如果你在使用新功能时遇到问题或有改进建议，欢迎：

- 提交 Issue: https://github.com/ldesign/tools/changelog/issues
- 发起 Discussion: https://github.com/ldesign/tools/changelog/discussions
- 贡献代码: https://github.com/ldesign/tools/changelog/pulls

---

Made with ❤️ by [LDesign Team](https://github.com/ldesign)
