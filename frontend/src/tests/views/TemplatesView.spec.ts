import { describe, test, beforeEach, expect } from 'vitest'
import { config, mount, RouterLinkStub } from '@vue/test-utils'
import { runtimeConfiguration } from '@/plugins/runtimeConfiguration'
import { httpPlugin } from '@/plugins/http'
import { setActivePinia, createPinia } from 'pinia'
import TemplatesView from '@/views/TemplatesView.vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'

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

  test('should display the breadcrumb with the right titles and route', async () => {
    const wrapper = mount(TemplatesView, {
      props: {
        cluster: 'foo'
      }
    })

    const clusterMaintLayout = wrapper.getComponent(ClusterMainLayout)
    expect(clusterMaintLayout.props().breadcrumb).toEqual([
      { title: 'Jobs', routeName: 'jobs' },
      { title: 'Templates' }
    ])
  })

  test('should display back to jobs button', async () => {
    const wrapper = mount(TemplatesView, {
      props: {
        cluster: 'foo'
      }
    })

    const backButton = wrapper.get('button#backBtn')
    expect(backButton.text()).toContain('Back to jobs')
  })

  /*test('back btn should redirect to JobsView', async () => {
    const wrapper = mount(TemplatesView, {
      props: {
        cluster: 'foo',
        to: 'test'
      },
    })

  })*/

  test('should display title and description of the view', async () => {
    const wrapper = mount(TemplatesView, {
      props: {
        cluster: 'foo'
      }
    })

    const title = wrapper.get('p#title')
    const description = wrapper.get('p#description')
    expect(title.text()).toBe('Templates')
    expect(description.text()).toBe('Edit or create jobs templates')
  })

  test('should display create new template button', async () => {
    const wrapper = mount(TemplatesView, {
      props: {
        cluster: 'foo'
      }
    })

    const button = wrapper.get('button#create')
    expect(button.get('span').text()).toBe('Create new template')
  })

  /*test('should redirect to CreateTemplateView', async () => {
    const wrapper = mount(TemplatesView, {
      props: {
        cluster: 'foo'
      }
    })
  })*/
})
