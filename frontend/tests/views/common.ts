import { ref } from 'vue'
import type { Ref } from 'vue'
import { vi } from 'vitest'
import { runtimeConfiguration } from '@/plugins/runtimeConfiguration'
import type { GatewayAnyClusterApiKey } from '@/composables/GatewayAPI'
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

interface MockClusterDataPoller<ResultType> {
  data: Ref<ResultType | undefined>
  unable: Ref<boolean>
  loaded: Ref<boolean>
  setCallback: (newCallback: GatewayAnyClusterApiKey) => void
  setParam: (newOtherParam: string | number) => void
}

export function getMockClusterDataPoller<ResultType>(): MockClusterDataPoller<ResultType> {
  return {
    data: ref(undefined),
    unable: ref(false),
    loaded: ref(true),
    setCallback: vi.fn(),
    setParam: vi.fn()
  }
}
