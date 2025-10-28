/**
 * 交互式工具
 */

import { createInterface } from 'readline'
import chalk from 'chalk'

/**
 * 选项接口
 */
export interface ChoiceOption {
  value: any
  label: string
  description?: string
  selected?: boolean
}

/**
 * 询问用户输入
 */
export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    const promptText = defaultValue
      ? `${question} ${chalk.gray(`(${defaultValue})`)}: `
      : `${question}: `

    rl.question(promptText, (answer) => {
      rl.close()
      resolve(answer.trim() || defaultValue || '')
    })
  })
}

/**
 * 确认操作
 */
export async function confirm(question: string, defaultValue = false): Promise<boolean> {
  const defaultText = defaultValue ? 'Y/n' : 'y/N'
  const answer = await prompt(`${question} (${defaultText})`)

  if (!answer) {
    return defaultValue
  }

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

/**
 * 单选列表
 */
export async function select<T = any>(
  question: string,
  choices: ChoiceOption[]
): Promise<T | null> {
  console.log(chalk.bold(`\n${question}\n`))

  choices.forEach((choice, index) => {
    const prefix = chalk.cyan(`${index + 1}.`)
    const label = choice.selected ? chalk.green(`✓ ${choice.label}`) : choice.label
    const description = choice.description ? chalk.gray(` - ${choice.description}`) : ''
    console.log(`${prefix} ${label}${description}`)
  })

  console.log()

  const answer = await prompt('请选择 (输入序号)', '1')
  const index = Number.parseInt(answer, 10) - 1

  if (index >= 0 && index < choices.length) {
    return choices[index].value
  }

  return null
}

/**
 * 多选列表
 */
export async function multiSelect<T = any>(
  question: string,
  choices: ChoiceOption[]
): Promise<T[]> {
  console.log(chalk.bold(`\n${question}\n`))
  console.log(chalk.gray('(使用空格分隔多个选项，如: 1 3 5)\n'))

  choices.forEach((choice, index) => {
    const prefix = chalk.cyan(`${index + 1}.`)
    const label = choice.selected ? chalk.green(`✓ ${choice.label}`) : choice.label
    const description = choice.description ? chalk.gray(` - ${choice.description}`) : ''
    console.log(`${prefix} ${label}${description}`)
  })

  console.log()

  const answer = await prompt('请选择 (输入序号，用空格分隔)', '')
  
  if (!answer) {
    return []
  }

  const indices = answer.split(/\s+/).map(n => Number.parseInt(n, 10) - 1)
  const selected: T[] = []

  for (const index of indices) {
    if (index >= 0 && index < choices.length) {
      selected.push(choices[index].value)
    }
  }

  return selected
}

/**
 * 编辑文本
 */
export async function editText(
  initialText: string,
  instruction?: string
): Promise<string> {
  console.log()
  if (instruction) {
    console.log(chalk.yellow(instruction))
  }

  console.log(chalk.gray('\n--- 原始内容 ---'))
  console.log(initialText)
  console.log(chalk.gray('--- 结束 ---\n'))

  const shouldEdit = await confirm('是否要编辑内容?', false)

  if (!shouldEdit) {
    return initialText
  }

  console.log(chalk.gray('\n提示: 逐行输入新内容，输入 "END" 结束编辑\n'))

  const lines: string[] = []
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    const readLine = () => {
      rl.question('', (line) => {
        if (line.trim() === 'END') {
          rl.close()
          resolve(lines.join('\n'))
        } else {
          lines.push(line)
          readLine()
        }
      })
    }

    readLine()
  })
}

/**
 * 显示加载动画
 */
export function loadingAnimation(message: string): () => void {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let index = 0
  let running = true

  const interval = setInterval(() => {
    if (!running) {
      return
    }
    process.stdout.write(`\r${chalk.cyan(frames[index])} ${message}`)
    index = (index + 1) % frames.length
  }, 80)

  return () => {
    running = false
    clearInterval(interval)
    process.stdout.write('\r\x1b[K') // 清除当前行
  }
}

/**
 * 显示进度条
 */
export function progressBar(current: number, total: number, width = 40): string {
  const percentage = Math.floor((current / total) * 100)
  const filled = Math.floor((current / total) * width)
  const empty = width - filled

  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${chalk.cyan(bar)} ${percentage}% (${current}/${total})`
}
