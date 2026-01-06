/**
 * UI HTML 模板
 */

export function getUITemplate(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Changelog Manager | LDesign</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: {"50":"#eef2ff","100":"#e0e7ff","200":"#c7d2fe","300":"#a5b4fc","400":"#818cf8","500":"#6366f1","600":"#4f46e5","700":"#4338ca","800":"#3730a3","900":"#312e81","950":"#1e1b4b"}
          }
        }
      }
    }
  </script>
  <style>
    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .slide-in { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
    .pulse-dot { animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .glass { backdrop-filter: blur(12px); background: rgba(255,255,255,0.8); }
    .dark .glass { background: rgba(17,24,39,0.8); }
    .gradient-border { background: linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7); padding: 1px; }
    .stat-card { transition: all 0.3s ease; }
    .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(99,102,241,0.3); }
    .nav-item { transition: all 0.2s ease; }
    .nav-item:hover { background: rgba(99,102,241,0.1); }
    .nav-item.active { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; box-shadow: 0 4px 12px -2px rgba(99,102,241,0.4); }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    .dark ::-webkit-scrollbar-thumb { background: #475569; }
    .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
    .badge-feat { background: #dcfce7; color: #166534; }
    .badge-fix { background: #fee2e2; color: #991b1b; }
    .badge-docs { background: #dbeafe; color: #1e40af; }
    .badge-refactor { background: #fef3c7; color: #92400e; }
    .badge-perf { background: #cffafe; color: #0e7490; }
    .badge-test { background: #ede9fe; color: #5b21b6; }
    .badge-chore { background: #f3f4f6; color: #374151; }
    .dark .badge-feat { background: #166534; color: #dcfce7; }
    .dark .badge-fix { background: #991b1b; color: #fee2e2; }
    .dark .badge-docs { background: #1e40af; color: #dbeafe; }
    .dark .badge-refactor { background: #92400e; color: #fef3c7; }
    .dark .badge-perf { background: #0e7490; color: #cffafe; }
    .dark .badge-test { background: #5b21b6; color: #ede9fe; }
    .dark .badge-chore { background: #374151; color: #f3f4f6; }
    .commit-row { transition: all 0.2s ease; }
    .commit-row:hover { background: rgba(99,102,241,0.05); transform: translateX(4px); }
    .btn { transition: all 0.2s ease; }
    .btn:active { transform: scale(0.98); }
    .btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); box-shadow: 0 4px 12px -2px rgba(99,102,241,0.4); }
    .btn-primary:hover { box-shadow: 0 6px 16px -2px rgba(99,102,241,0.5); transform: translateY(-1px); }
    .input-field { transition: all 0.2s ease; }
    .input-field:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
    .card { background: white; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .dark .card { background: #1f2937; border-color: #374151; }
    .modal { backdrop-filter: blur(4px); }
    .toast { animation: toastIn 0.3s ease-out; }
    @keyframes toastIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body class="bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen antialiased">
  <div id="app" class="flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-72 bg-white dark:bg-gray-800 border-r border-gray-200/80 dark:border-gray-700/50 flex flex-col shadow-sm">
      <!-- Logo -->
      <div class="h-16 flex items-center gap-3 px-5 border-b border-gray-100 dark:border-gray-700/50">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center font-bold shadow-lg shadow-primary-500/30">
          <i class="ti ti-git-compare text-lg"></i>
        </div>
        <div>
          <span class="text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">Changelog</span>
          <p class="text-[10px] text-gray-400 -mt-0.5">Version Manager</p>
        </div>
      </div>
      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">概览</div>
        <a href="#" onclick="showPage('dashboard', event)" class="nav-item active flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-chart-dots-2 text-lg"></i>仪表盘
        </a>
        <a href="#" onclick="showPage('timeline', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-timeline text-lg"></i>发布时间线
        </a>
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-6">功能</div>
        <a href="#" onclick="showPage('changelog', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-file-text text-lg"></i>生成 Changelog
        </a>
        <a href="#" onclick="showPage('search', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-search text-lg"></i>搜索变更
        </a>
        <a href="#" onclick="showPage('commits', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-git-commit text-lg"></i>提交记录
        </a>
        <a href="#" onclick="showPage('releases', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-tag text-lg"></i>版本发布
        </a>
        <a href="#" onclick="showPage('dependencies', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-package text-lg"></i>依赖变更
        </a>
        <a href="#" onclick="showPage('validate', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-check text-lg"></i>提交校验
        </a>
        <a href="#" onclick="showPage('diff', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-arrows-diff text-lg"></i>版本对比
        </a>
        <a href="#" onclick="showPage('contributors', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-users text-lg"></i>贡献者
        </a>
        <a href="#" onclick="showPage('metrics', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-chart-bar text-lg"></i>发布指标
        </a>
        <div class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-6">系统</div>
        <a href="#" onclick="showPage('settings', event)" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium">
          <i class="ti ti-settings text-lg"></i>设置
        </a>
      </nav>
      <!-- Footer -->
      <div class="p-4 border-t border-gray-100 dark:border-gray-700/50 space-y-3">
        <button onclick="toggleTheme()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700/50 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <i id="theme-icon" class="ti ti-moon text-lg"></i>
          <span id="theme-text">切换主题</span>
        </button>
        <div class="text-center text-[10px] text-gray-400">
          <span class="pulse-dot inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1"></span>
          服务运行中 · v1.0.0
        </div>
      </div>
    </aside>
    <!-- Main -->
    <main class="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      ${getDashboardPage()}
      ${getTimelinePage()}
      ${getSearchPage()}
      ${getChangelogPage()}
      ${getCommitsPage()}
      ${getReleasesPage()}
      ${getDependenciesPage()}
      ${getValidatePage()}
      ${getDiffPage()}
      ${getContributorsPage()}
      ${getMetricsPage()}
      ${getSettingsPage()}
    </main>
  </div>
  <!-- Toast Container -->
  <div id="toast-container" class="fixed bottom-4 right-4 z-50 space-y-2"></div>
  <script>${getAppScript()}</script>
</body>
</html>`
}

function getDashboardPage(): string {
  return `
  <div id="page-dashboard" class="page p-8 space-y-8 fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">仪表盘</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">项目变更统计与概览</p>
      </div>
      <button onclick="loadStats()" class="btn btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2">
        <i class="ti ti-refresh text-lg"></i>刷新数据
      </button>
    </div>
    <!-- Stats Cards -->
    <div id="stats-cards" class="grid gap-5 md:grid-cols-2 lg:grid-cols-4"></div>
    <!-- Charts Row -->
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="card p-6">
        <h3 class="font-semibold text-lg mb-4 flex items-center gap-2"><i class="ti ti-chart-area text-primary-500"></i>提交趋势</h3>
        <div class="h-64"><canvas id="chart-commits"></canvas></div>
      </div>
      <div class="card p-6">
        <h3 class="font-semibold text-lg mb-4 flex items-center gap-2"><i class="ti ti-chart-pie text-primary-500"></i>提交类型分布</h3>
        <div class="h-64 flex items-center justify-center"><canvas id="chart-types"></canvas></div>
      </div>
    </div>
    <!-- Recent Activity -->
    <div class="card p-6">
      <h3 class="font-semibold text-lg mb-4 flex items-center gap-2"><i class="ti ti-clock text-primary-500"></i>最近活动</h3>
      <div id="recent-commits" class="space-y-2"></div>
    </div>
  </div>`
}

function getChangelogPage(): string {
  return `
  <div id="page-changelog" class="page p-8 space-y-8 hidden">
    <div>
      <h1 class="text-3xl font-bold">生成 Changelog</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">配置参数并生成变更日志</p>
    </div>
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6">
        <div class="card p-6 space-y-5">
          <h3 class="font-semibold text-lg flex items-center gap-2"><i class="ti ti-settings text-primary-500"></i>生成配置</h3>
          <div>
            <label class="text-sm font-medium text-gray-600 dark:text-gray-300">版本号</label>
            <input id="gen-version" type="text" placeholder="例如: 1.2.0 或留空自动检测" class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600 dark:text-gray-300">输出格式</label>
            <select id="gen-format" class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
              <option value="markdown">📝 Markdown</option>
              <option value="json">📋 JSON</option>
              <option value="html">🌐 HTML</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600 dark:text-gray-300">起始标签</label>
            <input id="gen-from" type="text" placeholder="例如: v1.1.0" class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
          </div>
          <div>
            <label class="text-sm font-medium text-gray-600 dark:text-gray-300">结束标签</label>
            <input id="gen-to" type="text" placeholder="默认: HEAD" class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
          </div>
          <button onclick="generateChangelog()" class="btn btn-primary w-full px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2">
            <i class="ti ti-sparkles"></i>生成 Changelog
          </button>
        </div>
        <div class="card p-6 space-y-4">
          <h3 class="font-semibold text-lg flex items-center gap-2"><i class="ti ti-bulb text-yellow-500"></i>快速操作</h3>
          <button onclick="generateQuick('patch')" class="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center text-sm font-bold">P</span>
            <div><div class="font-medium">Patch 版本</div><div class="text-xs text-gray-400">Bug 修复版本</div></div>
          </button>
          <button onclick="generateQuick('minor')" class="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center text-sm font-bold">M</span>
            <div><div class="font-medium">Minor 版本</div><div class="text-xs text-gray-400">新功能版本</div></div>
          </button>
          <button onclick="generateQuick('major')" class="w-full text-left px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all flex items-center gap-3">
            <span class="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-sm font-bold">V</span>
            <div><div class="font-medium">Major 版本</div><div class="text-xs text-gray-400">重大更新版本</div></div>
          </button>
        </div>
      </div>
      <div class="lg:col-span-2 card p-6 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-lg flex items-center gap-2"><i class="ti ti-eye text-primary-500"></i>预览</h3>
          <div class="flex gap-2">
            <button onclick="copyChangelog()" class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1">
              <i class="ti ti-copy"></i>复制
            </button>
            <button onclick="downloadChangelog()" class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1">
              <i class="ti ti-download"></i>下载
            </button>
          </div>
        </div>
        <pre id="changelog-preview" class="flex-1 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm overflow-auto whitespace-pre-wrap font-mono leading-relaxed border border-gray-100 dark:border-gray-700/50">点击 "生成 Changelog" 按钮开始...</pre>
      </div>
    </div>
  </div>`
}

function getCommitsPage(): string {
  return `
  <div id="page-commits" class="page p-8 space-y-6 hidden">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">提交记录</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">浏览和搜索 Git 提交历史</p>
      </div>
      <button onclick="loadCommits()" class="btn btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2">
        <i class="ti ti-refresh"></i>刷新
      </button>
    </div>
    <!-- Filters -->
    <div class="card p-4 flex flex-wrap gap-4 items-center">
      <div class="flex-1 min-w-64">
        <div class="relative">
          <i class="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input id="commit-search" type="text" placeholder="搜索提交信息..." onkeyup="filterCommits()" class="input-field w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
        </div>
      </div>
      <select id="commit-type-filter" onchange="filterCommits()" class="input-field px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
        <option value="">全部类型</option>
        <option value="feat">✨ feat</option>
        <option value="fix">🐛 fix</option>
        <option value="docs">📚 docs</option>
        <option value="refactor">♻️ refactor</option>
        <option value="perf">⚡ perf</option>
        <option value="test">🧪 test</option>
        <option value="chore">🔧 chore</option>
      </select>
      <div id="commit-count" class="text-sm text-gray-500"></div>
    </div>
    <!-- Commits List -->
    <div class="card overflow-hidden">
      <div id="commits-list" class="divide-y divide-gray-100 dark:divide-gray-700/50"></div>
    </div>
  </div>`
}

function getReleasesPage(): string {
  return `
  <div id="page-releases" class="page p-8 space-y-6 hidden">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">版本发布</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">管理和创建新版本</p>
      </div>
      <button onclick="showNewReleaseModal()" class="btn btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2">
        <i class="ti ti-plus"></i>新建版本
      </button>
    </div>
    <div id="releases-list" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3"></div>
  </div>`
}

function getValidatePage(): string {
  return `
  <div id="page-validate" class="page p-8 space-y-6 hidden">
    <div>
      <h1 class="text-3xl font-bold">提交校验</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">验证提交信息是否符合规范</p>
    </div>
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="card p-6 space-y-5">
        <h3 class="font-semibold text-lg flex items-center gap-2"><i class="ti ti-pencil text-primary-500"></i>输入提交信息</h3>
        <textarea id="validate-input" rows="6" placeholder="例如: feat(auth): add login function" class="input-field w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none resize-none font-mono"></textarea>
        <button onclick="validateCommit()" class="btn btn-primary w-full px-4 py-3 rounded-xl text-white font-medium flex items-center justify-center gap-2">
          <i class="ti ti-check"></i>校验提交信息
        </button>
        <div class="text-sm text-gray-500 space-y-2">
          <p class="font-medium">支持的格式:</p>
          <code class="block p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">type(scope): subject</code>
          <p class="text-xs">类型: feat, fix, docs, style, refactor, perf, test, chore, build, ci</p>
        </div>
      </div>
      <div class="card p-6">
        <h3 class="font-semibold text-lg mb-4 flex items-center gap-2"><i class="ti ti-list-check text-primary-500"></i>校验结果</h3>
        <div id="validate-result" class="space-y-3">
          <div class="text-gray-400 text-center py-8">
            <i class="ti ti-file-search text-4xl mb-2"></i>
            <p>输入提交信息后点击校验</p>
          </div>
        </div>
      </div>
    </div>
  </div>`
}

function getDiffPage(): string {
  return `
  <div id="page-diff" class="page p-8 space-y-6 hidden">
    <div>
      <h1 class="text-3xl font-bold">版本对比</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">对比不同版本之间的变更</p>
    </div>
    <div class="card p-6">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div>
          <label class="text-sm font-medium text-gray-600 dark:text-gray-300">起始版本</label>
          <select id="diff-from" class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none"></select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 dark:text-gray-300">结束版本</label>
          <select id="diff-to" class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none"></select>
        </div>
        <div class="flex items-end">
          <button onclick="loadDiff()" class="btn btn-primary w-full px-4 py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2">
            <i class="ti ti-arrows-diff"></i>对比
          </button>
        </div>
      </div>
      <div id="diff-result" class="space-y-4">
        <div class="text-gray-400 text-center py-12">
          <i class="ti ti-git-compare text-5xl mb-3"></i>
          <p>选择两个版本进行对比</p>
        </div>
      </div>
    </div>
  </div>`
}

function getContributorsPage(): string {
  return `
  <div id="page-contributors" class="page p-8 space-y-6 hidden">
    <div>
      <h1 class="text-3xl font-bold">贡献者</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">项目贡献者统计</p>
    </div>
    <div id="contributors-list" class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"></div>
  </div>`
}

function getSettingsPage(): string {
  return `
  <div id="page-settings" class="page p-8 space-y-6 hidden">
    <div>
      <h1 class="text-3xl font-bold">设置</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">配置 Changelog 生成参数</p>
    </div>
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="card p-6 space-y-5">
        <h3 class="font-semibold text-lg flex items-center gap-2"><i class="ti ti-palette text-primary-500"></i>外观设置</h3>
        <div>
          <label class="text-sm font-medium text-gray-600 dark:text-gray-300">主题模式</label>
          <div class="mt-2 flex gap-3">
            <button onclick="setTheme('light')" class="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <i class="ti ti-sun text-yellow-500"></i>浅色
            </button>
            <button onclick="setTheme('dark')" class="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <i class="ti ti-moon text-indigo-500"></i>深色
            </button>
            <button onclick="setTheme('system')" class="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-primary-400 transition-colors flex items-center justify-center gap-2 text-sm font-medium">
              <i class="ti ti-device-desktop text-gray-500"></i>系统
            </button>
          </div>
        </div>
      </div>
      <div class="card p-6 space-y-5">
        <h3 class="font-semibold text-lg flex items-center gap-2"><i class="ti ti-file-settings text-primary-500"></i>Changelog 配置</h3>
        <div id="config-display" class="space-y-3 text-sm">
          <div class="text-gray-400 text-center py-4">加载中...</div>
        </div>
        <button onclick="loadConfig()" class="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">刷新配置</button>
      </div>
    </div>
  </div>`
}

function getTimelinePage(): string {
  return `
  <div id="page-timeline" class="page p-8 space-y-6 hidden">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">发布时间线</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">交互式版本发布历史时间线</p>
      </div>
      <button onclick="loadTimeline()" class="btn btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2">
        <i class="ti ti-refresh"></i>刷新
      </button>
    </div>
    <div class="card p-6">
      <div id="timeline-container" class="relative">
        <div class="text-gray-400 text-center py-12">
          <i class="ti ti-loader-2 animate-spin text-4xl mb-3"></i>
          <p>加载时间线数据...</p>
        </div>
      </div>
    </div>
    <!-- Release Detail Modal -->
    <div id="release-modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm hidden items-center justify-center z-50" onclick="closeReleaseModal(event)">
      <div class="card max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold" id="modal-title">版本详情</h3>
          <button onclick="closeReleaseModal()" class="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">
            <i class="ti ti-x"></i>
          </button>
        </div>
        <div id="modal-content"></div>
      </div>
    </div>
  </div>`
}

function getSearchPage(): string {
  return `
  <div id="page-search" class="page p-8 space-y-6 hidden">
    <div>
      <h1 class="text-3xl font-bold">搜索变更</h1>
      <p class="text-gray-500 dark:text-gray-400 mt-1">搜索和过滤 Changelog 条目</p>
    </div>
    <div class="card p-6 space-y-4">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div class="lg:col-span-2">
          <label class="text-sm font-medium text-gray-600 dark:text-gray-300">关键词</label>
          <input id="search-keyword" type="text" placeholder="搜索提交信息..." class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 dark:text-gray-300">类型</label>
          <select id="search-type" multiple class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
            <option value="feat">feat</option>
            <option value="fix">fix</option>
            <option value="docs">docs</option>
            <option value="refactor">refactor</option>
            <option value="perf">perf</option>
            <option value="test">test</option>
            <option value="chore">chore</option>
          </select>
        </div>
        <div>
          <label class="text-sm font-medium text-gray-600 dark:text-gray-300">排序</label>
          <select id="search-sort" class="input-field mt-1.5 w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700/50 outline-none">
            <option value="date-desc">日期 (新→旧)</option>
            <option value="date-asc">日期 (旧→新)</option>
            <option value="relevance">相关性</option>
            <option value="type">类型</option>
          </select>
        </div>
      </div>
      <button onclick="performSearch()" class="btn btn-primary px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2">
        <i class="ti ti-search"></i>搜索
      </button>
    </div>
    <div class="card p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-lg">搜索结果</h3>
        <span id="search-count" class="text-sm text-gray-500"></span>
      </div>
      <div id="search-results" class="space-y-2">
        <div class="text-gray-400 text-center py-8">
          <i class="ti ti-search text-4xl mb-2"></i>
          <p>输入关键词开始搜索</p>
        </div>
      </div>
      <div id="search-pagination" class="mt-4 flex justify-center gap-2"></div>
    </div>
  </div>`
}

function getDependenciesPage(): string {
  return `
  <div id="page-dependencies" class="page p-8 space-y-6 hidden">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">依赖变更历史</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">查看各版本的依赖包变更</p>
      </div>
      <button onclick="loadDependencies()" class="btn btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2">
        <i class="ti ti-refresh"></i>刷新
      </button>
    </div>
    <div id="dependencies-list" class="space-y-4">
      <div class="text-gray-400 text-center py-12">
        <i class="ti ti-loader-2 animate-spin text-4xl mb-3"></i>
        <p>加载依赖变更数据...</p>
      </div>
    </div>
  </div>`
}

function getMetricsPage(): string {
  return `
  <div id="page-metrics" class="page p-8 space-y-6 hidden">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">发布指标</h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">项目发布频率和速度分析</p>
      </div>
      <div class="flex gap-2">
        <button onclick="loadMetrics()" class="btn btn-primary px-5 py-2.5 rounded-xl text-white text-sm font-medium flex items-center gap-2">
          <i class="ti ti-refresh"></i>刷新
        </button>
        <button onclick="exportMetrics()" class="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
          <i class="ti ti-download"></i>导出
        </button>
      </div>
    </div>
    <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div class="card p-5">
        <div class="text-sm text-gray-500 mb-2">平均发布周期</div>
        <div id="metric-cycle" class="text-3xl font-bold text-primary-500">-</div>
        <div class="text-xs text-gray-400 mt-1">天/版本</div>
      </div>
      <div class="card p-5">
        <div class="text-sm text-gray-500 mb-2">最近发布</div>
        <div id="metric-last" class="text-3xl font-bold text-green-500">-</div>
        <div class="text-xs text-gray-400 mt-1">天前</div>
      </div>
      <div class="card p-5">
        <div class="text-sm text-gray-500 mb-2">年度发布</div>
        <div id="metric-yearly" class="text-3xl font-bold text-blue-500">-</div>
        <div class="text-xs text-gray-400 mt-1">个版本</div>
      </div>
      <div class="card p-5">
        <div class="text-sm text-gray-500 mb-2">发布速度</div>
        <div id="metric-velocity" class="text-3xl font-bold text-purple-500">-</div>
        <div class="text-xs text-gray-400 mt-1">提交/版本</div>
      </div>
    </div>
    <div class="grid gap-6 lg:grid-cols-2">
      <div class="card p-6">
        <h3 class="font-semibold text-lg mb-4 flex items-center gap-2"><i class="ti ti-chart-line text-primary-500"></i>发布频率趋势</h3>
        <div class="h-64"><canvas id="chart-release-frequency"></canvas></div>
      </div>
      <div class="card p-6">
        <h3 class="font-semibold text-lg mb-4 flex items-center gap-2"><i class="ti ti-chart-bar text-primary-500"></i>版本规模分布</h3>
        <div class="h-64"><canvas id="chart-release-size"></canvas></div>
      </div>
    </div>
  </div>`
}

function getAppScript(): string {
  return `
    // State
    let allCommits = [];
    let typeChart = null;
    let trendChart = null;

    // Theme
    const html = document.documentElement;
    function initTheme() {
      if (localStorage.theme === 'dark' || (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
        updateThemeIcon(true);
      }
    }
    function toggleTheme() {
      html.classList.toggle('dark');
      const isDark = html.classList.contains('dark');
      localStorage.theme = isDark ? 'dark' : 'light';
      updateThemeIcon(isDark);
    }
    function setTheme(mode) {
      if (mode === 'system') {
        localStorage.removeItem('theme');
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.classList.toggle('dark', isDark);
        updateThemeIcon(isDark);
      } else {
        localStorage.theme = mode;
        html.classList.toggle('dark', mode === 'dark');
        updateThemeIcon(mode === 'dark');
      }
      showToast('主题已更新', 'success');
    }
    function updateThemeIcon(isDark) {
      document.getElementById('theme-icon').className = isDark ? 'ti ti-sun text-lg' : 'ti ti-moon text-lg';
    }
    initTheme();

    // Navigation
    function showPage(page, e) {
      if (e) e.preventDefault();
      document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
      document.getElementById('page-' + page)?.classList.remove('hidden');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      if (e) e.target.closest('.nav-item')?.classList.add('active');
      
      // Load page data
      if (page === 'timeline') loadTimeline();
      if (page === 'search') initSearch();
      if (page === 'commits') loadCommits();
      if (page === 'releases') loadReleases();
      if (page === 'dependencies') loadDependencies();
      if (page === 'contributors') loadContributors();
      if (page === 'metrics') loadMetrics();
      if (page === 'settings') loadConfig();
      if (page === 'diff') loadTags();
    }

    // Toast
    function showToast(message, type = 'info') {
      const icons = { success: 'check', error: 'x', info: 'info-circle', warning: 'alert-triangle' };
      const colors = { success: 'green', error: 'red', info: 'blue', warning: 'yellow' };
      const toast = document.createElement('div');
      toast.className = \`toast flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700\`;
      toast.innerHTML = \`<i class="ti ti-\${icons[type]} text-\${colors[type]}-500"></i><span class="text-sm">\${message}</span>\`;
      document.getElementById('toast-container').appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    // API Helpers
    async function api(path, options = {}) {
      try {
        const res = await fetch('/api' + path, { headers: { 'Content-Type': 'application/json' }, ...options });
        return await res.json();
      } catch (e) {
        console.error(e);
        return null;
      }
    }

    // Dashboard
    async function loadStats() {
      const data = await api('/stats');
      if (!data) return;
      
      // Stats Cards
      const stats = [
        { title: '总提交数', value: data.totalCommits || 0, icon: 'git-commit', color: 'primary', change: '+12%' },
        { title: '贡献者', value: data.contributors || 0, icon: 'users', color: 'green', change: '+3' },
        { title: '版本数', value: data.versions || 0, icon: 'tag', color: 'purple', change: 'Latest' },
        { title: '提交类型', value: data.commitsByType?.length || 0, icon: 'category', color: 'orange', change: 'Types' }
      ];
      document.getElementById('stats-cards').innerHTML = stats.map(s => \`
        <div class="stat-card card p-5 cursor-pointer">
          <div class="flex items-center justify-between mb-3">
            <span class="w-10 h-10 rounded-xl bg-\${s.color === 'primary' ? 'indigo' : s.color}-100 dark:bg-\${s.color === 'primary' ? 'indigo' : s.color}-900/30 flex items-center justify-center">
              <i class="ti ti-\${s.icon} text-\${s.color === 'primary' ? 'indigo' : s.color}-500 text-lg"></i>
            </span>
            <span class="text-xs text-\${s.color === 'primary' ? 'indigo' : s.color}-500 font-medium">\${s.change}</span>
          </div>
          <div class="text-2xl font-bold">\${s.value}</div>
          <div class="text-sm text-gray-500 mt-0.5">\${s.title}</div>
        </div>
      \`).join('');
      
      // Recent Commits
      document.getElementById('recent-commits').innerHTML = (data.recentCommits || []).slice(0, 8).map(c => \`
        <div class="commit-row flex items-center gap-4 p-3 rounded-xl cursor-pointer">
          <span class="badge badge-\${c.type || 'chore'}">\${c.type || 'other'}</span>
          <code class="text-xs text-gray-400 font-mono">\${c.hash}</code>
          <span class="flex-1 text-sm truncate">\${c.subject}</span>
          <span class="text-xs text-gray-400">\${c.author}</span>
        </div>
      \`).join('') || '<p class="text-gray-400 text-center py-4">暂无提交</p>';
      
      // Charts
      renderCharts(data);
    }

    function renderCharts(data) {
      // Commit Trend Chart
      if (trendChart) trendChart.destroy();
      const trendCtx = document.getElementById('chart-commits');
      if (trendCtx && data.commitHistory) {
        trendChart = new Chart(trendCtx, {
          type: 'line',
          data: {
            labels: data.commitHistory.map(h => h.date),
            datasets: [{
              label: '提交数',
              data: data.commitHistory.map(h => h.commits),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } }, x: { grid: { display: false } } } }
        });
      }
      
      // Type Distribution Chart
      if (typeChart) typeChart.destroy();
      const typeCtx = document.getElementById('chart-types');
      if (typeCtx && data.commitsByType) {
        typeChart = new Chart(typeCtx, {
          type: 'doughnut',
          data: {
            labels: data.commitsByType.map(t => t.name),
            datasets: [{
              data: data.commitsByType.map(t => t.value),
              backgroundColor: data.commitsByType.map(t => t.color),
              borderWidth: 0
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 16 } } }, cutout: '65%' }
        });
      }
    }

    // Commits
    async function loadCommits() {
      const data = await api('/commits');
      allCommits = data || [];
      renderCommits(allCommits);
    }
    function renderCommits(commits) {
      document.getElementById('commit-count').textContent = \`共 \${commits.length} 条\`;
      document.getElementById('commits-list').innerHTML = commits.slice(0, 100).map(c => \`
        <div class="commit-row flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <span class="badge badge-\${c.type || 'chore'}">\${c.type || 'other'}</span>
          <code class="text-xs text-gray-400 font-mono w-20">\${c.shortHash}</code>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">\${c.subject}</div>
            <div class="text-xs text-gray-400 mt-0.5">\${c.scope ? '(' + c.scope + ')' : ''}</div>
          </div>
          <span class="text-xs text-gray-400 whitespace-nowrap">\${c.author}</span>
          \${c.breaking ? '<span class="badge bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">BREAKING</span>' : ''}
        </div>
      \`).join('') || '<p class="text-gray-400 text-center py-8">暂无提交记录</p>';
    }
    function filterCommits() {
      const search = document.getElementById('commit-search').value.toLowerCase();
      const type = document.getElementById('commit-type-filter').value;
      const filtered = allCommits.filter(c => 
        (!search || c.subject?.toLowerCase().includes(search) || c.shortHash?.includes(search)) &&
        (!type || c.type === type)
      );
      renderCommits(filtered);
    }

    // Releases
    async function loadReleases() {
      const data = await api('/releases');
      document.getElementById('releases-list').innerHTML = (data || []).map((r, i) => \`
        <div class="card p-5 hover:shadow-lg transition-shadow cursor-pointer">
          <div class="flex items-center gap-3 mb-3">
            <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center font-bold text-sm">v\${r.version?.split('.')[0] || '?'}</span>
            <div>
              <div class="font-bold">v\${r.version}</div>
              <div class="text-xs text-gray-400">\${new Date(r.date).toLocaleDateString('zh-CN')}</div>
            </div>
            \${r.breaking ? '<span class="badge bg-red-100 text-red-600 text-[10px]">BREAKING</span>' : ''}
          </div>
          <div class="flex items-center gap-4 text-sm text-gray-500">
            <span><i class="ti ti-git-commit mr-1"></i>\${r.commits} commits</span>
            <span class="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs">已发布</span>
          </div>
        </div>
      \`).join('') || '<p class="text-gray-400 text-center py-8 col-span-full">暂无版本</p>';
    }

    // Changelog Generator
    async function generateChangelog() {
      const version = document.getElementById('gen-version').value;
      const format = document.getElementById('gen-format').value;
      const from = document.getElementById('gen-from').value;
      const to = document.getElementById('gen-to').value;
      document.getElementById('changelog-preview').textContent = '⏳ 正在生成...';
      const data = await api('/generate', { method: 'POST', body: JSON.stringify({ version, format, from, to }) });
      document.getElementById('changelog-preview').textContent = data?.content || data?.error || '生成失败';
      if (data?.content) showToast('Changelog 生成成功', 'success');
    }
    function generateQuick(type) {
      showToast(\`快速生成 \${type} 版本 Changelog\`, 'info');
      generateChangelog();
    }
    function copyChangelog() {
      navigator.clipboard.writeText(document.getElementById('changelog-preview').textContent);
      showToast('已复制到剪贴板', 'success');
    }
    function downloadChangelog() {
      const content = document.getElementById('changelog-preview').textContent;
      const format = document.getElementById('gen-format').value;
      const ext = { markdown: 'md', json: 'json', html: 'html' }[format] || 'md';
      const blob = new Blob([content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'CHANGELOG.' + ext;
      a.click();
      showToast('文件已下载', 'success');
    }

    // Validate
    function validateCommit() {
      const input = document.getElementById('validate-input').value.trim();
      if (!input) { showToast('请输入提交信息', 'warning'); return; }
      const pattern = /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\\([^)]+\\))?!?:\\s.+/;
      const isValid = pattern.test(input);
      const match = input.match(/^(\\w+)(\\(([^)]+)\\))?(!)?:\\s(.+)/);
      document.getElementById('validate-result').innerHTML = \`
        <div class="p-4 rounded-xl \${isValid ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}">
          <div class="flex items-center gap-2 mb-2">
            <i class="ti ti-\${isValid ? 'check' : 'x'} text-\${isValid ? 'green' : 'red'}-500"></i>
            <span class="font-medium \${isValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}">\${isValid ? '格式正确' : '格式错误'}</span>
          </div>
          \${match ? \`
            <div class="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <div><span class="text-gray-400">类型:</span> \${match[1]}</div>
              \${match[3] ? '<div><span class="text-gray-400">范围:</span> ' + match[3] + '</div>' : ''}
              <div><span class="text-gray-400">破坏性:</span> \${match[4] ? '是' : '否'}</div>
              <div><span class="text-gray-400">描述:</span> \${match[5]}</div>
            </div>
          \` : '<p class="text-sm text-gray-500">无法解析提交信息</p>'}
        </div>
      \`;
    }

    // Diff
    async function loadTags() {
      const data = await api('/releases');
      const options = (data || []).map(r => \`<option value="\${r.version}">v\${r.version}</option>\`).join('');
      document.getElementById('diff-from').innerHTML = '<option value="">选择版本</option>' + options;
      document.getElementById('diff-to').innerHTML = '<option value="HEAD">HEAD (最新)</option>' + options;
    }
    async function loadDiff() {
      const from = document.getElementById('diff-from').value;
      const to = document.getElementById('diff-to').value;
      if (!from) { showToast('请选择起始版本', 'warning'); return; }
      document.getElementById('diff-result').innerHTML = '<div class="text-center py-8 text-gray-400"><i class="ti ti-loader-2 animate-spin text-2xl"></i><p class="mt-2">加载中...</p></div>';
      const data = await api('/generate', { method: 'POST', body: JSON.stringify({ from: 'v' + from, to: to === 'HEAD' ? 'HEAD' : 'v' + to }) });
      document.getElementById('diff-result').innerHTML = \`<pre class="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm overflow-auto whitespace-pre-wrap font-mono border border-gray-100 dark:border-gray-700/50">\${data?.content || '无变更'}</pre>\`;
    }

    // Contributors
    async function loadContributors() {
      const data = await api('/stats');
      const contributors = data?.recentCommits?.reduce((acc, c) => {
        if (!acc[c.author]) acc[c.author] = { name: c.author, count: 0 };
        acc[c.author].count++;
        return acc;
      }, {}) || {};
      const list = Object.values(contributors).sort((a, b) => b.count - a.count);
      document.getElementById('contributors-list').innerHTML = list.map((c, i) => \`
        <div class="card p-5 flex items-center gap-4 hover:shadow-lg transition-shadow">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg">\${c.name?.[0]?.toUpperCase() || '?'}</div>
          <div class="flex-1">
            <div class="font-medium">\${c.name}</div>
            <div class="text-sm text-gray-400">\${c.count} 次提交</div>
          </div>
          <div class="text-2xl font-bold text-gray-200 dark:text-gray-700">#\${i + 1}</div>
        </div>
      \`).join('') || '<p class="text-gray-400 text-center py-8 col-span-full">暂无贡献者数据</p>';
    }

    // Config
    async function loadConfig() {
      const data = await api('/config');
      document.getElementById('config-display').innerHTML = data ? \`
        <div class="space-y-2">
          <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span class="text-gray-500">格式</span><span class="font-mono">\${data.format || 'markdown'}</span></div>
          <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span class="text-gray-500">语言</span><span class="font-mono">\${data.language || 'zh-CN'}</span></div>
          <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span class="text-gray-500">输出文件</span><span class="font-mono">\${data.outputFile || 'CHANGELOG.md'}</span></div>
          <div class="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700"><span class="text-gray-500">包含全部提交</span><span>\${data.includeAllCommits ? '是' : '否'}</span></div>
          <div class="flex justify-between py-2"><span class="text-gray-500">显示作者</span><span>\${data.showAuthor ? '是' : '否'}</span></div>
        </div>
      \` : '<p class="text-gray-400 text-center py-4">无法加载配置</p>';
    }

    // Timeline
    let timelineData = [];
    async function loadTimeline() {
      const data = await api('/timeline');
      timelineData = data || [];
      renderTimeline(timelineData);
    }
    function renderTimeline(data) {
      if (!data || data.length === 0) {
        document.getElementById('timeline-container').innerHTML = '<p class="text-gray-400 text-center py-8">暂无时间线数据</p>';
        return;
      }
      const html = \`
        <div class="space-y-4">
          \${data.map((item, i) => \`
            <div class="flex gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 p-4 rounded-xl transition-colors" onclick="showReleaseDetail('\${item.version}')">
              <div class="flex flex-col items-center">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center font-bold shadow-lg">
                  v\${item.version.split('.')[0] || '?'}
                </div>
                \${i < data.length - 1 ? '<div class="flex-1 w-0.5 bg-gray-200 dark:bg-gray-700 my-2"></div>' : ''}
              </div>
              <div class="flex-1 pb-4">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="font-bold text-lg">v\${item.version}</h3>
                  \${item.breaking ? '<span class="badge bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs">BREAKING</span>' : ''}
                  <span class="text-sm text-gray-400">\${new Date(item.date).toLocaleDateString('zh-CN')}</span>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-500">
                  <span><i class="ti ti-git-commit mr-1"></i>\${item.commits} commits</span>
                  \${Object.entries(item.types || {}).map(([type, count]) => \`<span class="badge badge-\${type}">\${type}: \${count}</span>\`).join('')}
                </div>
              </div>
            </div>
          \`).join('')}
        </div>
      \`;
      document.getElementById('timeline-container').innerHTML = html;
    }
    function showReleaseDetail(version) {
      const release = timelineData.find(r => r.version === version);
      if (!release) return;
      document.getElementById('modal-title').textContent = \`版本 v\${version} 详情\`;
      document.getElementById('modal-content').innerHTML = \`
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div><span class="text-gray-500">发布日期:</span> <span class="font-medium">\${new Date(release.date).toLocaleDateString('zh-CN')}</span></div>
            <div><span class="text-gray-500">提交数:</span> <span class="font-medium">\${release.commits}</span></div>
          </div>
          <div>
            <h4 class="font-semibold mb-2">提交类型分布</h4>
            <div class="flex flex-wrap gap-2">
              \${Object.entries(release.types || {}).map(([type, count]) => \`<span class="badge badge-\${type}">\${type}: \${count}</span>\`).join('')}
            </div>
          </div>
          \${release.breaking ? '<div class="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800"><i class="ti ti-alert-triangle text-red-500 mr-2"></i>此版本包含破坏性变更</div>' : ''}
        </div>
      \`;
      document.getElementById('release-modal').classList.remove('hidden');
      document.getElementById('release-modal').classList.add('flex');
    }
    function closeReleaseModal(e) {
      if (!e || e.target.id === 'release-modal') {
        document.getElementById('release-modal').classList.add('hidden');
        document.getElementById('release-modal').classList.remove('flex');
      }
    }

    // Search
    let searchCurrentPage = 1;
    function initSearch() {
      // Initialize search page
    }
    async function performSearch(page = 1) {
      const keyword = document.getElementById('search-keyword').value;
      const typeSelect = document.getElementById('search-type');
      const types = Array.from(typeSelect.selectedOptions).map(o => o.value);
      const sortValue = document.getElementById('search-sort').value;
      const [sortBy, sortOrder] = sortValue.split('-');
      
      searchCurrentPage = page;
      document.getElementById('search-results').innerHTML = '<div class="text-center py-8 text-gray-400"><i class="ti ti-loader-2 animate-spin text-2xl"></i><p class="mt-2">搜索中...</p></div>';
      
      const data = await api('/search', {
        method: 'POST',
        body: JSON.stringify({
          keyword,
          types: types.length > 0 ? types : undefined,
          page,
          pageSize: 20,
        })
      });
      
      if (!data || data.entries.length === 0) {
        document.getElementById('search-results').innerHTML = '<p class="text-gray-400 text-center py-8">未找到匹配的结果</p>';
        document.getElementById('search-count').textContent = '';
        document.getElementById('search-pagination').innerHTML = '';
        return;
      }
      
      document.getElementById('search-count').textContent = \`共 \${data.total} 条结果\`;
      document.getElementById('search-results').innerHTML = data.entries.map(c => \`
        <div class="commit-row flex items-center gap-4 p-4 rounded-xl">
          <span class="badge badge-\${c.type || 'chore'}">\${c.type || 'other'}</span>
          <code class="text-xs text-gray-400 font-mono w-20">\${c.shortHash}</code>
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">\${c.subject}</div>
            <div class="text-xs text-gray-400 mt-0.5">\${c.scope ? '(' + c.scope + ')' : ''} · \${c.author.name}</div>
          </div>
          <span class="text-xs text-gray-400 whitespace-nowrap">\${new Date(c.date).toLocaleDateString('zh-CN')}</span>
        </div>
      \`).join('');
      
      // Pagination
      const totalPages = Math.ceil(data.total / data.pageSize);
      if (totalPages > 1) {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || (i >= page - 2 && i <= page + 2)) {
            pages.push(\`<button onclick="performSearch(\${i})" class="px-3 py-1.5 rounded-lg \${i === page ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'} text-sm">\${i}</button>\`);
          } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
          }
        }
        document.getElementById('search-pagination').innerHTML = pages.join('');
      }
    }

    // Dependencies
    async function loadDependencies() {
      const data = await api('/dependencies');
      if (!data || data.length === 0) {
        document.getElementById('dependencies-list').innerHTML = '<p class="text-gray-400 text-center py-12">暂无依赖变更数据</p>';
        return;
      }
      document.getElementById('dependencies-list').innerHTML = data.map(dep => \`
        <div class="card p-6">
          <div class="flex items-center gap-3 mb-4">
            <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold">v\${dep.version.split('.')[0]}</span>
            <div>
              <h3 class="font-bold">v\${dep.version}</h3>
              <p class="text-sm text-gray-400">\${dep.changes.length} 个依赖变更</p>
            </div>
          </div>
          <div class="space-y-2">
            \${dep.changes.map(c => \`
              <div class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
                <code class="text-xs text-gray-400">\${c.commit}</code>
                <p class="mt-1">\${c.message}</p>
              </div>
            \`).join('')}
          </div>
        </div>
      \`).join('');
    }

    // Metrics
    let frequencyChart = null;
    let sizeChart = null;
    async function loadMetrics() {
      const data = await api('/releases');
      if (!data || data.length === 0) {
        showToast('暂无发布数据', 'warning');
        return;
      }
      
      // Calculate metrics
      const now = Date.now();
      const dates = data.map(r => new Date(r.date).getTime()).sort((a, b) => b - a);
      const intervals = [];
      for (let i = 0; i < dates.length - 1; i++) {
        intervals.push((dates[i] - dates[i + 1]) / (1000 * 60 * 60 * 24));
      }
      const avgCycle = intervals.length > 0 ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : 0;
      const lastRelease = Math.round((now - dates[0]) / (1000 * 60 * 60 * 24));
      const yearAgo = now - 365 * 24 * 60 * 60 * 1000;
      const yearlyReleases = dates.filter(d => d > yearAgo).length;
      const avgCommits = Math.round(data.reduce((sum, r) => sum + r.commits, 0) / data.length);
      
      document.getElementById('metric-cycle').textContent = avgCycle;
      document.getElementById('metric-last').textContent = lastRelease;
      document.getElementById('metric-yearly').textContent = yearlyReleases;
      document.getElementById('metric-velocity').textContent = avgCommits;
      
      // Frequency chart
      if (frequencyChart) frequencyChart.destroy();
      const freqCtx = document.getElementById('chart-release-frequency');
      if (freqCtx) {
        const last12 = data.slice(0, 12).reverse();
        frequencyChart = new Chart(freqCtx, {
          type: 'line',
          data: {
            labels: last12.map(r => 'v' + r.version),
            datasets: [{
              label: '发布间隔 (天)',
              data: last12.map((r, i) => i > 0 ? Math.round((new Date(r.date).getTime() - new Date(last12[i-1].date).getTime()) / (1000 * 60 * 60 * 24)) : 0),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,0.1)',
              fill: true,
              tension: 0.4
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
      }
      
      // Size chart
      if (sizeChart) sizeChart.destroy();
      const sizeCtx = document.getElementById('chart-release-size');
      if (sizeCtx) {
        const last12 = data.slice(0, 12).reverse();
        sizeChart = new Chart(sizeCtx, {
          type: 'bar',
          data: {
            labels: last12.map(r => 'v' + r.version),
            datasets: [{
              label: '提交数',
              data: last12.map(r => r.commits),
              backgroundColor: '#6366f1'
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
      }
    }
    async function exportMetrics() {
      const format = confirm('导出为 CSV 格式？(取消则导出 JSON)') ? 'csv' : 'json';
      const data = await api('/export', { method: 'POST', body: JSON.stringify({ format }) });
      if (format === 'csv') {
        const blob = new Blob([data], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'changelog-export.csv';
        a.click();
      } else {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'changelog-export.json';
        a.click();
      }
      showToast('数据已导出', 'success');
    }

    // Init
    loadStats();
    document.querySelector('.nav-item').classList.add('active');
  `
}
