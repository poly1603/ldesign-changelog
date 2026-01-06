/**
 * CommitParser Validation Property-Based Tests
 * Feature: changelog-enhancement, Property 6: 提交验证反馈
 * Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { CommitParser } from '../src/core/CommitParser'
import type { CommitTemplate } from '../src/core/CommitParser'

describe('CommitParser Validation - Property-Based Tests', () => {
  // Arbitraries for generating test data
  const arbitraryCommitType = () => fc.oneof(
    fc.constantFrom('feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore'),
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s))
  )

  const arbitraryScope = () => fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z-]+$/.test(s))

  const arbitrarySubject = (maxLength = 100) =>
    fc.string({ minLength: 1, maxLength }).filter(s => s.trim().length > 0)

  const arbitraryValidCommit = () => fc.tuple(
    arbitraryCommitType(),
    fc.option(arbitraryScope(), { nil: undefined }),
    arbitrarySubject(50)
  ).map(([type, scope, subject]) =>
    scope ? `${type}(${scope}): ${subject}` : `${type}: ${subject}`
  )

  /**
   * Property 6.1: Invalid commit messages should provide specific error feedback
   * Validates: Requirements 7.2, 7.3
   */
  it('should provide specific error feedback for invalid commit messages', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/)),
        (invalidCommit) => {
          const parser = new CommitParser({
            enableValidation: true,
            provideSuggestions: true,
          })

          const result = parser.validate(invalidCommit)

          // Should be invalid
          expect(result.valid).toBe(false)

          // Should have errors
          expect(result.errors).toBeDefined()
          expect(result.errors!.length).toBeGreaterThan(0)

          // Should have format error
          const formatError = result.errors!.find(e => e.type === 'format')
          expect(formatError).toBeDefined()
          expect(formatError!.message).toBeTruthy()
          expect(formatError!.expected).toBeTruthy()
          expect(formatError!.actual).toBe(invalidCommit)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.2: Invalid types should be detected with expected types listed
   * Validates: Requirements 7.2, 7.3
   */
  it('should detect invalid types and list expected types', () => {
    const allowedTypes = ['feat', 'fix', 'docs']
    const template: CommitTemplate = {
      pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
      allowedTypes,
    }

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s) && !allowedTypes.includes(s)),
        arbitrarySubject(50),
        (invalidType, subject) => {
          const parser = new CommitParser({
            template,
            enableValidation: true,
            provideSuggestions: true,
          })

          const commitMessage = `${invalidType}: ${subject}`
          const result = parser.validate(commitMessage)

          // Should be invalid
          expect(result.valid).toBe(false)

          // Should have type error
          const typeError = result.errors!.find(e => e.type === 'type')
          expect(typeError).toBeDefined()
          expect(typeError!.message).toContain(invalidType)
          expect(typeError!.expected).toBe(allowedTypes.join(', '))
          expect(typeError!.actual).toBe(invalidType)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.3: Invalid scopes should be detected with whitelist validation
   * Validates: Requirements 7.4
   */
  it('should validate scopes against whitelist', () => {
    const allowedScopes = ['auth', 'api', 'ui']
    const template: CommitTemplate = {
      pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
      allowedScopes,
    }

    fc.assert(
      fc.property(
        arbitraryCommitType(),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z-]+$/.test(s) && !allowedScopes.includes(s)),
        arbitrarySubject(50),
        (type, invalidScope, subject) => {
          const parser = new CommitParser({
            template,
            enableValidation: true,
            provideSuggestions: true,
          })

          const commitMessage = `${type}(${invalidScope}): ${subject}`
          const result = parser.validate(commitMessage)

          // Should be invalid
          expect(result.valid).toBe(false)

          // Should have scope error
          const scopeError = result.errors!.find(e => e.type === 'scope')
          expect(scopeError).toBeDefined()
          expect(scopeError!.message).toContain(invalidScope)
          expect(scopeError!.expected).toBe(allowedScopes.join(', '))
          expect(scopeError!.actual).toBe(invalidScope)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.4: Overly long subjects should be detected
   * Validates: Requirements 7.5
   */
  it('should detect overly long commit subjects', () => {
    const maxLength = 50

    fc.assert(
      fc.property(
        arbitraryCommitType(),
        fc.option(arbitraryScope(), { nil: undefined }),
        fc.string({ minLength: maxLength + 1, maxLength: 150 }),
        (type, scope, longSubject) => {
          const template: CommitTemplate = {
            pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
            maxSubjectLength: maxLength,
          }

          const parser = new CommitParser({
            template,
            enableValidation: true,
            provideSuggestions: true,
          })

          const commitMessage = scope
            ? `${type}(${scope}): ${longSubject}`
            : `${type}: ${longSubject}`

          const result = parser.validate(commitMessage)

          // Should be invalid
          expect(result.valid).toBe(false)

          // Should have length error
          const lengthError = result.errors!.find(e => e.type === 'length')
          expect(lengthError).toBeDefined()
          expect(lengthError!.message).toContain('too long')
          expect(lengthError!.expected).toContain(`${maxLength}`)
          expect(lengthError!.actual).toContain(`${longSubject.length}`)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.5: Valid commits should pass validation
   * Validates: Requirements 7.2
   */
  it('should validate correct commit messages as valid', () => {
    const allowedTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore']
    const template: CommitTemplate = {
      pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
      allowedTypes,
      maxSubjectLength: 72,
    }

    fc.assert(
      fc.property(
        fc.constantFrom(...allowedTypes),
        fc.option(arbitraryScope(), { nil: undefined }),
        arbitrarySubject(50),
        (type, scope, subject) => {
          const parser = new CommitParser({
            template,
            enableValidation: true,
          })

          const commitMessage = scope
            ? `${type}(${scope}): ${subject}`
            : `${type}: ${subject}`

          const result = parser.validate(commitMessage)

          // Should be valid
          expect(result.valid).toBe(true)
          expect(result.errors).toBeUndefined()

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.6: Suggestions should be provided when enabled
   * Validates: Requirements 7.6
   */
  it('should provide fix suggestions when enabled', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/)),
        (invalidCommit) => {
          const parser = new CommitParser({
            enableValidation: true,
            provideSuggestions: true,
          })

          const result = parser.validate(invalidCommit)

          // Should have suggestions
          expect(result.suggestions).toBeDefined()
          expect(result.suggestions!.length).toBeGreaterThan(0)

          // Suggestions should be helpful strings
          result.suggestions!.forEach(suggestion => {
            expect(typeof suggestion).toBe('string')
            expect(suggestion.length).toBeGreaterThan(0)
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.7: Missing required scope should be detected
   * Validates: Requirements 7.4
   */
  it('should detect missing required scope', () => {
    const template: CommitTemplate = {
      pattern: /^(\w+)(?:\(([^)]+)\))?: (.+)$/,
      requireScope: true,
    }

    fc.assert(
      fc.property(
        arbitraryCommitType(),
        arbitrarySubject(50),
        (type, subject) => {
          const parser = new CommitParser({
            template,
            enableValidation: true,
            provideSuggestions: true,
          })

          const commitMessage = `${type}: ${subject}`
          const result = parser.validate(commitMessage)

          // Should be invalid
          expect(result.valid).toBe(false)

          // Should have scope error
          const scopeError = result.errors!.find(e => e.type === 'scope')
          expect(scopeError).toBeDefined()
          expect(scopeError!.message).toContain('required')

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.8: generateFixSuggestions should provide actionable suggestions
   * Validates: Requirements 7.6
   */
  it('should generate actionable fix suggestions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (commitMessage) => {
          const parser = new CommitParser({
            enableValidation: true,
            provideSuggestions: true,
          })

          const suggestions = parser.generateFixSuggestions(commitMessage)

          // Should always return suggestions
          expect(suggestions).toBeDefined()
          expect(Array.isArray(suggestions)).toBe(true)
          expect(suggestions.length).toBeGreaterThan(0)

          // Each suggestion should be a non-empty string
          suggestions.forEach(suggestion => {
            expect(typeof suggestion).toBe('string')
            expect(suggestion.length).toBeGreaterThan(0)
          })

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
