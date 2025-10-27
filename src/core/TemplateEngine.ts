/**
 * 模板引擎
 */

import ejs from 'ejs'
import { readFileContent } from '../utils/file.js'
import type { ChangelogContent } from '../types/changelog.js'
import type { TemplateConfig } from '../types/config.js'

/**
 * 模板引擎配置
 */
export interface TemplateEngineConfig {
  /** 模板目录 */
  templatesDir?: string

  /** 自定义辅助函数 */
  helpers?: Record<string, Function>
}

/**
 * 模板引擎
 */
export class TemplateEngine {
  private config: TemplateEngineConfig
  private helpers: Record<string, Function>

  constructor(config: TemplateEngineConfig = {}) {
    this.config = config
    this.helpers = {
      ...this.getBuiltinHelpers(),
      ...(config.helpers || {}),
    }
  }

  /**
   * 渲染模板
   */
  async render(template: string, data: ChangelogContent, isFile = true): Promise<string> {
    try {
      const templateContent = isFile ? await readFileContent(template) : template

      return ejs.render(templateContent, {
        ...data,
        helpers: this.helpers,
      }, {
        async: false,
      })
    } catch (error) {
      throw new Error(`模板渲染失败: ${(error as Error).message}`)
    }
  }

  /**
   * 编译模板
   */
  async compile(template: string, isFile = true): Promise<ejs.TemplateFunction> {
    try {
      const templateContent = isFile ? await readFileContent(template) : template
      return ejs.compile(templateContent, { async: false })
    } catch (error) {
      throw new Error(`模板编译失败: ${(error as Error).message}`)
    }
  }

  /**
   * 验证模板
   */
  async validate(template: string, isFile = true): Promise<boolean> {
    try {
      await this.compile(template, isFile)
      return true
    } catch {
      return false
    }
  }

  /**
   * 注册辅助函数
   */
  registerHelper(name: string, fn: Function): void {
    this.helpers[name] = fn
  }

  /**
   * 获取内置辅助函数
   */
  private getBuiltinHelpers(): Record<string, Function> {
    return {
      /**
       * 格式化日期
       */
      formatDate: (date: string, format: string) => {
        // 简单的日期格式化
        const d = new Date(date)
        return format
          .replace('YYYY', String(d.getFullYear()))
          .replace('MM', String(d.getMonth() + 1).padStart(2, '0'))
          .replace('DD', String(d.getDate()).padStart(2, '0'))
      },

      /**
       * 转义 Markdown
       */
      escapeMarkdown: (text: string) => {
        return text.replace(/([_*`[\]()#+\-.!])/g, '\\$1')
      },

      /**
       * 转义 HTML
       */
      escapeHtml: (text: string) => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
      },

      /**
       * 首字母大写
       */
      capitalize: (text: string) => {
        return text.charAt(0).toUpperCase() + text.slice(1)
      },

      /**
       * 截断文本
       */
      truncate: (text: string, length: number) => {
        return text.length > length ? text.substring(0, length) + '...' : text
      },

      /**
       * 创建链接
       */
      link: (text: string, url: string) => {
        return `[${text}](${url})`
      },

      /**
       * 条件渲染
       */
      if: (condition: any, trueValue: any, falseValue: any = '') => {
        return condition ? trueValue : falseValue
      },

      /**
       * 循环
       */
      each: (array: any[], fn: Function) => {
        return array.map(fn).join('')
      },
    }
  }
}

/**
 * 创建模板引擎
 */
export function createTemplateEngine(config?: TemplateEngineConfig): TemplateEngine {
  return new TemplateEngine(config)
}

