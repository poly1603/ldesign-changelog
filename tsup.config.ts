import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts', 'src/core/index.ts', 'src/formatters/index.ts', 'src/types/index.ts', 'src/utils/index.ts', 'src/ui-server/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: ['@ldesign/kit', 'chalk', 'commander', 'ejs', 'execa', 'fs-extra', 'ora', 'boxen', 'cli-table3', 'dayjs']
})

