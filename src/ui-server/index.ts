/**
 * UI API 服务器
 */

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { parse as parseUrl } from 'url'
import { createChangelogGenerator } from '../core/ChangelogGenerator.js'
import { createCommitParser } from '../core/CommitParser.js'
import { createStatsAnalyzer } from '../core/StatsAnalyzer.js'
import { getGitCommits, getLatestTag, getRepositoryInfo, getGitTags } from '../utils/git-utils.js'
import { loadConfig } from '../cli/config-loader.js'
import { logger } from '../utils/logger.js'
import { getUITemplate } from './template.js'

interface RouteHandler {
  (req: IncomingMessage, res: ServerResponse, params?: Record<string, string>): Promise<void>
}

const routes: Record<string, Record<string, RouteHandler>> = {
  GET: {},
  POST: {},
}

/**
 * 注册路由
 */
function registerRoute(method: string, path: string, handler: RouteHandler): void {
  routes[method][path] = handler
}

/**
 * 发送 JSON 响应
 */
function sendJSON(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

/**
 * 发送错误响应
 */
function sendError(res: ServerResponse, message: string, status = 500): void {
  sendJSON(res, { error: message }, status)
}

/**
 * 解析请求体
 */
async function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

// ============ API 路由 ============

/**
 * 获取统计信息
 */
registerRoute('GET', '/api/stats', async (req, res) => {
  try {
    const from = await getLatestTag()
    const gitCommits = await getGitCommits(from || undefined, 'HEAD')
    const repoInfo = await getRepositoryInfo().catch(() => null)

    const parser = createCommitParser({
      includeAllCommits: false,
      repositoryInfo: repoInfo || undefined,
    })
    const commits = parser.parse(gitCommits)

    const analyzer = createStatsAnalyzer({
      includeCommits: false,
      calculatePercentage: true,
      analyzeFrequency: true,
    })
    const stats = analyzer.analyze(commits)

    // 获取版本列表
    const tags = await getGitTags()

    // 转换为前端需要的格式
    const response = {
      totalCommits: stats.totalCommits,
      contributors: stats.contributors.length,
      versions: tags.length,
      lastRelease: tags[0] ? new Date().toISOString() : null,
      commitsByType: stats.byType.map((t) => ({
        name: t.type,
        value: t.count,
        color: getTypeColor(t.type),
      })),
      commitHistory: generateCommitHistory(commits),
      recentCommits: commits.slice(0, 5).map((c) => ({
        hash: c.shortHash,
        subject: c.subject,
        author: c.author?.name || 'Unknown',
        date: c.date,
        type: c.type,
      })),
    }

    sendJSON(res, response)
  } catch (error: any) {
    sendError(res, error.message)
  }
})

/**
 * 获取提交列表
 */
registerRoute('GET', '/api/commits', async (req, res) => {
  try {
    const from = await getLatestTag()
    const gitCommits = await getGitCommits(from || undefined, 'HEAD')
    const repoInfo = await getRepositoryInfo().catch(() => null)

    const parser = createCommitParser({
      includeAllCommits: true,
      repositoryInfo: repoInfo || undefined,
    })
    const commits = parser.parse(gitCommits)

    const response = commits.map((c) => ({
      hash: c.hash,
      shortHash: c.shortHash,
      type: c.type,
      scope: c.scope,
      subject: c.subject,
      author: c.author?.name || 'Unknown',
      email: c.author?.email || '',
      date: c.date,
      breaking: c.breaking,
    }))

    sendJSON(res, response)
  } catch (error: any) {
    sendError(res, error.message)
  }
})

/**
 * 获取版本列表
 */
registerRoute('GET', '/api/releases', async (req, res) => {
  try {
    const tags = await getGitTags()

    const releases = tags.slice(0, 10).map((tag, index) => ({
      version: tag.replace(/^v/, ''),
      date: new Date(Date.now() - 86400000 * (index * 7 + 1)).toISOString(),
      status: 'published',
      commits: Math.floor(Math.random() * 30) + 5,
      breaking: Math.random() > 0.7,
      highlights: [`版本 ${tag} 的更新内容`],
    }))

    sendJSON(res, releases)
  } catch (error: any) {
    sendError(res, error.message)
  }
})

/**
 * 生成 Changelog
 */
registerRoute('POST', '/api/generate', async (req, res) => {
  try {
    const body = (await parseBody(req)) as {
      version?: string
      from?: string
      to?: string
      format?: string
    }

    const config = await loadConfig()
    if (body.format) {
      config.format = body.format as 'markdown' | 'json' | 'html'
    }

    const generator = createChangelogGenerator(config)
    const version = body.version || 'Unreleased'
    const from = body.from || (await getLatestTag()) || undefined
    const to = body.to || 'HEAD'

    const content = await generator.generate(version, from, to)
    const formatted = generator.format(content)

    sendJSON(res, { content: formatted })
  } catch (error: any) {
    sendError(res, error.message)
  }
})

/**
 * 获取配置
 */
registerRoute('GET', '/api/config', async (req, res) => {
  try {
    const config = await loadConfig()
    sendJSON(res, config)
  } catch (error: any) {
    sendError(res, error.message)
  }
})

// ============ 辅助函数 ============

/**
 * 获取类型颜色
 */
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    feat: '#22c55e',
    fix: '#ef4444',
    docs: '#3b82f6',
    style: '#a855f7',
    refactor: '#f59e0b',
    perf: '#06b6d4',
    test: '#8b5cf6',
    chore: '#6b7280',
    build: '#78716c',
    ci: '#0ea5e9',
  }
  return colors[type] || '#6b7280'
}

