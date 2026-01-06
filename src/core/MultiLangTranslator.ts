/**
 * 多语言翻译器
 * 
 * 支持将 Changelog 内容翻译为多种语言
 */

import type {
  ChangelogContent,
  ChangelogCommit,
  ChangelogSection,
  BreakingChange,
  Contributor,
} from '../types/changelog.js'
import type { AIConfig } from '../types/ai.js'
import { AIEnhancer } from './AIEnhancer.js'
import { logger } from '../utils/logger.js'
import * as path from 'path'

/**
 * 翻译选项
 */
export interface TranslationOptions {
  /** 目标语言列表 */
  targetLanguages: string[]

  /** 翻译提供者 */
  provider?: 'ai' | 'google' | 'deepl'

  /** 是否保留原文 */
  preserveOriginal?: boolean

  /** 术语表 */
  glossary?: Record<string, Record<string, string>>

  /** 输出文件命名模式 */
  outputPattern?: string

  /** AI 配置（当 provider 为 'ai' 时使用） */
  aiConfig?: AIConfig

  /** 是否翻译提交消息 */
  translateCommits?: boolean

  /** 是否翻译章节标题 */
  translateSections?: boolean

  /** 是否翻译贡献者名称 */
  translateContributors?: boolean
}

/**
 * 翻译结果
 */
export interface TranslationResult {
  /** 语言代码 */
  language: string

  /** 翻译后的内容 */
  content: ChangelogContent

  /** 输出路径 */
  outputPath: string

  /** 翻译耗时（毫秒） */
  duration?: number

  /** 错误信息 */
  error?: string
}

/**
 * 语言配置
 */
interface LanguageConfig {
  /** 语言代码 */
  code: string

  /** 语言名称 */
  name: string

  /** 日期格式 */
  dateFormat: string

  /** 区域设置 */
  locale: string

  /** 章节标题映射 */
  sectionTitles: Record<string, string>
}

/**
 * 预定义语言配置
 */
