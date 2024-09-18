import { runtimeConfiguration } from '@/plugins/runtimeConfiguration'
import { httpPlugin } from '@/plugins/http'
import { setActivePinia, createPinia } from 'pinia'
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
    httpPlugin
  ]
  config.global.stubs = {
    RouterLink: RouterLinkStub
  }
}

export function init_stores() {
  /*
   * Creates a fresh pinia and makes it active so it's automatically picked up
   * by any useStore() call without having to pass it to it: `useStore(pinia)`
   */
  setActivePinia(createPinia())
}
