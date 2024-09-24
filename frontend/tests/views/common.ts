import { vi } from 'vitest'
import { runtimeConfiguration } from '@/plugins/runtimeConfiguration'
import { httpPlugin } from '@/plugins/http'
import { createTestingPinia } from '@pinia/testing'
import { config, RouterLinkStub } from '@vue/test-utils'
import { createRouterMock, injectRouterMock } from 'vue-router-mock'

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
      createSpy: vi.fn,
      stubActions: false
    })
  ]
  config.global.stubs = {
    RouterLink: RouterLinkStub
  }

  const router = createRouterMock({
    spy: {
      create: (fn: any) => vi.fn(fn),
      reset: (spy: any) => spy.mockRestore()
    }
  })

  router.reset()
  injectRouterMock(router)

  return router
}
