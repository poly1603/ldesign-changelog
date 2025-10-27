# @ldesign/changelog 项目结构

## 📁 完整目录结构

```
tools/changelog/
├── README.md                          # 主文档
├── LICENSE                            # MIT 许可证
├── CHANGELOG.md                       # 项目变更日志
├── CONTRIBUTING.md                    # 贡献指南
├── IMPLEMENTATION_SUMMARY.md          # 实施总结
├── PROJECT_STRUCTURE.md               # 本文件
├── package.json                       # 包配置
├── tsconfig.json                      # TypeScript 配置
├── tsup.config.ts                     # 构建配置
├── vitest.config.ts                   # 测试配置
├── .gitignore                         # Git 忽略文件
├── .npmignore                         # NPM 忽略文件
│
├── bin/                               # CLI 入口
│   └── cli.js                         # 命令行入口文件
│
├── src/                               # 源代码
│   ├── index.ts                       # 主入口
│   │
│   ├── cli/                           # CLI 模块
│   │   ├── index.ts                   # CLI 主文件
│   │   ├── config-loader.ts           # 配置加载器
│   │   └── commands/                  # 命令
│   │       ├── generate.ts            # generate 命令
│   │       ├── release.ts             # release 命令
│   │       ├── stats.ts               # stats 命令
│   │       └── init.ts                # init 命令
│   │
│   ├── core/                          # 核心模块
│   │   ├── index.ts                   # 核心导出
│   │   ├── ChangelogGenerator.ts      # Changelog 生成器
│   │   ├── CommitParser.ts            # 提交解析器
│   │   ├── StatsAnalyzer.ts           # 统计分析器
│   │   └── TemplateEngine.ts          # 模板引擎
│   │
│   ├── formatters/                    # 格式化器
│   │   ├── index.ts                   # 格式化器导出
│   │   ├── MarkdownFormatter.ts       # Markdown 格式化
│   │   ├── JsonFormatter.ts           # JSON 格式化
│   │   └── HtmlFormatter.ts           # HTML 格式化
│   │
│   ├── types/                         # 类型定义
│   │   ├── index.ts                   # 类型导出
│   │   ├── config.ts                  # 配置类型
│   │   ├── changelog.ts               # Changelog 类型
│   │   └── stats.ts                   # 统计类型
│   │
│   └── utils/                         # 工具函数
│       ├── index.ts                   # 工具导出
│       ├── logger.ts                  # 日志工具
│       ├── version.ts                 # 版本管理
│       ├── file.ts                    # 文件操作
│       └── git-utils.ts               # Git 工具
│
├── templates/                         # 模板文件
│   ├── markdown.ejs                   # Markdown 模板
│   └── custom.ejs                     # 自定义模板示例
│
└── __tests__/                         # 测试文件
    ├── CommitParser.test.ts           # 提交解析器测试
    ├── StatsAnalyzer.test.ts          # 统计分析器测试
    ├── MarkdownFormatter.test.ts      # Markdown 格式化器测试
    └── version.test.ts                # 版本工具测试
```

## 📦 构建产物结构（dist/）

构建后会生成以下文件：

```
dist/
├── index.js                           # ESM 主入口
├── index.cjs                          # CJS 主入口
├── index.d.ts                         # 类型声明
├── index.d.ts.map                     # 类型映射
│
├── cli/                               # CLI 模块
│   ├── index.js
│   ├── index.cjs
│   ├── index.d.ts
│   └── ...
│
├── core/                              # 核心模块
│   ├── index.js
│   ├── index.cjs
│   ├── index.d.ts
│   └── ...
│
├── formatters/                        # 格式化器
│   ├── index.js
│   ├── index.cjs
│   ├── index.d.ts
│   └── ...
│
├── types/                             # 类型定义
│   ├── index.js
│   ├── index.cjs
│   ├── index.d.ts
│   └── ...
│
└── utils/                             # 工具函数
    ├── index.js
    ├── index.cjs
    ├── index.d.ts
    └── ...
```

## 🎯 模块职责

### CLI 模块 (`src/cli/`)

**职责**：命令行界面和用户交互

- `index.ts` - CLI 主程序，解析命令行参数
- `config-loader.ts` - 加载和解析配置文件
- `commands/generate.ts` - 生成 Changelog 命令
- `commands/release.ts` - 发布版本命令
- `commands/stats.ts` - 统计分析命令
- `commands/init.ts` - 初始化配置命令

### 核心模块 (`src/core/`)

**职责**：核心业务逻辑

- `ChangelogGenerator.ts` - 主生成器，协调各模块
- `CommitParser.ts` - 解析 Git 提交信息
- `StatsAnalyzer.ts` - 分析提交统计数据
- `TemplateEngine.ts` - 模板渲染引擎

### 格式化器 (`src/formatters/`)

**职责**：输出格式化

- `MarkdownFormatter.ts` - Markdown 格式输出
- `JsonFormatter.ts` - JSON 格式输出
- `HtmlFormatter.ts` - HTML 格式输出

### 类型定义 (`src/types/`)

**职责**：TypeScript 类型定义

- `config.ts` - 配置相关类型
- `changelog.ts` - Changelog 数据类型
- `stats.ts` - 统计分析类型

### 工具函数 (`src/utils/`)

**职责**：通用工具函数