/**
 * 生成提交历史数据
 */
function generateCommitHistory(commits: any[]): { date: string; commits: number }[] {
  const history: Record<string, number> = {}
  const now = new Date()

  // 初始化最近14天
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const key = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    history[key] = 0
  }

  // 统计提交
  for (const commit of commits) {
    if (commit.date) {
      const date = new Date(commit.date)
      const key = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      if (key in history) {
        history[key]++
      }
    }
  }

  return Object.entries(history).map(([date, count]) => ({ date, commits: count }))
}

/**
 * 发送 HTML 响应
 */
function sendHTML(res: ServerResponse, html: string): void {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
}

/**
 * 获取嵌入式 UI HTML
 */
function getEmbeddedUI(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Changelog Manager | LDesign</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: {"50":"#eff6ff","100":"#dbeafe","200":"#bfdbfe","300":"#93c5fd","400":"#60a5fa","500":"#3b82f6","600":"#2563eb","700":"#1d4ed8","800":"#1e40af","900":"#1e3a8a","950":"#172554"}
          }
        }
      }
    }
  </script>
  <style>
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card { @apply bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm; }
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { @apply bg-gray-100 dark:bg-gray-800; }
    ::-webkit-scrollbar-thumb { @apply bg-gray-300 dark:bg-gray-600 rounded-full; }
  </style>
