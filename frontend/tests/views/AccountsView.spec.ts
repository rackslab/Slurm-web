import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountsView from '@/views/AccountsView.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterAssociation } from '@/composables/GatewayAPI'
import associations from '../assets/associations.json'
import ErrorAlert from '@/components/ErrorAlert.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import AccountTreeNode from '@/components/accounts/AccountTreeNode.vue'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterAssociation[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('AccountsView.vue', () => {
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

  test('displays accounts page', () => {
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = associations

    const wrapper = mount(AccountsView, {
      props: {
        cluster: 'foo'
      }
    })

    // Check page title and description
    expect(wrapper.get('h1').text()).toBe('Accounts')
    expect(wrapper.text()).toContain('Accounts defined on cluster')

    // Count unique accounts (excluding user associations)
    const uniqueAccounts = associations.filter((a) => !a.user).length

    // Check account count
    expect(wrapper.text()).toContain(uniqueAccounts.toString())
    expect(wrapper.text()).toContain('account' + (uniqueAccounts > 1 ? 's' : ''))

    // Check tree nodes
    const treeNodes = wrapper.findAllComponents(AccountTreeNode)
    expect(treeNodes.length).toBeGreaterThan(0)
  })

  test('shows loading spinner when data is not loaded', () => {
    mockClusterDataPoller.loaded.value = false

    const wrapper = mount(AccountsView, {
      props: {
        cluster: 'foo'
      }
    })

    wrapper.getComponent(LoadingSpinner)
    expect(wrapper.text()).toContain('Loading accounts…')
  })

  test('shows error alert when unable to retrieve associations', () => {
    mockClusterDataPoller.unable.value = true
    mockClusterDataPoller.loaded.value = true

    const wrapper = mount(AccountsView, {
      props: {
        cluster: 'foo'
      }
    })

    const errorAlert = wrapper.getComponent(ErrorAlert)
    expect(errorAlert.text()).toContain('Unable to retrieve associations from cluster')
    expect(errorAlert.text()).toContain('foo')
  })

  test('shows info alert when no associations', () => {
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = []

    const wrapper = mount(AccountsView, {
      props: {
        cluster: 'foo'
      }
    })

    const infoAlert = wrapper.getComponent(InfoAlert)
    expect(infoAlert.text()).toContain('No association defined on cluster')
    expect(infoAlert.text()).toContain('foo')
  })
})
