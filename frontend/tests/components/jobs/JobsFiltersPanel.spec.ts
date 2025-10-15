import { describe, test, beforeEach, afterEach, expect } from 'vitest'
import { mount, config } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import { init_plugins } from '../../lib/common'
import JobsFiltersPanel from '@/components/jobs/JobsFiltersPanel.vue'
import { nextTick } from 'vue'
import { Dialog } from '@headlessui/vue'

describe('JobsFiltersPanel.vue', () => {
  beforeEach(() => {
    init_plugins()

    const cluster = {
      name: 'foo',
      permissions: {
        roles: ['admin'],
        actions: ['view-jobs', 'view-accounts', 'view-qos', 'view-partitions']
      },
      racksdb: true,
      infrastructure: 'foo',
      metrics: true,
      cache: true
    }

    const runtimeStore = useRuntimeStore()
    runtimeStore.availableClusters = [cluster]
    runtimeStore.currentCluster = cluster
  })

  test('renders and toggles state checkboxes bound to store', async () => {
    const wrapper = mount(JobsFiltersPanel, {
      props: { cluster: 'foo', nbJobs: 42 },
      global: {
        stubs: {
          // Headless UI stubs to keep content within wrapper and preserve attrs
          teleport: true,
          Dialog: { template: '<div v-bind="$attrs"><slot /></div>' },
          DialogPanel: { template: '<div v-bind="$attrs"><slot /></div>' },
          TransitionRoot: { template: '<div><slot /></div>' },
          TransitionChild: { template: '<div><slot /></div>' },
          Disclosure: { template: '<div><slot /></div>' },
          DisclosureButton: { template: '<button v-bind="$attrs"><slot /></button>' },
          DisclosurePanel: { template: '<div><slot /></div>' },
          UserFilterSelector: true,
          AccountFilterSelector: true,
          QosFilterSelector: true,
          PartitionFilterSelector: true
        }
      }
    })
    await nextTick()
    // Ensure panel is shown after mount as well
    useRuntimeStore().jobs.openFiltersPanel = true
    await nextTick()

    // Open the State disclosure to render checkboxes
    const panel = wrapper.find('#jobs-filters-panel')
    expect(panel.exists()).toBe(true)
    await panel.get('#disclosure-state-btn').trigger('click')
    await nextTick()

    // Find all state checkboxes from wrapper content
    const checkboxes = panel.findAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(4)

    const runtimeStore = useRuntimeStore()
    expect(runtimeStore.jobs.filters.states).toEqual([])

    // Click on first two state checkboxes and verify store updates via v-model
    await checkboxes[0].setValue(true)
    await nextTick()
    await checkboxes[1].setValue(true)
    await nextTick()
    expect(runtimeStore.jobs.filters.states.length).toBe(2)

    // Uncheck one
    await checkboxes[0].setValue(false)
    await nextTick()
    expect(runtimeStore.jobs.filters.states.length).toBe(1)

    wrapper.unmount()
  })

  test('shows users/accounts/qos/partitions when permissions are present', async () => {
    const runtimeStore = useRuntimeStore()
    const wrapper = mount(JobsFiltersPanel, {
      props: { cluster: 'foo', nbJobs: 0 },
      global: {
        stubs: {
          teleport: true,
          Dialog: { template: '<div v-bind="$attrs"><slot /></div>' },
          DialogPanel: { template: '<div v-bind="$attrs"><slot /></div>' },
          TransitionRoot: { template: '<div><slot /></div>' },
          TransitionChild: { template: '<div><slot /></div>' },
          Disclosure: { template: '<div><slot /></div>' },
          DisclosureButton: { template: '<button v-bind="$attrs"><slot /></button>' },
          DisclosurePanel: { template: '<div><slot /></div>' },
          UserFilterSelector: true,
          AccountFilterSelector: true,
          QosFilterSelector: true,
          PartitionFilterSelector: true
        }
      }
    })
    await nextTick()
    runtimeStore.jobs.openFiltersPanel = true
    await nextTick()
    const panel = wrapper.find('#jobs-filters-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('Users')
    expect(panel.text()).toContain('Accounts')
    expect(panel.text()).toContain('QOS')
    expect(panel.text()).toContain('Partitions')
    wrapper.unmount()
  })

  test('hides accounts/qos/partitions when permissions are missing', async () => {
    const runtimeStore = useRuntimeStore()
    // Remove permissions before mounting
    runtimeStore.currentCluster!.permissions.actions = ['view-jobs']
    const wrapper = mount(JobsFiltersPanel, {
      props: { cluster: 'foo', nbJobs: 0 },
      global: {
        stubs: {
          teleport: true,
          Dialog: { template: '<div v-bind="$attrs"><slot /></div>' },
          DialogPanel: { template: '<div v-bind="$attrs"><slot /></div>' },
          TransitionRoot: { template: '<div><slot /></div>' },
          TransitionChild: { template: '<div><slot /></div>' },
          Disclosure: { template: '<div><slot /></div>' },
          DisclosureButton: { template: '<button v-bind="$attrs"><slot /></button>' },
          DisclosurePanel: { template: '<div><slot /></div>' },
          UserFilterSelector: true,
          AccountFilterSelector: true,
          QosFilterSelector: true,
          PartitionFilterSelector: true
        }
      }
    })
    await nextTick()
    runtimeStore.jobs.openFiltersPanel = true
    await nextTick()
    const panel = wrapper.find('#jobs-filters-panel')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('Users')
    expect(panel.text()).not.toContain('Accounts')
    expect(panel.text()).not.toContain('QOS')
    expect(panel.text()).not.toContain('Partitions')
    wrapper.unmount()
  })
})
