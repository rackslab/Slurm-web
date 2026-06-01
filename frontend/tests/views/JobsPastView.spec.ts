import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import JobsPastView from '@/views/JobsPastView.vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import type { ClusterAcctJob } from '@/composables/GatewayAPI'
import pastJobs from '../assets/jobs-past.json'
import ErrorAlert from '@/components/ErrorAlert.vue'
import InfoAlert from '@/components/InfoAlert.vue'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterAcctJob[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('JobsPastView.vue', () => {
  beforeEach(() => {
    init_plugins()
    const runtimeStore = useRuntimeStore()
    runtimeStore.availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: ['jobs-view-past', 'jobs-view'] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true,
        slurmdbd: { jobs_max_hours: 168 }
      }
    ]
    runtimeStore.currentCluster = runtimeStore.getCluster('foo')
    mockClusterDataPoller.unable.value = false
    mockClusterDataPoller.data.value = []
  })

  test('display jobs', () => {
    mockClusterDataPoller.data.value = pastJobs as ClusterAcctJob[]
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    const table = wrapper.find('main table')
    expect(table.exists()).toBeTruthy()
    const columns = table.findAll('thead th')
    expect(columns.length).toBe(8)
    expect(columns[0].text()).toBe('#ID')
    expect(columns[1].text()).toBe('State')
    expect(columns[2].text()).toBe('End time')
    expect(columns[3].text()).toBe('User (account)')
    expect(columns[4].text()).toBe('Resources')
    expect(columns[5].text()).toBe('Partition')
    expect(columns[6].text()).toBe('QOS')
    expect(columns[7].text()).toBe('View')
    const lines = table.findAll('tbody tr')
    expect(lines.length).toBeGreaterThan(1)
  })

  test('show error alert when unable to retrieve jobs', () => {
    mockClusterDataPoller.unable.value = true
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve jobs from cluster foo')
    expect(wrapper.find('main table').exists()).toBeFalsy()
  })

  test('show info alert when no job', () => {
    mockClusterDataPoller.data.value = []
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(InfoAlert).text()).toBe('No jobs found on cluster foo')
    expect(wrapper.find('main table').exists()).toBeFalsy()
  })

  test('shows Terminated breadcrumb and heading', () => {
    mockClusterDataPoller.data.value = pastJobs as ClusterAcctJob[]
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(ClusterMainLayout).props('breadcrumb')).toEqual([
      { title: 'Jobs', routeName: 'jobs' },
      { title: 'Terminated' }
    ])
    expect(wrapper.find('h1').text()).toBe('Jobs Terminated')
  })

  test('shows scope toggle with Active and Terminated', () => {
    mockClusterDataPoller.data.value = pastJobs as ClusterAcctJob[]
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.find('[data-testid="jobs-scope-toggle"]').exists()).toBe(true)
  })
})
