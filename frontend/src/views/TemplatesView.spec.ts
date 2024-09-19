import { describe, test, beforeEach, expect } from 'vitest'
import { config, mount, RouterLinkStub } from '@vue/test-utils'
import { runtimeConfiguration } from '@/plugins/runtimeConfiguration'
import { httpPlugin } from '@/plugins/http'
import { setActivePinia, createPinia } from 'pinia'
import TemplatesView from './TemplatesView.vue'

describe('TemplatesView.vue', () => {
  // Basic runtime configuration
  const runtimeConfigurationOptions = {
    api_server: 'http://localhost',
    authentication: true
  }
  // Load plugins used by view
  config.global.plugins = [[runtimeConfiguration, runtimeConfigurationOptions], httpPlugin]
  // Stubs for RouterLink rendered in template
  config.global.stubs = { RouterLink: RouterLinkStub }

  beforeEach(() => {
    /*
     * Creates a fresh pinia and makes it active so it's automatically picked up
     * by any useStore() call without having to pass it to it: `useStore(pinia)`
     */
    setActivePinia(createPinia())
  })
  test('should display title', async () => {
    const wrapper = mount(TemplatesView, {
      props: {
        cluster: 'foo'
      }
    })

    const button = wrapper.get('button#create')
    expect(button.get('span').text()).toBe('Create new template')
  })
})
