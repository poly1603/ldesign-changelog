/**
 * InteractiveCLI 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InteractiveCLI, createInteractiveCLI } from '../src/cli/InteractiveCLI.js'

describe('InteractiveCLI', () => {
  describe('创建实例', () => {
    it('应该使用默认选项创建实例', () => {
      const cli = createInteractiveCLI()
      expect(cli).toBeInstanceOf(InteractiveCLI)
    })

    it('应该使用自定义选项创建实例', () => {
      const cli = createInteractiveCLI({
        theme: 'colorful',
        showHints: false,
      })
      expect(cli).toBeInstanceOf(InteractiveCLI)
    })
  })

  describe('主题配置', () => {
    it('应该支持 default 主题', () => {
      const cli = createInteractiveCLI({ theme: 'default' })
      expect(cli).toBeInstanceOf(InteractiveCLI)
    })

    it('应该支持 minimal 主题', () => {
      const cli = createInteractiveCLI({ theme: 'minimal' })
      expect(cli).toBeInstanceOf(InteractiveCLI)
    })

    it('应该支持 colorful 主题', () => {
      const cli = createInteractiveCLI({ theme: 'colorful' })
      expect(cli).toBeInstanceOf(InteractiveCLI)
    })
  })

  describe('操作注册', () => {
    it('应该能够注册自定义操作', () => {
      const cli = createInteractiveCLI()
      const mockHandler = vi.fn()

      cli.registerAction({
        name: 'test',
        description: '测试操作',
        handler: mockHandler,
      })

      // 验证操作已注册（通过调用 showHelp 不抛出错误来验证）
      expect(() => cli.showHelp()).not.toThrow()
    })
  })

  describe('帮助信息', () => {
    it('应该能够显示帮助信息', () => {
      const cli = createInteractiveCLI()

      // 捕获控制台输出
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      cli.showHelp()

      // 验证有输出
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('预览功能', () => {
    it('应该能够显示预览内容', async () => {
      const cli = createInteractiveCLI()

      // Mock confirm function
      const { confirm } = await import('../src/utils/interactive.js')
      vi.mock('../src/utils/interactive.js', () => ({
        confirm: vi.fn().mockResolvedValue(true),
      }))

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      await cli.showPreview('测试内容')

      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('确认操作', () => {
    it('应该能够请求用户确认', async () => {
      const cli = createInteractiveCLI()

      // Mock confirm function
      vi.mock('../src/utils/interactive.js', () => ({
        confirm: vi.fn().mockResolvedValue(true),
      }))

      const result = await cli.confirm('确认操作?')

      // 由于 mock 的限制，这里只验证方法不抛出错误
      expect(typeof result).toBe('boolean')
    })
  })
})