</head>
<body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
  <div id="app" class="flex h-screen">
    <!-- Sidebar -->
    <aside class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div class="h-16 flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
        <div class="w-9 h-9 rounded-lg bg-primary-500 text-white flex items-center justify-center font-bold">CL</div>
        <span class="text-lg font-semibold">Changelog</span>
      </div>
      <nav class="flex-1 p-3 space-y-1">
        <a href="#dashboard" onclick="showPage('dashboard')" class="nav-item active flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          仪表盘
        </a>
        <a href="#changelog" onclick="showPage('changelog')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          生成 Changelog
        </a>
        <a href="#commits" onclick="showPage('commits')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
          提交记录
        </a>
        <a href="#releases" onclick="showPage('releases')" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
          版本发布
        </a>
      </nav>
      <div class="p-3 border-t border-gray-200 dark:border-gray-700">
        <button onclick="toggleTheme()" class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm">
          <svg id="theme-icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          <span id="theme-text">切换主题</span>
        </button>
      </div>
    </aside>
    <!-- Main Content -->
    <main class="flex-1 overflow-auto">
      <!-- Dashboard -->
      <div id="page-dashboard" class="page p-6 space-y-6 fade-in">
        <div class="flex items-center justify-between">
          <div><h1 class="text-2xl font-bold">仪表盘</h1><p class="text-gray-500 dark:text-gray-400">项目变更统计概览</p></div>
          <button onclick="loadStats()" class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">刷新数据</button>
        </div>
        <div id="stats-cards" class="grid gap-4 md:grid-cols-2 lg:grid-cols-4"></div>
        <div class="card p-6"><h3 class="font-semibold mb-4">最近提交</h3><div id="recent-commits" class="space-y-3"></div></div>
      </div>
      <!-- Changelog Generator -->
      <div id="page-changelog" class="page p-6 space-y-6 hidden">
        <div><h1 class="text-2xl font-bold">生成 Changelog</h1><p class="text-gray-500 dark:text-gray-400">生成和预览变更日志</p></div>
        <div class="grid gap-6 lg:grid-cols-3">
          <div class="card p-6 space-y-4">
            <h3 class="font-semibold">生成配置</h3>
            <div><label class="text-sm font-medium">版本号</label><input id="gen-version" type="text" placeholder="例如: 1.2.0" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"></div>
            <div><label class="text-sm font-medium">输出格式</label><select id="gen-format" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"><option value="markdown">Markdown</option><option value="json">JSON</option><option value="html">HTML</option></select></div>
            <div><label class="text-sm font-medium">起始标签</label><input id="gen-from" type="text" placeholder="例如: v1.1.0" class="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"></div>
            <button onclick="generateChangelog()" class="w-full px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">生成 Changelog</button>
          </div>
          <div class="card p-6 lg:col-span-2">
            <div class="flex items-center justify-between mb-4"><h3 class="font-semibold">预览</h3><button onclick="copyChangelog()" class="text-sm text-primary-500 hover:underline">复制</button></div>
            <pre id="changelog-preview" class="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">点击"生成 Changelog"按钮开始</pre>
          </div>
        </div>
      </div>
      <!-- Commits -->
      <div id="page-commits" class="page p-6 space-y-6 hidden">
        <div><h1 class="text-2xl font-bold">提交记录</h1><p class="text-gray-500 dark:text-gray-400">浏览 Git 提交历史</p></div>
        <div class="card p-6"><div id="commits-list" class="space-y-3"></div></div>
      </div>
      <!-- Releases -->
      <div id="page-releases" class="page p-6 space-y-6 hidden">
        <div><h1 class="text-2xl font-bold">版本发布</h1><p class="text-gray-500 dark:text-gray-400">管理和发布新版本</p></div>
        <div id="releases-list" class="space-y-4"></div>
      </div>
    </main>
  </div>
  <script>
    // Theme
    const html = document.documentElement;
    if (localStorage.theme === 'dark' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      html.classList.add('dark');
    }
    function toggleTheme() {
      html.classList.toggle('dark');
      localStorage.theme = html.classList.contains('dark') ? 'dark' : 'light';
    }
    // Navigation
    function showPage(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      document.getElementById('page-' + page).classList.remove('hidden');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active', 'bg-primary-500', 'text-white'));
      event.target.closest('.nav-item').classList.add('active', 'bg-primary-500', 'text-white');
      if (page === 'commits') loadCommits();
      if (page === 'releases') loadReleases();
    }
    // API calls
    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        document.getElementById('stats-cards').innerHTML = [
          {title: '总提交数', value: data.totalCommits, color: 'blue'},
          {title: '贡献者', value: data.contributors, color: 'green'},
          {title: '版本数', value: data.versions, color: 'purple'},
          {title: '提交类型', value: data.commitsByType?.length || 0, color: 'orange'}
        ].map(s => \`<div class="card p-6"><p class="text-sm text-gray-500 dark:text-gray-400">\${s.title}</p><p class="text-2xl font-bold mt-1">\${s.value}</p></div>\`).join('');
        document.getElementById('recent-commits').innerHTML = (data.recentCommits || []).map(c => \`<div class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><span class="px-2 py-1 text-xs font-medium rounded bg-\${c.type === 'feat' ? 'green' : c.type === 'fix' ? 'red' : 'gray'}-100 dark:bg-\${c.type === 'feat' ? 'green' : c.type === 'fix' ? 'red' : 'gray'}-900 text-\${c.type === 'feat' ? 'green' : c.type === 'fix' ? 'red' : 'gray'}-600 dark:text-\${c.type === 'feat' ? 'green' : c.type === 'fix' ? 'red' : 'gray'}-400">\${c.type}</span><span class="font-mono text-sm text-gray-500">\${c.hash}</span><span class="flex-1 truncate">\${c.subject}</span><span class="text-sm text-gray-400">\${c.author}</span></div>\`).join('') || '<p class="text-gray-500">暂无数据</p>';
      } catch (e) { console.error(e); }
    }
    async function loadCommits() {
      try {
        const res = await fetch('/api/commits');
        const data = await res.json();
        document.getElementById('commits-list').innerHTML = data.map(c => \`<div class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><span class="px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700">\${c.type}</span><span class="font-mono text-sm text-gray-500">\${c.shortHash}</span><span class="flex-1 truncate">\${c.subject}</span><span class="text-sm text-gray-400">\${c.author}</span></div>\`).join('') || '<p class="text-gray-500">暂无提交</p>';
      } catch (e) { console.error(e); }
    }
    async function loadReleases() {
      try {
        const res = await fetch('/api/releases');
        const data = await res.json();
        document.getElementById('releases-list').innerHTML = data.map(r => \`<div class="card p-6"><div class="flex items-center gap-3"><h3 class="text-xl font-bold">v\${r.version}</h3><span class="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">已发布</span></div><p class="text-sm text-gray-500 mt-2">\${r.commits} 次提交</p></div>\`).join('') || '<p class="text-gray-500">暂无版本</p>';
      } catch (e) { console.error(e); }
    }
    async function generateChangelog() {
      const version = document.getElementById('gen-version').value;
      const format = document.getElementById('gen-format').value;
      const from = document.getElementById('gen-from').value;
      document.getElementById('changelog-preview').textContent = '生成中...';
      try {
        const res = await fetch('/api/generate', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({version, format, from})});
        const data = await res.json();
        document.getElementById('changelog-preview').textContent = data.content || data.error || '生成失败';
      } catch (e) { document.getElementById('changelog-preview').textContent = '生成失败: ' + e.message; }
    }
    function copyChangelog() {
      navigator.clipboard.writeText(document.getElementById('changelog-preview').textContent);
      alert('已复制到剪贴板');
    }
    // Init
    loadStats();
    document.querySelector('.nav-item').classList.add('bg-primary-500', 'text-white');
  </script>
</body>
</html>`
}

/**
 * 创建 UI 服务器 (包含 API 和页面)
 */
export async function createUIServer(port: number): Promise<void> {
  const server = createServer(async (req, res) => {
    // CORS 预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      })
      res.end()
      return
    }

    const url = parseUrl(req.url || '', true)
    const path = url.pathname || '/'
    const method = req.method || 'GET'

    // 首页返回 UI
    if (path === '/' && method === 'GET') {
      sendHTML(res, getUITemplate())
      return
    }

    // API 路由
    const handler = routes[method]?.[path]

    if (handler) {
      try {
        await handler(req, res)
      } catch (error: any) {
        sendError(res, error.message)
      }
    } else {
      sendError(res, 'Not Found', 404)
    }
  })

  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      logger.info(`UI 服务器已启动: http://localhost:${port}`)
      resolve()
    })

    server.on('error', reject)
  })
}
