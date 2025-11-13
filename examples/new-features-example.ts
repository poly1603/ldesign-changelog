/**
 * 新功能使用示例
 * 
 * 本文件演示如何使用 @ldesign/changelog 的新功能
 */

import {
  createChangelogGenerator,
  createReleaseManager,
  createWebhookNotifier,
  analyzeVersion,
  getGitCommits,
  CommitParser,
} from '../src/index.js'

/**
 * 示例 1: 多平台 Release 发布
 */
async function example1_MultiPlatformRelease() {
  console.log('\n=== 示例 1: 多平台 Release 发布 ===\n')

  // 生成 Changelog
  const generator = createChangelogGenerator({
    output: 'CHANGELOG.md',
    format: 'markdown',
  })

  const changelog = await generator.generate('1.0.0')

  // 自动检测平台并创建 Release
  const manager = await createReleaseManager({
    // Token 会自动从环境变量读取:
    // GITHUB_TOKEN, GITLAB_TOKEN, 或 GITEE_TOKEN
  })

  await manager.createRelease('1.0.0', changelog, {
    prerelease: false,
    draft: false,
    assets: ['dist/bundle.zip'],
  })

  console.log('✅ Release 创建成功!')
}

/**
 * 示例 2: Webhook 通知集成
 */
async function example2_WebhookNotification() {
  console.log('\n=== 示例 2: Webhook 通知集成 ===\n')

  // 创建通知器
  const notifier = createWebhookNotifier({
    enabled: true,
    
    // Slack 配置
    slack: {
      url: process.env.SLACK_WEBHOOK_URL || '',
      channel: '#releases',
      username: 'Release Bot',
      iconEmoji: ':rocket:',
      events: ['release', 'error'],
    },
    
    // Discord 配置
    discord: {
      url: process.env.DISCORD_WEBHOOK_URL || '',
      username: 'Changelog Bot',
    },
  })

  // 生成 Changelog
  const generator = createChangelogGenerator()
  const changelog = await generator.generate('1.0.0')

  // 发送生成完成通知
  await notifier.notify({
    event: 'generate',
    version: '1.0.0',
    changelog,
  })

  // 创建 Release
  const manager = await createReleaseManager()
  await manager.createRelease('1.0.0', changelog)

  // 发送发布成功通知
  await notifier.notify({
    event: 'release',
    version: '1.0.0',
    changelog,
  })

  console.log('✅ 发布并通知成功!')
}

/**
 * 示例 3: 版本智能建议
 */
async function example3_VersionSuggestion() {
  console.log('\n=== 示例 3: 版本智能建议 ===\n')

  // 获取提交
  const commits = await getGitCommits('v0.9.0', 'HEAD')

  // 解析提交
  const parser = new CommitParser()
  const parsedCommits = parser.parse(commits)

  // 分析版本
  const result = await analyzeVersion('1.0.0', parsedCommits)

  console.log('📊 版本分析结果:')
  console.log(result.summary)
  console.log('\n所有建议:')
  
  for (const suggestion of result.suggestions) {
    console.log(`  ${suggestion.version} (${suggestion.type})`)
    console.log(`  - 置信度: ${(suggestion.confidence * 100).toFixed(1)}%`)
    console.log(`  - 原因: ${suggestion.reason}`)
    console.log()
  }

  console.log(`✅ 推荐版本: ${result.recommended.version}`)
}

/**
 * 示例 4: 完整的智能发布流程
 */
async function example4_SmartReleaseWorkflow() {
  console.log('\n=== 示例 4: 完整的智能发布流程 ===\n')

  // 1. 获取当前版本（从 package.json）
  const packageJson = { version: '1.0.0' } // 实际应该从文件读取
  const currentVersion = packageJson.version

  // 2. 获取和解析提交
  const commits = await getGitCommits()
  const parser = new CommitParser()
  const parsedCommits = parser.parse(commits)

  // 3. 智能分析版本
  console.log('🔍 正在分析版本...')
  const analysis = await analyzeVersion(currentVersion, parsedCommits)
  const nextVersion = analysis.recommended.version

  console.log(`📈 推荐版本: ${nextVersion} (置信度: ${(analysis.recommended.confidence * 100).toFixed(1)}%)`)
  console.log(`📝 原因: ${analysis.recommended.reason}\n`)

  // 4. 生成 Changelog
  console.log('📝 正在生成 Changelog...')
  const generator = createChangelogGenerator()
  const changelog = await generator.generate(nextVersion)

  // 5. 创建通知器
  const notifier = createWebhookNotifier({
    slack: {
      url: process.env.SLACK_WEBHOOK_URL || '',
    },
  })

  try {
    // 6. 创建 Release
    console.log('🚀 正在创建 Release...')
    const manager = await createReleaseManager()
    await manager.createRelease(nextVersion, changelog)

    // 7. 发送成功通知
    await notifier.notify({
      event: 'release',
      version: nextVersion,
      changelog,
    })

    console.log(`\n✅ 成功发布版本 ${nextVersion}!`)
  } catch (error: any) {
    // 8. 发送错误通知
    await notifier.notify({
      event: 'error',
      error: error.message,
    })

    console.error('❌ 发布失败:', error.message)
    throw error
  }
}

/**
 * 示例 5: 多平台同步发布
 */
async function example5_MultiPlatformSync() {
  console.log('\n=== 示例 5: 多平台同步发布 ===\n')

  // 生成 Changelog
  const generator = createChangelogGenerator()
  const changelog = await generator.generate('1.0.0')

  // 创建多个平台的 Release Manager
  const platforms = [
    { name: 'GitHub', manager: await createReleaseManager({ baseUrl: 'https://api.github.com' }) },
    { name: 'GitLab', manager: await createReleaseManager({ baseUrl: 'https://gitlab.com/api/v4' }) },
    { name: 'Gitee', manager: await createReleaseManager({ baseUrl: 'https://gitee.com/api/v5' }) },
  ]

  // 同时发布到所有平台
  console.log('🚀 正在同步发布到多个平台...')
  
  const results = await Promise.allSettled(
    platforms.map(({ name, manager }) => 
      manager.createRelease('1.0.0', changelog)
        .then(() => ({ name, success: true }))
        .catch((error) => ({ name, success: false, error: error.message }))
    )
  )

  // 输出结果
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { name, success, error } = result.value as any
      if (success) {
        console.log(`✅ ${name}: 发布成功`)
      } else {
        console.log(`❌ ${name}: 发布失败 - ${error}`)
      }
    }
  }

  // 发送通知
  const notifier = createWebhookNotifier({
    slack: { url: process.env.SLACK_WEBHOOK_URL || '' },
  })

  await notifier.notify({
    event: 'release',
    version: '1.0.0',
    changelog,
    metadata: {
      platforms: platforms.map(p => p.name),
    },
  })

  console.log('\n✅ 多平台发布完成!')
}

/**
 * 主函数 - 运行示例
 */
async function main() {
  console.log('🎉 @ldesign/changelog 新功能示例\n')

  try {
    // 运行所有示例（实际使用时只运行需要的示例）
    // await example1_MultiPlatformRelease()
    // await example2_WebhookNotification()
    await example3_VersionSuggestion()
    // await example4_SmartReleaseWorkflow()
    // await example5_MultiPlatformSync()

    console.log('\n\n🎊 所有示例运行完成!')
  } catch (error: any) {
    console.error('\n❌ 示例运行失败:', error.message)
    process.exit(1)
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export {
  example1_MultiPlatformRelease,
  example2_WebhookNotification,
  example3_VersionSuggestion,
  example4_SmartReleaseWorkflow,
  example5_MultiPlatformSync,
}