const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  'zh-CN': {
    code: 'zh-CN',
    name: '简体中文',
    dateFormat: 'YYYY年MM月DD日',
    locale: 'zh-CN',
    sectionTitles: {
      'Features': '✨ 新功能',
      'Bug Fixes': '🐛 Bug 修复',
      'Performance': '⚡ 性能优化',
      'Code Refactoring': '♻️ 代码重构',
      'Documentation': '📝 文档更新',
      'Styles': '💄 代码样式',
      'Tests': '✅ 测试',
      'Build System': '📦 构建系统',
      'CI/CD': '👷 CI/CD',
      'Chores': '🔧 其他',
      'Breaking Changes': '💥 破坏性变更',
      'Contributors': '👥 贡献者',
      'Dependencies': '📦 依赖变更',
      'Security': '🔒 安全修复',
    },
  },
  'en-US': {
    code: 'en-US',
    name: 'English',
    dateFormat: 'MMMM DD, YYYY',
    locale: 'en-US',
    sectionTitles: {
      'Features': '✨ Features',
      'Bug Fixes': '🐛 Bug Fixes',
      'Performance': '⚡ Performance',
      'Code Refactoring': '♻️ Code Refactoring',
      'Documentation': '📝 Documentation',
      'Styles': '💄 Styles',
      'Tests': '✅ Tests',
      'Build System': '📦 Build System',
      'CI/CD': '👷 CI/CD',
      'Chores': '🔧 Chores',
      'Breaking Changes': '💥 Breaking Changes',
      'Contributors': '👥 Contributors',
      'Dependencies': '📦 Dependencies',
      'Security': '🔒 Security',
    },
  },
  'ja-JP': {
    code: 'ja-JP',
    name: '日本語',
    dateFormat: 'YYYY年MM月DD日',
    locale: 'ja-JP',
    sectionTitles: {
      'Features': '✨ 新機能',
      'Bug Fixes': '🐛 バグ修正',
      'Performance': '⚡ パフォーマンス',
      'Code Refactoring': '♻️ リファクタリング',
      'Documentation': '📝 ドキュメント',
      'Styles': '💄 スタイル',
      'Tests': '✅ テスト',
      'Build System': '📦 ビルドシステム',
      'CI/CD': '👷 CI/CD',
      'Chores': '🔧 その他',
      'Breaking Changes': '💥 破壊的変更',
      'Contributors': '👥 貢献者',
      'Dependencies': '📦 依存関係',
      'Security': '🔒 セキュリティ',
    },
  },
  'es-ES': {
    code: 'es-ES',
    name: 'Español',
    dateFormat: 'DD [de] MMMM [de] YYYY',
    locale: 'es-ES',
    sectionTitles: {
      'Features': '✨ Características',
      'Bug Fixes': '🐛 Corrección de Errores',
      'Performance': '⚡ Rendimiento',
      'Code Refactoring': '♻️ Refactorización',
      'Documentation': '📝 Documentación',
      'Styles': '💄 Estilos',
      'Tests': '✅ Pruebas',
      'Build System': '📦 Sistema de Compilación',
      'CI/CD': '👷 CI/CD',
      'Chores': '🔧 Otros',
      'Breaking Changes': '💥 Cambios Incompatibles',
      'Contributors': '👥 Colaboradores',
      'Dependencies': '📦 Dependencias',
      'Security': '🔒 Seguridad',
    },
  },
  'fr-FR': {
    code: 'fr-FR',
    name: 'Français',
    dateFormat: 'DD MMMM YYYY',
    locale: 'fr-FR',
    sectionTitles: {
      'Features': '✨ Fonctionnalités',
      'Bug Fixes': '🐛 Corrections de Bugs',
      'Performance': '⚡ Performance',
      'Code Refactoring': '♻️ Refactorisation',
      'Documentation': '📝 Documentation',
      'Styles': '💄 Styles',
      'Tests': '✅ Tests',
      'Build System': '📦 Système de Build',
      'CI/CD': '👷 CI/CD',
      'Chores': '🔧 Autres',
      'Breaking Changes': '💥 Changements Incompatibles',
      'Contributors': '👥 Contributeurs',
      'Dependencies': '📦 Dépendances',
      'Security': '🔒 Sécurité',
    },
  },
  'de-DE': {
    code: 'de-DE',
    name: 'Deutsch',
    dateFormat: 'DD. MMMM YYYY',
    locale: 'de-DE',
    sectionTitles: {
      'Features': '✨ Funktionen',
      'Bug Fixes': '🐛 Fehlerbehebungen',
      'Performance': '⚡ Leistung',
      'Code Refactoring': '♻️ Code-Refactoring',
      'Documentation': '📝 Dokumentation',
      'Styles': '💄 Stile',
      'Tests': '✅ Tests',
      'Build System': '📦 Build-System',
      'CI/CD': '👷 CI/CD',
      'Chores': '🔧 Sonstiges',
      'Breaking Changes': '💥 Breaking Changes',
      'Contributors': '👥 Mitwirkende',
      'Dependencies': '📦 Abhängigkeiten',
      'Security': '🔒 Sicherheit',
    },
  },
}

/**
 * 多语言翻译器
 */
export class MultiLangTranslator {
  private aiEnhancer?: AIEnhancer
  private options: Required<Omit<TranslationOptions, 'aiConfig'>> & { aiConfig?: AIConfig }

  constructor(options: TranslationOptions) {
    this.options = {
      provider: options.provider || 'ai',
      preserveOriginal: options.preserveOriginal ?? false,
      glossary: options.glossary || {},
      outputPattern: options.outputPattern || 'CHANGELOG.{lang}.md',
      aiConfig: options.aiConfig,
      translateCommits: options.translateCommits ?? true,
      translateSections: options.translateSections ?? true,
      translateContributors: options.translateContributors ?? false,
      targetLanguages: options.targetLanguages,
    }

    // 初始化 AI 增强器（如果使用 AI 翻译）
    if (this.options.provider === 'ai' && this.options.aiConfig) {
      this.aiEnhancer = new AIEnhancer(this.options.aiConfig)
    }
  }

