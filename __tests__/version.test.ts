/**
 * Version 工具测试
 */

import { describe, it, expect } from 'vitest'
import {
  parseVersion,
  isValidVersion,
  compareVersions,
  incrementVersion,
  cleanVersion,
  isPrerelease,
} from '../src/utils/version'

describe('Version Utils', () => {
  describe('parseVersion', () => {
    it('应该正确解析版本号', () => {
      const version = parseVersion('1.2.3')
      expect(version?.major).toBe(1)
      expect(version?.minor).toBe(2)
      expect(version?.patch).toBe(3)
    })

    it('应该解析带 v 前缀的版本号', () => {
      const version = parseVersion('v1.2.3')
      expect(version?.major).toBe(1)
    })
  })

  describe('isValidVersion', () => {
    it('应该验证有效版本号', () => {
      expect(isValidVersion('1.2.3')).toBe(true)
      expect(isValidVersion('v1.2.3')).toBe(true)
      expect(isValidVersion('1.0.0-alpha.1')).toBe(true)
    })

    it('应该拒绝无效版本号', () => {
      expect(isValidVersion('abc')).toBe(false)
      expect(isValidVersion('1.2')).toBe(false)
    })
  })

  describe('compareVersions', () => {
    it('应该正确比较版本号', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBeGreaterThan(0)
      expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0)
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    })
  })

  describe('incrementVersion', () => {
    it('应该递增 patch 版本', () => {
      expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4')
    })

    it('应该递增 minor 版本', () => {
      expect(incrementVersion('1.2.3', 'minor')).toBe('1.3.0')
    })

    it('应该递增 major 版本', () => {
      expect(incrementVersion('1.2.3', 'major')).toBe('2.0.0')
    })

    it('应该处理预发布版本', () => {
      expect(incrementVersion('1.0.0', 'prerelease', 'alpha')).toContain('alpha')
    })
  })

  describe('cleanVersion', () => {
    it('应该移除 v 前缀', () => {
      expect(cleanVersion('v1.2.3')).toBe('1.2.3')
    })

    it('应该保持没有前缀的版本', () => {
      expect(cleanVersion('1.2.3')).toBe('1.2.3')
    })
  })

  describe('isPrerelease', () => {
    it('应该识别预发布版本', () => {
      expect(isPrerelease('1.0.0-alpha.1')).toBe(true)
      expect(isPrerelease('1.0.0-beta.2')).toBe(true)
    })

    it('应该识别正式版本', () => {
      expect(isPrerelease('1.0.0')).toBe(false)
    })
  })
})

