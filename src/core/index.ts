/**
 * 核心模块入口
 */

export * from './ChangelogGenerator.js'
export {
  CommitParser,
  createCommitParser,
  type CommitParserConfig,
  type CommitTemplate,
  type ValidationResult as CommitValidationResult,
  type ValidationError as CommitValidationError,
} from './CommitParser.js'
export * from './StatsAnalyzer.js'
export * from './TemplateEngine.js'
export * from './PluginManager.js'
export * from './MonorepoManager.js'
export * from './CommitLinter.js'
export {
  ChangelogValidator,
  createChangelogValidator,
  type ValidationResult as ChangelogValidationResult,
  type ValidationError as ChangelogValidationError,
  type ValidationWarning,
} from './ChangelogValidator.js'
export * from './VersionAnalyzer.js'
export * from './AIEnhancer.js'
export * from './DependencyTracker.js'
export * from './SecurityScanner.js'
export * from './MigrationGenerator.js'
export * from './ChangelogMerger.js'
export * from './ChangelogImporter.js'
export * from './WatchManager.js'
export * from './MultiLangTranslator.js'
export * from './SearchEngine.js'
export * from './DiffAnalyzer.js'