  /**
   * 翻译 Changelog 内容到多种语言
   */
  async translate(
    content: ChangelogContent,
    outputDir: string = '.'
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = []

    for (const lang of this.options.targetLanguages) {
      const startTime = Date.now()

      try {
        logger.info(`正在翻译到 ${lang}...`)

        const translatedContent = await this.translateContent(content, lang)
        const outputPath = this.generateOutputPath(outputDir, lang)

        results.push({
          language: lang,
          content: translatedContent,
          outputPath,
          duration: Date.now() - startTime,
        })

        logger.success(`${lang} 翻译完成`)
      } catch (error: any) {
        logger.error(`${lang} 翻译失败: ${error.message}`)

        // 翻译失败时回退到原始内容
        results.push({
          language: lang,
          content: content,
          outputPath: this.generateOutputPath(outputDir, lang),
          duration: Date.now() - startTime,
          error: error.message,
        })
      }
    }

    return results
  }

  /**
   * 翻译单个 Changelog 内容
   */
  private async translateContent(
    content: ChangelogContent,
    targetLang: string
  ): Promise<ChangelogContent> {
    const langConfig = LANGUAGE_CONFIGS[targetLang]

    if (!langConfig) {
      throw new Error(`不支持的语言: ${targetLang}`)
    }

    // 翻译章节
    const translatedSections = await this.translateSections(
      content.sections,
      targetLang,
      langConfig
    )

    // 翻译提交
    const translatedCommits = await this.translateCommits(
      content.commits,
      targetLang
    )

    // 翻译破坏性变更
    const translatedBreakingChanges = content.breakingChanges
      ? await this.translateBreakingChanges(content.breakingChanges, targetLang)
      : undefined

    // 翻译贡献者（通常不翻译名字，但可以翻译标题）
    const translatedContributors = content.contributors

    return {
      ...content,
      sections: translatedSections,
      commits: translatedCommits,
      breakingChanges: translatedBreakingChanges,
      contributors: translatedContributors,
      date: this.formatDate(new Date(content.date), langConfig),
    }
  }

  /**
   * 翻译章节
   */
  private async translateSections(
    sections: ChangelogSection[],
    targetLang: string,
    langConfig: LanguageConfig
  ): Promise<ChangelogSection[]> {
    if (!this.options.translateSections) {
      return sections
    }

    return Promise.all(
      sections.map(async (section) => {
        // 首先尝试使用预定义的章节标题
        let translatedTitle = langConfig.sectionTitles[section.title] || section.title

        // 如果没有预定义翻译且启用了 AI 翻译，则使用 AI
        if (
          translatedTitle === section.title &&
          this.aiEnhancer &&
          this.options.provider === 'ai'
        ) {
          try {
            translatedTitle = await this.aiEnhancer.translate(
              section.title,
              langConfig.name
            )
          } catch (error) {
            logger.warn(`章节标题翻译失败，使用原文: ${section.title}`)
          }
        }

        // 翻译章节中的提交
        const translatedCommits = await this.translateCommits(
          section.commits,
          targetLang
        )

        return {
          ...section,
          title: translatedTitle,
          commits: translatedCommits,
        }
      })
    )
  }

  /**
   * 翻译提交列表
   */
  private async translateCommits(
    commits: ChangelogCommit[],
    targetLang: string
  ): Promise<ChangelogCommit[]> {
    if (!this.options.translateCommits || !this.aiEnhancer) {
      return commits
    }

    const translatedCommits: ChangelogCommit[] = []

    for (const commit of commits) {
      try {
        const translatedCommit = await this.translateCommit(commit, targetLang)
        translatedCommits.push(translatedCommit)
      } catch (error) {
        logger.warn(`提交翻译失败，使用原文: ${commit.hash}`)
        translatedCommits.push(commit)
      }
    }

    return translatedCommits
  }

