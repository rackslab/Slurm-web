import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import JobsView from '@/views/JobsView.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import type { ClusterJob } from '@/composables/GatewayAPI'
import jobs from '../assets/jobs.json'
import type { RouterMock } from 'vue-router-mock'
import ErrorAlert from '@/components/ErrorAlert.vue'
import InfoAlert from '@/components/InfoAlert.vue'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterJob[]>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

let router: RouterMock

describe('JobView.vue', () => {
  beforeEach(() => {
    router = init_plugins()
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
    expect(columns.length).toBe(9)
    expect(columns[0].text()).toBe('#ID')
    expect(columns[1].text()).toBe('State')
    expect(columns[2].text()).toBe('User (account)')
    expect(columns[3].text()).toBe('Resources')
    expect(columns[4].text()).toBe('Partition')
    expect(columns[5].text()).toBe('QOS')
    expect(columns[6].text()).toBe('Priority')
    expect(columns[7].text()).toBe('Reason')
    expect(columns[8].text()).toBe('View')
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
})
