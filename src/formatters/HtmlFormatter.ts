/**
 * HTML 格式化器
 */

import type { ChangelogContent, ChangelogSection } from '../types/changelog.js'
import type { HtmlFormatOptions } from '../types/config.js'

/**
 * HTML 格式化器配置
 */
export interface HtmlFormatterConfig {
  /** 是否包含作者 */
  includeAuthors?: boolean

  /** 是否包含 PR 链接 */
  includePRLinks?: boolean

  /** 是否包含 commit hash */
  includeCommitHash?: boolean

  /** 格式选项 */
  options?: HtmlFormatOptions
}

/**
 * HTML 格式化器
 */
export class HtmlFormatter {
  private config: Required<HtmlFormatterConfig>

  constructor(config: HtmlFormatterConfig = {}) {
    this.config = {
      includeAuthors: true,
      includePRLinks: true,
      includeCommitHash: true,
      options: {
        title: 'Changelog',
        includeStyles: true,
        includeSearch: true,
        theme: 'light',
      },
      ...config,
      options: {
        title: 'Changelog',
        includeStyles: true,
        includeSearch: true,
        theme: 'light',
        ...config.options,
      },
    }
  }

  /**
   * 格式化 Changelog
   */
  format(content: ChangelogContent): string {
    return this.formatComplete([content])
  }

  /**
   * 格式化完整 Changelog
   */
  formatComplete(contents: ChangelogContent[]): string {
    const parts: string[] = []

    parts.push(this.generateHead())
    parts.push('<body>')
    parts.push(this.generateHeader())

    if (this.config.options.includeSearch) {
      parts.push(this.generateSearch())
    }

    parts.push('<main class="changelog-container">')

    for (const content of contents) {
      parts.push(this.generateVersion(content))
    }

    parts.push('</main>')
    parts.push(this.generateFooter())
    parts.push(this.generateScript())
    parts.push('</body>')
    parts.push('</html>')

    return parts.join('\n')
  }

