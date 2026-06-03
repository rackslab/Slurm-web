import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import JobsPastView from '@/views/JobsPastView.vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import pastJobs from '../assets/jobs-past.json'
import ErrorAlert from '@/components/ErrorAlert.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import type { SlurmAcctJob } from '@/composables/gateway/slurm/types'

const mockClusterDataPoller = getMockClusterDataPoller<SlurmAcctJob[]>()

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
        permissions: { roles: [], actions: ['jobs-view-past'] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true,
        slurmdbd: { jobs_max_hours: 168 }
      }
    ]
    runtimeStore.currentCluster = runtimeStore.getCluster('foo')
    mockClusterDataPoller.unable.value = false
  })

  test('display jobs', () => {
    mockClusterDataPoller.data.value = pastJobs as SlurmAcctJob[]
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    const table = wrapper.find('main table')
    expect(table.exists()).toBeTruthy()
    const columns = table.findAll('thead th')
    expect(columns.length).toBe(9)
    expect(columns[0].text()).toBe('#ID')
    expect(columns[1].text()).toBe('State')
    expect(columns[2].text()).toBe('End time')
    expect(columns[3].text()).toBe('Name')
    expect(columns[4].text()).toBe('User (account)')
    expect(columns[5].text()).toBe('Resources')
    expect(columns[6].text()).toBe('Partition')
    expect(columns[7].text()).toBe('QOS')
    expect(columns[8].text()).toBe('View')
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
    mockClusterDataPoller.data.value = pastJobs as SlurmAcctJob[]
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

  test('shows scope toggle when jobs-view is allowed', () => {
    useRuntimeStore().getCluster('foo')!.permissions.actions.push('jobs-view')
    mockClusterDataPoller.data.value = pastJobs as SlurmAcctJob[]
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.find('[data-testid="jobs-scope-toggle"]').exists()).toBe(true)
  })
  test('shows scope toggle when jobs-view-own is allowed', () => {
    useRuntimeStore().getCluster('foo')!.permissions.actions = [
      'jobs-view-own',
      'jobs-view-past-own'
    ]
    mockClusterDataPoller.data.value = pastJobs as SlurmAcctJob[]
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.find('[data-testid="jobs-scope-toggle"]').exists()).toBe(true)
  })
  test('hides scope toggle without jobs-view and jobs-view-own', () => {
    mockClusterDataPoller.data.value = pastJobs as SlurmAcctJob[]
    const wrapper = mount(JobsPastView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.find('[data-testid="jobs-scope-toggle"]').exists()).toBe(false)
  })
})
