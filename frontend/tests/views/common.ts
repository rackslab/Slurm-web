import { vi } from 'vitest'
import { runtimeConfiguration } from '@/plugins/runtimeConfiguration'
import { httpPlugin } from '@/plugins/http'
import { createTestingPinia } from '@pinia/testing'
import { config, RouterLinkStub } from '@vue/test-utils'

export function init_plugins() {
  config.global.plugins = [
    [
      runtimeConfiguration,
      {
        api_server: 'http://localhost',
        authentication: true
      }
    ],
    httpPlugin,
    createTestingPinia({
      createSpy: vi.fn
    })
  ]
  config.global.stubs = {
    RouterLink: RouterLinkStub
  }
}
