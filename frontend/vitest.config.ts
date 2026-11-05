import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

// Node 25+ defines localStorage on globalThis as a getter that returns
// undefined. Vitest 4 then skips jsdom's Storage, so tests see localStorage as
// undefined.
//
// The flag --no-webstorage is added for Node 25+ to remove global localStorage
// and lets jsdom provide it. Node 24 and earlier reject the flag, so it's not
// added for earlier versions.
const execArgv =
  Number.parseInt(process.versions.node.split('.')[0] ?? '', 10) >= 25 ? ['--no-webstorage'] : []

export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      environment: 'jsdom',
      execArgv,
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      setupFiles: ['tests/lib/vitest-canvas.ts'],
    }
  })
)
