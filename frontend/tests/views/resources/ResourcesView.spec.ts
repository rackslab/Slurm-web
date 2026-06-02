import { nextTick } from 'vue'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ResourcesDiagramThumbnail from '@/components/resources/ResourcesDiagramThumbnail.vue'
import ResourcesFiltersBar from '@/components/resources/ResourcesFiltersBar.vue'
import ResourcesView from '@/views/resources/ResourcesView.vue'
import { init_plugins, getMockClusterDataPoller } from '../../lib/common'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'
import ErrorAlert from '@/components/ErrorAlert.vue'
import nodes from '../../assets/nodes.json'
import type { SlurmNode } from '@/composables/gateway/slurm/types'

const mockClusterDataPoller = getMockClusterDataPoller<SlurmNode[]>()

let router: RouterMock

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('ResourcesView.vue', () => {
  beforeEach(() => {
    router = init_plugins()
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: [] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true,
        slurmdbd: {
          jobs_max_hours: 168
        }
      }
    ]
  })
  test('display resources', () => {
    mockClusterDataPoller.data.value = nodes
    mockClusterDataPoller.loaded.value = true
    const wrapper = mount(ResourcesView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          ResourcesDiagramThumbnail: true
        }
      }
    })
    // Check presence of ResourcesDiagramThumbnail component
    const thumbnail = wrapper.getComponent(ResourcesDiagramThumbnail)
    // Check that loading prop is passed correctly (should be false when loaded
    // is true)
    expect(thumbnail.props('loading')).toBe(false)
    expect(thumbnail.props('mode')).toBe('nodes')
    // Check presence of ResourcesFiltersBar component
    wrapper.getComponent(ResourcesFiltersBar)
    // Check presence of table
    wrapper.get('main table')
  })
  test('table without diagram when racksdb is disabled', () => {
    mockClusterDataPoller.data.value = nodes
    // Disable racksdb on cluster foo
    useRuntimeStore().availableClusters[0].racksdb = false
    const wrapper = mount(ResourcesView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          ResourcesDiagramThumbnail: true
        }
      }
    })
    // Check absence of ResourcesDiagramThumbnail component
    expect(wrapper.findComponent(ResourcesDiagramThumbnail).exists()).toBeFalsy()
    // Check presence of table
    wrapper.get('main table')
  })
  test('show error alert when unable to retrieve nodes', () => {
    mockClusterDataPoller.unable.value = true
    const wrapper = mount(ResourcesView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          ResourcesDiagramThumbnail: true
        }
      }
    })
    expect(wrapper.getComponent(ErrorAlert).text()).toBe(
      'Unable to retrieve nodes from cluster foo'
    )
    // Check absence of main table
    expect(wrapper.find('main table').exists()).toBeFalsy()
  })
  test('passes loading state to ResourcesDiagramThumbnail', () => {
    mockClusterDataPoller.data.value = nodes
    mockClusterDataPoller.loaded.value = false // Data is loading
    const wrapper = mount(ResourcesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramThumbnail: true } }
    })
    // Check that loading prop is passed correctly (should be true when loaded
    // is false)
    const thumbnail = wrapper.getComponent(ResourcesDiagramThumbnail)
    expect(thumbnail.props('loading')).toBe(true)
  })
  test('syncs filters with URL on mount and on change', async () => {
    const runtime = useRuntimeStore()
    mockClusterDataPoller.data.value = nodes
    mount(ResourcesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramThumbnail: true } }
    })
    // onMounted should push initial query when none is set
    expect(router.push).toHaveBeenCalled()

    // simulate store filter change and expect another push
    runtime.resources.filters.states = ['up']
    await nextTick()
    expect(router.push).toHaveBeenCalledTimes(2)
  })

  test('initializes representation from query parameter', async () => {
    mockClusterDataPoller.data.value = nodes
    router.setQuery({ representation: 'cores' })
    const wrapper = mount(ResourcesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramThumbnail: true } }
    })
    await nextTick()
    const thumbnail = wrapper.getComponent(ResourcesDiagramThumbnail)
    expect(thumbnail.props('mode')).toBe('cores')
  })

  test('syncs representation changes with URL query', async () => {
    const runtime = useRuntimeStore()
    mockClusterDataPoller.data.value = nodes
    mount(ResourcesView, {
      props: { cluster: 'foo' },
      global: { stubs: { ResourcesDiagramThumbnail: true } }
    })
    const callsBeforeClick = router.push.mock.calls.length
    runtime.resources.representation = 'cores'
    await nextTick()
    const lastCall = router.push.mock.calls.at(-1)?.[0] as { query: { representation: string } }
    expect(router.push.mock.calls.length).toBe(callsBeforeClick + 1)
    expect(lastCall.query.representation).toBe('cores')
  })
})
