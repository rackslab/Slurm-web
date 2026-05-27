import { createApp } from 'vue'
import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { brandingPlugin } from '@/plugins/branding'

describe('branding plugin', () => {
  // brandingPlugin writes CSS variables on :root via inline styles;
  // clear them so each test starts from a clean document.
  beforeEach(() => {
    document.documentElement.style.cssText = ''
  })

  // Prevent custom properties from leaking into other test files in jsdom.
  afterEach(() => {
    document.documentElement.style.cssText = ''
  })

  test('applies colors from runtime configuration', () => {
    const app = createApp({ template: '<div />' })
    app.config.globalProperties.$rc = {
      colors: { main: '#112233', light: '#aabbcc' }
    }
    app.use(brandingPlugin)
    expect(
      document.documentElement.style.getPropertyValue('--color-slurmweb')
    ).toBe('#112233')
    expect(
      document.documentElement.style.getPropertyValue('--color-slurmweb-light')
    ).toBe('#aabbcc')
  })

  test('does nothing when runtime configuration has no colors', () => {
    const app = createApp({ template: '<div />' })
    app.config.globalProperties.$rc = {}
    app.use(brandingPlugin)
    expect(
      document.documentElement.style.getPropertyValue('--color-slurmweb')
    ).toBe('')
  })
})
