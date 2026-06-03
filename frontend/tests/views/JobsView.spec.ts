import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import JobsView from '@/views/JobsView.vue'
import ClusterMainLayout from '@/components/ClusterMainLayout.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import jobs from '../assets/jobs.json'
import ErrorAlert from '@/components/ErrorAlert.vue'
import InfoAlert from '@/components/InfoAlert.vue'
import type { SlurmJob } from '@/composables/gateway/slurm/types'

const mockClusterDataPoller = getMockClusterDataPoller<SlurmJob[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('JobView.vue', () => {
  beforeEach(() => {
    init_plugins()
    const runtimeStore = useRuntimeStore()
    runtimeStore.availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: ['jobs-view'] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true,
        slurmdbd: { jobs_max_hours: 168 }
      }
    ]
    runtimeStore.currentCluster = runtimeStore.getCluster('foo')
    // Reset mockClusterDataPoller unable to its default value before every tests.
    mockClusterDataPoller.unable.value = false
  })
  test('display jobs', () => {
    mockClusterDataPoller.data.value = jobs
    const wrapper = mount(JobsView, {
      props: {
        cluster: 'foo'
      }
    })
    const table = wrapper.find('main table')
    // Check presence of main table
    expect(table.exists()).toBeTruthy()
    // Check columns
    const columns = table.findAll('thead th')
    //console.log(columns[0].html())
    expect(columns.length).toBe(10)
    expect(columns[0].text()).toBe('#ID')
    expect(columns[1].text()).toBe('State')
    expect(columns[2].text()).toBe('Name')
    expect(columns[3].text()).toBe('User (account)')
    expect(columns[4].text()).toBe('Resources')
    expect(columns[5].text()).toBe('Partition')
    expect(columns[6].text()).toBe('QOS')
    expect(columns[7].text()).toBe('Priority')
    expect(columns.find((th) => th.text() === 'Reason')?.exists()).toBe(true)
    expect(columns[9].text()).toBe('View')
    // Check lines
    const lines = table.findAll('tbody tr')
    expect(lines.length).toBeGreaterThan(1)
  })
  test('show error alert when unable to retrieve jobs', () => {
    mockClusterDataPoller.unable.value = true
    const wrapper = mount(JobsView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(ErrorAlert).text()).toBe('Unable to retrieve jobs from cluster foo')
    // Check absence of main table
    expect(wrapper.find('main table').exists()).toBeFalsy()
  })
  test('show info alert when no job', () => {
    mockClusterDataPoller.data.value = []
    const wrapper = mount(JobsView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(InfoAlert).text()).toBe('No jobs found on cluster foo')
    // Check absence of main table
    expect(wrapper.find('main table').exists()).toBeFalsy()
  })
  test('shows Active breadcrumb', () => {
    mockClusterDataPoller.data.value = jobs
    const wrapper = mount(JobsView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.getComponent(ClusterMainLayout).props('breadcrumb')).toEqual([
      { title: 'Jobs', routeName: 'jobs' },
      { title: 'Active' }
    ])
  })
  test('shows scope toggle when jobs-view-past is allowed', () => {
    useRuntimeStore().getCluster('foo')!.permissions.actions.push('jobs-view-past')
    mockClusterDataPoller.data.value = jobs
    const wrapper = mount(JobsView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.find('[data-testid="jobs-scope-toggle"]').exists()).toBe(true)
  })
  test('shows scope toggle when jobs-view-past-own is allowed', () => {
    useRuntimeStore().getCluster('foo')!.permissions.actions = [
      'jobs-view-own',
      'jobs-view-past-own'
    ]
    mockClusterDataPoller.data.value = jobs
    const wrapper = mount(JobsView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.find('[data-testid="jobs-scope-toggle"]').exists()).toBe(true)
  })
  test('hides scope toggle without jobs-view-past and jobs-view-past-own', () => {
    mockClusterDataPoller.data.value = jobs
    const wrapper = mount(JobsView, {
      props: {
        cluster: 'foo'
      }
    })
    expect(wrapper.find('[data-testid="jobs-scope-toggle"]').exists()).toBe(false)
  })
})
