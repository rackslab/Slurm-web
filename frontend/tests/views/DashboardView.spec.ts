import { describe, test, beforeEach, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardView from '@/views/DashboardView.vue'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterStats } from '@/composables/GatewayAPI'
import ErrorAlert from '@/components/ErrorAlert.vue'
import { init_plugins, init_stores } from './common'

const mockClusterDataPoller = {
  data: undefined,
  unable: false,
  loaded: true
} as { data: ClusterStats | undefined; unable: boolean; loaded: boolean }

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('DashboardView.vue', () => {
  beforeEach(() => {
    init_plugins()
    init_stores()
    useRuntimeStore().availableClusters = [{ name: 'foo', permissions: { roles: [], actions: [] } }]
  })
  test('should display dashboard with metrics', async () => {
    mockClusterDataPoller.data = {
      resources: {
        nodes: 5,
        cores: 80
      },
      jobs: {
        running: 10,
        total: 30
      },
      version: '24.5.0'
    }
    const wrapper = mount(DashboardView, {
      props: {
        cluster: 'foo'
      }
    })
    // Check presence of metrics and values.
    expect(wrapper.findAll('p').map((element) => element.text())).toStrictEqual([
      'Nodes',
      'Cores',
      'Running jobs',
      'Total jobs'
    ])
    expect(wrapper.get('span#metric-nodes').text()).toBe('5')
    expect(wrapper.get('span#metric-cores').text()).toBe('80')
    expect(wrapper.get('span#metric-jobs-running').text()).toBe('10')
    expect(wrapper.get('span#metric-jobs-total').text()).toBe('30')
  })
  test('should display error when unable to get cluster stats', async () => {
    mockClusterDataPoller.unable = true
    const wrapper = mount(DashboardView, {
      props: {
        cluster: 'foo'
      }
    })
    // Check error is displayed when data poller is unable to retrieved data.
    expect(wrapper.getComponent(ErrorAlert).text()).toContain(
      'Unable to retrieve statistics from cluster foo'
    )
  })
})
