import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterLink } from 'vue-router'
import AccountView from '@/views/AccountView.vue'
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

describe('AccountView.vue', () => {
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

  test('displays account details', () => {
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = associations as ClusterAssociation[]

    const wrapper = mount(AccountView, {
      props: {
        cluster: 'foo',
        account: 'root'
      }
    })

    // Back to accounts button
    const buttons = wrapper.findAll('button')
    const backButton = buttons.find((btn) => btn.text().includes('Back to accounts'))
    expect(backButton).toBeDefined()

    // Account heading
    const accountHeading = wrapper.get('div#account-heading')
    expect(accountHeading.text()).toContain('Account root')

    // View jobs link
    const viewJobsLink = accountHeading.getComponent(RouterLink)
    expect(viewJobsLink.props('to')).toEqual({
      name: 'jobs',
      params: { cluster: 'foo' },
      query: { accounts: 'root' }
    })

    // Account definition
    const accountDefinition = wrapper.get('dl')

    // Parent accounts
    expect(accountDefinition.get('div#parents dt').text()).toBe('Parent accounts')
    accountDefinition.getComponent(AccountBreadcrumb)

    // Subaccounts
    expect(accountDefinition.text()).toContain('Subaccounts')
    const subaccountsSection = wrapper.get('div#subaccounts')
    const links = subaccountsSection.findAllComponents(RouterLink)
    expect(links.length).toBeGreaterThan(0)

    // QoS
    expect(accountDefinition.get('div#qos dt').text()).toBe('QoS')

    // Job limits
    const jobLimitsSection = accountDefinition.get('div#limits-jobs')
    expect(jobLimitsSection.get('dt').text()).toBe('Job limits')
    expect(jobLimitsSection.get('dd').text()).toContain('Running')
    expect(jobLimitsSection.get('dd').text()).toContain('Submitted')
    expect(jobLimitsSection.get('dd').text()).toContain('Running / user')
    expect(jobLimitsSection.get('dd').text()).toContain('Submitted / user')

    // Resource limits
    const resourceLimitsSection = accountDefinition.get('div#limits-resources')
    expect(resourceLimitsSection.get('dt').text()).toBe('Resource limits')
    expect(resourceLimitsSection.get('dd').text()).toContain('Total')
    expect(resourceLimitsSection.get('dd').text()).toContain('Per job')
    expect(resourceLimitsSection.get('dd').text()).toContain('Per node')

    // Time limits
    const timeLimitsSection = accountDefinition.get('div#limits-time')
    expect(accountDefinition.get('div#limits-time dt').text()).toBe('Time limits')
    expect(timeLimitsSection.get('dt').text()).toBe('Time limits')
    expect(timeLimitsSection.get('dd').text()).toContain('Total')
    expect(timeLimitsSection.get('dd').text()).toContain('Per job')

    // User associations table
    const userAssociationsTable = wrapper.get('table')
    expect(userAssociationsTable.get('thead').text()).toContain('User Associations')
    expect(userAssociationsTable.findAll('tbody tr').length).toBeGreaterThan(0)
  })

  test('shows loading spinner when data is not loaded', () => {
    mockClusterDataPoller.loaded.value = false

    const wrapper = mount(AccountView, {
      props: {
        cluster: 'foo',
        account: 'root'
      }
    })

    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(true)
    expect(wrapper.text()).toContain('Loading account details...')
  })

  test('shows error alert when unable to retrieve associations', () => {
    mockClusterDataPoller.unable.value = true
    mockClusterDataPoller.loaded.value = true

    const wrapper = mount(AccountView, {
      props: {
        cluster: 'foo',
        account: 'root'
      }
    })

    const errorAlert = wrapper.findComponent(ErrorAlert)
    expect(errorAlert.exists()).toBe(true)
    expect(errorAlert.text()).toContain('Unable to retrieve associations for cluster')
    expect(errorAlert.text()).toContain('foo')
  })

  test('shows info alert when account does not exist', () => {
    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = []

    const wrapper = mount(AccountView, {
      props: {
        cluster: 'foo',
        account: 'nonexistent'
      }
    })

    const infoAlert = wrapper.findComponent(InfoAlert)
    expect(infoAlert.exists()).toBe(true)
    expect(infoAlert.text()).toContain('Account nonexistent does not exist on this cluster')
  })

  test('displays empty symbol when no subaccounts', () => {
    // Create an account with no subaccounts
    const accountData: ClusterAssociation[] = [
      {
        account: 'leaf',
        parent_account: 'root',
        qos: [],
        user: '',
        max: associations[0].max
      }
    ]

    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = accountData

    const wrapper = mount(AccountView, {
      props: {
        cluster: 'foo',
        account: 'leaf'
      }
    })

    expect(wrapper.text()).toContain('Subaccounts')
    // Should show empty symbol
    const subaccountsSection = wrapper.get('div#subaccounts')
    expect(subaccountsSection.get('dd').text()).toBe('∅')
  })

  test('shows info alert when account has no user associations', () => {
    const accountData: ClusterAssociation[] = [
      {
        account: 'empty',
        parent_account: '',
        qos: [],
        user: '',
        max: associations[0].max
      }
    ]

    mockClusterDataPoller.loaded.value = true
    mockClusterDataPoller.data.value = accountData

    const wrapper = mount(AccountView, {
      props: {
        cluster: 'foo',
        account: 'empty'
      }
    })

    const infoAlert = wrapper.findComponent(InfoAlert)
    expect(infoAlert.exists()).toBe(true)
    expect(infoAlert.text()).toContain('has no end-user associations')
  })
})
