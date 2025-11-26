import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLink } from 'vue-router'
import UserView from '@/views/UserView.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterAssociation } from '@/composables/GatewayAPI'
import associations from '../assets/associations.json'
import ErrorAlert from '@/components/ErrorAlert.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import AccountBreadcrumb from '@/components/accounts/AccountBreadcrumb.vue'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterAssociation[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('UserView.vue', () => {
  beforeEach(() => {
    init_plugins()
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: [] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true
      }
    ]
    mockClusterDataPoller.data.value = undefined
    mockClusterDataPoller.unable.value = false
    mockClusterDataPoller.loaded.value = false
  })

  test('displays user details', () => {
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = associations as ClusterAssociation[]

    const wrapper = mount(UserView, {
      props: {
        cluster: 'foo',
        user: 'root'
      }
    })

    // Back to accounts button
    const buttons = wrapper.findAll('button')
    const backButton = buttons.find((btn) => btn.text().includes('Back to accounts'))
    expect(backButton).toBeDefined()

    // User heading
    const userHeading = wrapper.get('div#user-heading')
    expect(userHeading.text()).toContain('User root')

    // root is associated with root account only
    expect(userHeading.text()).toContain('1')
    expect(userHeading.text()).toContain('account associated')

    // View jobs link
    const viewJobsLink = userHeading.getComponent(RouterLink)
    expect(viewJobsLink.props('to')).toEqual({
      name: 'jobs',
      params: { cluster: 'foo' },
      query: { users: 'root' }
    })

    // User associations table
    const userAssociationsTable = wrapper.get('table')

    // Column headers
    const columnHeaders = userAssociationsTable.get('thead').findAll('th')
    expect(columnHeaders[0].text()).toBe('Account')
    expect(columnHeaders[1].text()).toBe('Job limits')
    expect(columnHeaders[2].text()).toBe('Resource limits')
    expect(columnHeaders[3].text()).toBe('Time limits')
    expect(columnHeaders[4].text()).toBe('QOS')
    expect(userAssociationsTable.findAll('tbody tr').length).toBeGreaterThan(0)

    // Check presence of breadcrumbs
    const breadcrumbs = userAssociationsTable.findAllComponents(AccountBreadcrumb)
    expect(breadcrumbs.length).toBeGreaterThan(0)
  })

  test('shows loading spinner when data is not loaded', () => {
    mockClusterDataPoller.loaded.value = false

    const wrapper = mount(UserView, {
      props: {
        cluster: 'foo',
        user: 'root'
      }
    })

    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading user details...')
  })

  test('shows error alert when unable to retrieve associations', () => {
    mockClusterDataPoller.unable.value = true
    mockClusterDataPoller.loaded.value = true

    const wrapper = mount(UserView, {
      props: {
        cluster: 'foo',
        user: 'root'
      }
    })

    const errorAlert = wrapper.findComponent(ErrorAlert)
    expect(errorAlert.exists()).toBe(true)
    expect(errorAlert.text()).toContain('Unable to retrieve associations for cluster')
    expect(errorAlert.text()).toContain('foo')
  })

  test('shows info alert when user has no associations', () => {
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = []

    const wrapper = mount(UserView, {
      props: {
        cluster: 'foo',
        user: 'nonexistent'
      }
    })

    const infoAlert = wrapper.findComponent(InfoAlert)
    expect(infoAlert.exists()).toBe(true)
    expect(infoAlert.text()).toContain('User nonexistent has no associations on this cluster')
  })
})