  /**
   * 翻译单个提交
   */
  private async translateCommit(
    commit: ChangelogCommit,
    targetLang: string
  ): Promise<ChangelogCommit> {
    const langConfig = LANGUAGE_CONFIGS[targetLang]

    if (!langConfig || !this.aiEnhancer) {
      return commit
    }

    // 应用术语表
    let subject = commit.subject
    let body = commit.body

    if (this.options.glossary[targetLang]) {
      const glossary = this.options.glossary[targetLang]
      for (const [term, translation] of Object.entries(glossary)) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi')
        subject = subject.replace(regex, translation)
        if (body) {
          body = body.replace(regex, translation)
        }
      }
    }

    // 使用 AI 翻译
    try {
      const translatedSubject = await this.aiEnhancer.translate(
        subject,
        langConfig.name
      )

      let translatedBody: string | undefined
      if (body) {
        translatedBody = await this.aiEnhancer.translate(body, langConfig.name)
      }

      return {
        ...commit,
        subject: translatedSubject.trim(),
        body: translatedBody?.trim(),
      }
    } catch (error) {
      // 翻译失败，返回原始内容
      return commit
    }
  }

  /**
   * 翻译破坏性变更
   */
  private async translateBreakingChanges(
    breakingChanges: BreakingChange[],
    targetLang: string
  ): Promise<BreakingChange[]> {
    if (!this.aiEnhancer) {
      return breakingChanges
    }

    const langConfig = LANGUAGE_CONFIGS[targetLang]
    if (!langConfig) {
      return breakingChanges
    }

    return Promise.all(
      breakingChanges.map(async (change) => {
        try {
          const translatedDescription = await this.aiEnhancer!.translate(
            change.description,
            langConfig.name
          )

          let translatedMigration: string | undefined
          if (change.migration) {
            translatedMigration = await this.aiEnhancer!.translate(
              change.migration,
              langConfig.name
            )
          }

          return {
            ...change,
            description: translatedDescription.trim(),
            migration: translatedMigration?.trim(),
          }
        } catch (error) {
          logger.warn(`破坏性变更翻译失败，使用原文`)
          return change
        }
      })
    )
  }

  /**
   * 格式化日期
   */
  formatDate(date: Date, langConfig: LanguageConfig): string {
    // 简单的日期格式化实现
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    // 根据语言配置格式化
    switch (langConfig.code) {
      case 'zh-CN':
      case 'ja-JP':
        return `${year}年${month}月${day}日`
      case 'en-US':
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ]
        return `${monthNames[date.getMonth()]} ${day}, ${year}`
      case 'es-ES':
        const monthNamesES = [
          'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
          'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ]
        return `${day} de ${monthNamesES[date.getMonth()]} de ${year}`
      case 'fr-FR':
        const monthNamesFR = [
          'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
          'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
        ]
        return `${day} ${monthNamesFR[date.getMonth()]} ${year}`
      case 'de-DE':
        const monthNamesDE = [
          'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
          'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
        ]
        return `${day}. ${monthNamesDE[date.getMonth()]} ${year}`
      default:
        return `${year}-${month}-${day}`
    }
  }

  /**
   * 格式化数字
   */
  formatNumber(num: number, locale: string): string {
    try {
      return new Intl.NumberFormat(locale).format(num)
    } catch (error) {
      return String(num)
    }
  }

  /**
   * 生成输出文件路径
   */
  private generateOutputPath(outputDir: string, lang: string): string {
    const filename = this.options.outputPattern.replace('{lang}', lang)
    return path.join(outputDir, filename)
  }

  /**
   * 获取支持的语言列表
   */
  static getSupportedLanguages(): string[] {
    return Object.keys(LANGUAGE_CONFIGS)
  }

  /**
   * 获取语言配置
   */
  static getLanguageConfig(lang: string): LanguageConfig | undefined {
    return LANGUAGE_CONFIGS[lang]
  }
}

/**
 * 创建多语言翻译器
 */
export function createMultiLangTranslator(
  options: TranslationOptions
): MultiLangTranslator {
  return new MultiLangTranslator(options)
}
