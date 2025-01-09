import { describe, test, beforeEach, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardView from '@/views/DashboardView.vue'
import { useRuntimeStore } from '@/stores/runtime'
import type { ClusterStats } from '@/composables/GatewayAPI'
import ErrorAlert from '@/components/ErrorAlert.vue'
import DashboardCharts from '@/components/dashboard/DashboardCharts.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import stats from '../assets/stats.json'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterStats>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('DashboardView.vue', () => {
  beforeEach(() => {
    init_plugins()
    useRuntimeStore().availableClusters = [
      { name: 'foo', permissions: { roles: [], actions: [] }, infrastructure: 'foo', metrics: true }
    ]
  })
  test('should display dashboard with metrics', () => {
    mockClusterDataPoller.data.value = stats
    const wrapper = mount(DashboardView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          DashboardCharts: true
        }
      }
    })
    // Check presence of metrics and values.
    expect(wrapper.findAll('p').map((element) => element.text())).toStrictEqual([
      'Nodes',
      'Cores',
      'Running jobs',
      'Total jobs'
    ])
    expect(wrapper.get('span#metric-nodes').text()).toBe(stats.resources.nodes.toString())
    expect(wrapper.get('span#metric-cores').text()).toBe(stats.resources.cores.toString())
    expect(wrapper.get('span#metric-jobs-running').text()).toBe(stats.jobs.running.toString())
    expect(wrapper.get('span#metric-jobs-total').text()).toBe(stats.jobs.total.toString())
    // Check presence of login service message component
    wrapper.getComponent(DashboardCharts)
  })
  test('should not display charts when metrics are disabled', () => {
    // Disable metrics on cluster foo
    useRuntimeStore().availableClusters[0].metrics = false
    const wrapper = mount(DashboardView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          DashboardCharts: true
        }
      }
    })
    // Check absence of charts component
    expect(wrapper.findComponent(DashboardCharts).exists()).toBe(false)
  })
  test('should display error when unable to get cluster stats', () => {
    mockClusterDataPoller.unable.value = true
    const wrapper = mount(DashboardView, {
      props: {
        cluster: 'foo'
      },
      global: {
        stubs: {
          DashboardCharts: true
        }
      }
    })
    // Check error is displayed when data poller is unable to retrieved data.
    expect(wrapper.getComponent(ErrorAlert).text()).toContain(
      'Unable to retrieve statistics from cluster foo'
    )
  })
})
