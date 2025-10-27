# Contributing to @ldesign/changelog

感谢你考虑为 @ldesign/changelog 做出贡献！

## 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 克隆仓库

```bash
git clone https://github.com/ldesign/tools.git
cd tools/changelog
```

### 安装依赖

```bash
pnpm install
```

### 开发

```bash
# 开发模式（监听文件变化）
pnpm dev

# 构建
pnpm build

# 运行测试
pnpm test

# 运行测试（监听模式）
pnpm test:watch

# 代码检查
pnpm lint

# 自动修复代码问题
pnpm lint:fix

# 类型检查
pnpm type-check
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响代码运行）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统或外部依赖更新
- `ci`: CI/CD 配置更新
- `chore`: 其他不修改 src 或测试文件的更改

### Scope

- `core`: 核心功能
- `parser`: 解析器
- `formatter`: 格式化器
- `cli`: 命令行工具
- `utils`: 工具函数
- `types`: 类型定义
- `docs`: 文档
- `tests`: 测试

### 示例

```bash
feat(parser): 支持自定义 commit 正则表达式

添加了 customPattern 配置选项，允许用户自定义
commit 消息的解析规则。

Closes #123
```

## Pull Request 流程

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交你的更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

### PR 检查清单

在提交 PR 前，请确保：

- [ ] 代码通过所有测试
- [ ] 代码通过 lint 检查
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 提交消息符合规范
- [ ] 代码注释清晰

## 代码风格

- 使用 TypeScript
- 使用 ESLint 进行代码检查
- 遵循项目的 .editorconfig 配置
- 优先使用函数式编程风格
- 添加有意义的注释和 JSDoc

## 测试

### 编写测试

- 为新功能添加测试
- 为 bug 修复添加回归测试
- 确保测试覆盖率不降低

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test CommitParser

# 生成覆盖率报告
pnpm test:coverage
```

## 文档

### 更新文档

- 更新 README.md
- 更新 JSDoc 注释
- 添加使用示例
- 更新 CHANGELOG.md

## 发布流程

（仅限维护者）

1. 更新版本号
2. 生成 Changelog
3. 创建 Git tag
4. 推送到远程仓库
5. 发布到 npm

```bash
pnpm version patch
pnpm build
npm publish
```

## 问题反馈

如果你发现 bug 或有功能建议，请：

1. 搜索现有的 Issues，避免重复
2. 使用清晰的标题描述问题
3. 提供详细的复现步骤
4. 提供环境信息（Node.js 版本、操作系统等）

## 行为准则

请遵守我们的 [行为准则](CODE_OF_CONDUCT.md)，营造友好的社区环境。

## 许可证

通过贡献代码，你同意你的贡献将在 MIT 许可证下发布。

## 联系方式

- GitHub Issues: https://github.com/ldesign/tools/issues
- Email: support@ldesign.com

---

再次感谢你的贡献！ 🎉