  /**
   * 生成 HTML head
   */
  private generateHead(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(this.config.options.title)}</title>
  ${this.config.options.includeStyles ? this.generateStyles() : ''}
</head>`
  }

  /**
   * 生成样式
   */
  private generateStyles(): string {
    const theme = this.config.options.theme
    const isDark = theme === 'dark'

    return `<style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: ${isDark ? '#e4e4e4' : '#333'};
      background: ${isDark ? '#1a1a1a' : '#f5f5f5'};
      padding: 20px;
    }

    header {
      max-width: 1200px;
      margin: 0 auto 40px;
      text-align: center;
      padding: 40px 20px;
      background: ${isDark ? '#2a2a2a' : '#fff'};
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      color: ${isDark ? '#fff' : '#333'};
    }

    .search-container {
      max-width: 1200px;
      margin: 0 auto 30px;
      padding: 0 20px;
    }

    .search-input {
      width: 100%;
      padding: 12px 20px;
      font-size: 16px;
      border: 1px solid ${isDark ? '#444' : '#ddd'};
      border-radius: 8px;
      background: ${isDark ? '#2a2a2a' : '#fff'};
      color: ${isDark ? '#e4e4e4' : '#333'};
    }

    .changelog-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .version {
      background: ${isDark ? '#2a2a2a' : '#fff'};
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .version-header {
      border-bottom: 2px solid ${isDark ? '#444' : '#eee'};
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    .version-title {
      font-size: 1.8rem;
      margin-bottom: 5px;
      color: ${isDark ? '#fff' : '#333'};
    }

    .version-date {
      color: ${isDark ? '#999' : '#666'};
      font-size: 0.9rem;
    }

    .section {
      margin-bottom: 25px;
    }

    .section-title {
      font-size: 1.3rem;
      margin-bottom: 10px;
      color: ${isDark ? '#fff' : '#333'};
    }

    .commit-list {
      list-style: none;
    }

    .commit-item {
      padding: 8px 0;
      border-bottom: 1px solid ${isDark ? '#333' : '#f0f0f0'};
    }

    .commit-item:last-child {
      border-bottom: none;
    }

    .commit-scope {
      font-weight: 600;
      color: ${isDark ? '#4fc3f7' : '#2196f3'};
    }

    .commit-link {
      color: ${isDark ? '#81c784' : '#4caf50'};
      text-decoration: none;
      font-size: 0.85rem;
      margin-left: 5px;
    }

    .commit-link:hover {
      text-decoration: underline;
    }

    .commit-author {
      color: ${isDark ? '#999' : '#666'};
      font-size: 0.85rem;
      margin-left: 5px;
    }

    .breaking-changes {
      background: ${isDark ? '#4a1a1a' : '#fff3cd'};
      border-left: 4px solid ${isDark ? '#ff5252' : '#ff9800'};
      padding: 15px;
      margin-bottom: 25px;
      border-radius: 4px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid ${isDark ? '#444' : '#eee'};
    }

    .stat-item {
      text-align: center;
      padding: 15px;
      background: ${isDark ? '#333' : '#f9f9f9'};
      border-radius: 8px;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: ${isDark ? '#4fc3f7' : '#2196f3'};
    }

    .stat-label {
      font-size: 0.9rem;
      color: ${isDark ? '#999' : '#666'};
      margin-top: 5px;
    }

    footer {
      max-width: 1200px;
      margin: 40px auto 0;
      text-align: center;
      color: ${isDark ? '#999' : '#666'};
      padding: 20px;
    }

    @media print {
      body {
        background: #fff;
        color: #000;
      }
      .search-container {
        display: none;
      }
    }
  </style>`
  }

  /**
   * 生成页头
   */
  private generateHeader(): string {
    return `<header>
  <h1>${this.escapeHtml(this.config.options.title)}</h1>
  <p>Project Changelog - Generated at ${new Date().toLocaleString()}</p>
</header>`
  }

  /**
   * 生成搜索框
   */
  private generateSearch(): string {
    return `<div class="search-container">
  <input type="text" class="search-input" placeholder="Search changelog..." id="searchInput">
</div>`
  }

  /**
   * 生成版本内容
   */
  private generateVersion(content: ChangelogContent): string {
    const parts: string[] = []

    parts.push('<div class="version">')
    parts.push('<div class="version-header">')
    parts.push(`  <h2 class="version-title">${this.escapeHtml(content.version)}</h2>`)
    parts.push(`  <p class="version-date">${this.escapeHtml(content.date)}</p>`)
    parts.push('</div>')

    // Breaking Changes
    if (content.breakingChanges && content.breakingChanges.length > 0) {
      parts.push('<div class="breaking-changes">')
      parts.push('  <h3>💥 Breaking Changes</h3>')
      parts.push('  <ul>')
      for (const bc of content.breakingChanges) {
        parts.push(`    <li>${this.escapeHtml(bc.description)}</li>`)
      }
      parts.push('  </ul>')
      parts.push('</div>')
    }

    // Sections
    for (const section of content.sections) {
      if (section.commits.length === 0) continue
      parts.push(this.generateSection(section))
    }

    // Stats
    if (content.stats) {
      parts.push(this.generateStats(content))
    }

    parts.push('</div>')

    return parts.join('\n')
  }

  /**
   * 生成章节
   */
  private generateSection(section: ChangelogSection): string {
    const parts: string[] = []

    parts.push('<div class="section">')
    parts.push(`  <h3 class="section-title">${this.escapeHtml(section.title)}</h3>`)
    parts.push('  <ul class="commit-list">')

    for (const commit of section.commits) {
      parts.push('    <li class="commit-item">')

      let text = ''
      if (commit.scope) {
        text += `<span class="commit-scope">${this.escapeHtml(commit.scope)}:</span> `
      }
      text += this.escapeHtml(commit.subject)

      if (this.config.includePRLinks && commit.pr && commit.prLink) {
        text += ` <a href="${commit.prLink}" class="commit-link" target="_blank">#${commit.pr}</a>`
      }

      if (this.config.includeCommitHash && commit.commitLink) {
        text += ` <a href="${commit.commitLink}" class="commit-link" target="_blank">${commit.shortHash}</a>`
      }

      if (this.config.includeAuthors) {
        const authorName = commit.author.username || commit.author.name
        text += ` <span class="commit-author">- @${this.escapeHtml(authorName)}</span>`
      }

      parts.push(`      ${text}`)
      parts.push('    </li>')
    }

    parts.push('  </ul>')
    parts.push('</div>')

    return parts.join('\n')
  }

  /**
   * 生成统计信息
   */
  private generateStats(content: ChangelogContent): string {
    if (!content.stats) return ''

    const parts: string[] = []
    parts.push('<div class="stats">')

    parts.push(`  <div class="stat-item">
    <div class="stat-value">${content.stats.totalCommits}</div>
    <div class="stat-label">Total Commits</div>
  </div>`)

    parts.push(`  <div class="stat-item">
    <div class="stat-value">${content.stats.contributorCount}</div>
    <div class="stat-label">Contributors</div>
  </div>`)

    if (content.stats.prCount) {
      parts.push(`  <div class="stat-item">
    <div class="stat-value">${content.stats.prCount}</div>
    <div class="stat-label">Pull Requests</div>
  </div>`)
    }

    if (content.stats.issueCount) {
      parts.push(`  <div class="stat-item">
    <div class="stat-value">${content.stats.issueCount}</div>
    <div class="stat-label">Issues Closed</div>
  </div>`)
    }

    parts.push('</div>')

    return parts.join('\n')
  }

  /**
   * 生成页脚
   */
  private generateFooter(): string {
    return `<footer>
  <p>Generated by @ldesign/changelog</p>
</footer>`
  }

  /**
   * 生成 JavaScript
   */
  private generateScript(): string {
    if (!this.config.options.includeSearch) return ''

    return `<script>
  const searchInput = document.getElementById('searchInput');
  const versions = document.querySelectorAll('.version');

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    
    versions.forEach(version => {
      const text = version.textContent.toLowerCase();
      version.style.display = text.includes(query) ? 'block' : 'none';
    });
  });
</script>`
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }
}

/**
 * 创建 HTML 格式化器
 */
export function createHtmlFormatter(config?: HtmlFormatterConfig): HtmlFormatter {
  return new HtmlFormatter(config)
}

