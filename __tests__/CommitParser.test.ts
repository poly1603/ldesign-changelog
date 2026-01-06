/**
 * CommitParser 测试
 */

import { describe, it, expect } from 'vitest'
import { CommitParser } from '../src/core/CommitParser'
import type { GitCommit } from '../src/types/changelog'

describe('CommitParser', () => {
  const mockCommit: GitCommit = {
    hash: 'abc123def456',
    shortHash: 'abc123d',
    subject: 'feat(auth): add user login',
    body: 'Implemented user authentication\n\nCloses #123',
    authorName: 'John Doe',
    authorEmail: 'john@example.com',
    date: '2025-01-01',
    timestamp: 1704067200,
  }

  it('应该正确解析 Conventional Commit 格式', () => {
    const parser = new CommitParser()
    const result = parser.parseCommit(mockCommit)

    expect(result).toBeDefined()
    expect(result?.type).toBe('feat')
    expect(result?.scope).toBe('auth')
    expect(result?.subject).toBe('add user login')
  })

  it('应该提取 Issues 引用', () => {
    const parser = new CommitParser()
    const result = parser.parseCommit(mockCommit)

    expect(result?.issues).toContain('123')
  })

  it('应该识别 Breaking Change', () => {
    const commitWithBreaking: GitCommit = {
      ...mockCommit,
      body: 'BREAKING CHANGE: API endpoint changed',
    }

    const parser = new CommitParser()
    const result = parser.parseCommit(commitWithBreaking)

    expect(result?.breaking).toBe(true)
    expect(result?.breakingDescription).toBe('API endpoint changed')
  })

  it('应该跳过隐藏类型', () => {
    const parser = new CommitParser({
      hiddenTypes: ['chore'],
    })

    const choreCommit: GitCommit = {
      ...mockCommit,
      subject: 'chore: update dependencies',
    }

    const result = parser.parseCommit(choreCommit)
    expect(result).toBeNull()
  })

  it('应该按类型分组提交', () => {
    const parser = new CommitParser()

    const commits = [
      parser.parseCommit(mockCommit),
      parser.parseCommit({ ...mockCommit, subject: 'fix: bug fix' }),
      parser.parseCommit({ ...mockCommit, subject: 'feat: another feature' }),
    ].filter(Boolean)

    const groups = parser.groupByType(commits as any[])

    expect(groups.size).toBe(2)
    expect(groups.has('feat')).toBe(true)
    expect(groups.has('fix')).toBe(true)
    expect(groups.get('feat')?.length).toBe(2)
    expect(groups.get('fix')?.length).toBe(1)
  })

  describe('Validation - Detailed Error Feedback', () => {
    it('应该提供具体的格式错误反馈', () => {
      const parser = new CommitParser({
        enableValidation: true,
        provideSuggestions: true,
      })

      const result = parser.validate('invalid commit message')

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0].type).toBe('format')
      expect(result.errors![0].message).toContain('does not match')
      expect(result.errors![0].expected).toBe('type(scope): subject')
      expect(result.errors![0].actual).toBe('invalid commit message')
    })

    it('应该验证 scope 白名单', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          allowedScopes: ['auth', 'api', 'ui'],
        },
        enableValidation: true,
      })

      const result = parser.validate('feat(database): add new table')

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      const scopeError = result.errors!.find(e => e.type === 'scope')
      expect(scopeError).toBeDefined()
      expect(scopeError!.message).toContain('Invalid scope: database')
      expect(scopeError!.expected).toBe('auth, api, ui')
      expect(scopeError!.actual).toBe('database')
    })

    it('应该检测过长的提交主题', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          maxSubjectLength: 50,
        },
        enableValidation: true,
      })

      const longSubject = 'a'.repeat(60)
      const result = parser.validate(`feat: ${longSubject}`)

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      const lengthError = result.errors!.find(e => e.type === 'length')
      expect(lengthError).toBeDefined()
      expect(lengthError!.message).toContain('too long')
      expect(lengthError!.message).toContain('60 characters')
      expect(lengthError!.message).toContain('max: 50')
    })

    it('应该检测无效的提交类型', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          allowedTypes: ['feat', 'fix', 'docs'],
        },
        enableValidation: true,
      })

      const result = parser.validate('chore: update dependencies')

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      const typeError = result.errors!.find(e => e.type === 'type')
      expect(typeError).toBeDefined()
      expect(typeError!.message).toContain('Invalid commit type: chore')
      expect(typeError!.expected).toBe('feat, fix, docs')
      expect(typeError!.actual).toBe('chore')
    })

    it('应该检测缺失的必需 scope', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          requireScope: true,
        },
        enableValidation: true,
      })

      const result = parser.validate('feat: add new feature')

      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      const scopeError = result.errors!.find(e => e.type === 'scope')
      expect(scopeError).toBeDefined()
      expect(scopeError!.message).toContain('required')
    })

    it('应该为有效的提交返回成功', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          allowedTypes: ['feat', 'fix'],
          maxSubjectLength: 72,
        },
        enableValidation: true,
      })

      const result = parser.validate('feat(auth): add login')

      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })
  })

  describe('Auto-Fix Suggestions', () => {
    it('应该为格式错误生成修复建议', () => {
      const parser = new CommitParser({
        enableValidation: true,
        provideSuggestions: true,
      })

      const suggestions = parser.generateFixSuggestions('invalid message')

      expect(suggestions).toBeDefined()
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.includes('format'))).toBe(true)
      expect(suggestions.some(s => s.includes('type(scope): subject'))).toBe(true)
    })

    it('应该为无效类型提供建议', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          allowedTypes: ['feat', 'fix', 'docs'],
        },
        enableValidation: true,
        provideSuggestions: true,
      })

      const suggestions = parser.generateFixSuggestions('chore: update deps')

      expect(suggestions).toBeDefined()
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.includes('feat, fix, docs'))).toBe(true)
    })

    it('应该为过长主题提供缩短建议', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          maxSubjectLength: 50,
        },
        enableValidation: true,
        provideSuggestions: true,
      })

      const longSubject = 'a'.repeat(60)
      const suggestions = parser.generateFixSuggestions(`feat: ${longSubject}`)

      expect(suggestions).toBeDefined()
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.toLowerCase().includes('shorten'))).toBe(true)
    })

    it('应该为缺失 scope 提供建议', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          requireScope: true,
        },
        enableValidation: true,
        provideSuggestions: true,
      })

      const suggestions = parser.generateFixSuggestions('feat: add feature')

      expect(suggestions).toBeDefined()
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.toLowerCase().includes('scope'))).toBe(true)
    })

    it('应该为有效提交返回成功消息', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          allowedTypes: ['feat', 'fix'],
        },
        enableValidation: true,
      })

      const suggestions = parser.generateFixSuggestions('feat(auth): add login')

      expect(suggestions).toBeDefined()
      expect(suggestions.length).toBe(1)
      expect(suggestions[0]).toBe('Commit message is valid')
    })

    it('应该检测常见错误模式并提供修复建议', () => {
      const parser = new CommitParser({
        enableValidation: true,
        provideSuggestions: true,
      })

      // Test various common error patterns
      const testCases = [
        { input: 'Added new feature', expectedKeyword: 'format' },
        { input: 'feat add feature', expectedKeyword: 'format' },
        { input: 'feat(: add feature', expectedKeyword: 'format' },
      ]

      for (const testCase of testCases) {
        const suggestions = parser.generateFixSuggestions(testCase.input)
        expect(suggestions.some(s => s.toLowerCase().includes(testCase.expectedKeyword))).toBe(true)
      }
    })

    it('应该为相似类型提供"Did you mean"建议', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          allowedTypes: ['feat', 'fix', 'docs'],
        },
        enableValidation: true,
        provideSuggestions: true,
      })

      // "fea" is close to "feat"
      const result = parser.validate('fea: add feature')

      expect(result.suggestions).toBeDefined()
      expect(result.suggestions!.some(s => s.includes('feat'))).toBe(true)
    })

    it('应该为相似 scope 提供"Did you mean"建议', () => {
      const parser = new CommitParser({
        template: {
          pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
          allowedScopes: ['auth', 'api', 'ui'],
        },
        enableValidation: true,
        provideSuggestions: true,
      })

      // "aut" is close to "auth"
      const result = parser.validate('feat(aut): add feature')

      expect(result.suggestions).toBeDefined()
      expect(result.suggestions!.some(s => s.includes('auth'))).toBe(true)
    })
  })
})