- `logger.ts` - 日志输出
- `version.ts` - 版本号处理
- `file.ts` - 文件操作
- `git-utils.ts` - Git 操作

## 🔄 模块依赖关系

```
┌─────────────────┐
│   CLI Commands  │ (用户入口)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ChangelogGen... │ (核心协调器)
└────┬───┬───┬────┘
     │   │   │
     ▼   ▼   ▼
┌──────┐ ┌──────┐ ┌──────┐
│Parser│ │Stats │ │Format│ (功能模块)
└──┬───┘ └──┬───┘ └──┬───┘
   │        │        │
   └────────┴────────┘
            │
            ▼
      ┌─────────┐
      │  Utils  │ (工具层)
      └─────────┘
```

## 📝 文件功能说明

### 配置文件

| 文件 | 用途 |
|------|------|
| `package.json` | NPM 包配置，依赖管理 |
| `tsconfig.json` | TypeScript 编译配置 |
| `tsup.config.ts` | 打包构建配置 |
| `vitest.config.ts` | 单元测试配置 |
| `.gitignore` | Git 忽略规则 |
| `.npmignore` | NPM 发布忽略规则 |

### 文档文件

| 文件 | 用途 |
|------|------|
| `README.md` | 用户使用文档 |
| `CHANGELOG.md` | 版本变更记录 |
| `CONTRIBUTING.md` | 贡献者指南 |
| `LICENSE` | 开源许可证 |
| `IMPLEMENTATION_SUMMARY.md` | 实施总结 |
| `PROJECT_STRUCTURE.md` | 项目结构说明 |

### 核心文件

| 文件 | 行数 | 功能 |
|------|------|------|
| `ChangelogGenerator.ts` | ~350 | 主生成器 |
| `CommitParser.ts` | ~230 | 提交解析 |
| `StatsAnalyzer.ts` | ~260 | 统计分析 |
| `TemplateEngine.ts` | ~150 | 模板引擎 |

### 格式化器

| 文件 | 行数 | 功能 |
|------|------|------|
| `MarkdownFormatter.ts` | ~230 | Markdown 输出 |
| `JsonFormatter.ts` | ~150 | JSON 输出 |
| `HtmlFormatter.ts` | ~380 | HTML 输出 |

### CLI 命令

| 文件 | 行数 | 功能 |
|------|------|------|
| `generate.ts` | ~60 | 生成命令 |
| `release.ts` | ~130 | 发布命令 |
| `stats.ts` | ~160 | 统计命令 |
| `init.ts` | ~100 | 初始化命令 |

## 🚀 构建和发布

### 构建流程

1. **类型检查**：`tsc --noEmit`
2. **代码检查**：`eslint src`
3. **构建**：`tsup`
   - 输出 ESM 格式 (`dist/**/*.js`)
   - 输出 CJS 格式 (`dist/**/*.cjs`)
   - 生成类型声明 (`dist/**/*.d.ts`)
   - 生成 sourcemap

### 发布流程

1. 运行测试：`pnpm test`
2. 构建项目：`pnpm build`
3. 更新版本：`npm version [patch|minor|major]`
4. 发布到 NPM：`npm publish`

## 🧪 测试覆盖

| 模块 | 测试文件 | 覆盖内容 |
|------|----------|---------|
| CommitParser | `CommitParser.test.ts` | 解析、分组、Breaking Changes |
| StatsAnalyzer | `StatsAnalyzer.test.ts` | 统计、贡献者、频率分析 |
| MarkdownFormatter | `MarkdownFormatter.test.ts` | 格式化、选项、输出 |
| version | `version.test.ts` | 版本解析、比较、递增 |

## 📦 NPM 包内容

发布到 NPM 的文件（基于 `files` 字段）：

```
@ldesign/changelog/
├── README.md
├── LICENSE
├── CHANGELOG.md
├── package.json
├── dist/          # 构建产物
├── bin/           # CLI 入口
└── templates/     # 模板文件
```

## 🎯 入口点

### 命令行

```bash
ldesign-changelog <command> [options]
```

### 程序化 (ESM)

```typescript
import { createChangelogGenerator } from '@ldesign/changelog'
```

### 程序化 (CJS)

```javascript
const { createChangelogGenerator } = require('@ldesign/changelog')
```

### 子模块

```typescript
// 核心模块
import { ChangelogGenerator } from '@ldesign/changelog/core'

// 格式化器
import { MarkdownFormatter } from '@ldesign/changelog/formatters'

// 类型
import type { ChangelogConfig } from '@ldesign/changelog/types'

// 工具
import { logger } from '@ldesign/changelog/utils'
```

## 💡 设计原则

1. **单一职责**：每个模块专注于一个功能
2. **依赖倒置**：高层模块不依赖低层模块
3. **开闭原则**：对扩展开放，对修改封闭
4. **接口隔离**：使用类型定义明确接口
5. **可测试性**：模块设计便于单元测试

## 📈 扩展点

系统设计了多个扩展点：

1. **自定义格式化器**：实现 Formatter 接口
2. **自定义模板**：提供 EJS 模板文件
3. **自定义配置**：通过配置文件定制行为
4. **自定义解析规则**：扩展 CommitParser
5. **自定义统计逻辑**：扩展 StatsAnalyzer

---

本文档描述了 @ldesign/changelog 的完整项目结构和组织方式。

