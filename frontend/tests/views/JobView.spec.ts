import { nextTick } from 'vue'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import JobView from '@/views/JobView.vue'
import JobBackButton from '@/components/job/JobBackButton.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import jobRunning from '../assets/job-running.json'
import jobPending from '../assets/job-pending.json'
import JobMetricsCharts from '@/components/job/JobMetricsCharts.vue'
import type { RouterMock } from 'vue-router-mock'
import JobFieldRaw from '@/components/job/JobFieldRaw.vue'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'

const mockClusterDataPoller = getMockClusterDataPoller<SlurmJobDetail>()

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
        job_metrics: ['cpu', 'memory', 'memory_allocated', 'gpu', 'gpu_memory'],
        cache: true,
        slurmdbd: {
          jobs_max_hours: 168
        }
      }
    ]
  })
  test('display job details', () => {
    mockClusterDataPoller.data.value = jobRunning
    mockClusterDataPoller.loaded.value = true
    const wrapper = mount(JobView, {
      props: {
        cluster: 'foo',
        id: 1234
      }
    })
    // Check JobBackButton component is rendered
    const backButton = wrapper.findComponent(JobBackButton)
    expect(backButton.exists()).toBe(true)
    expect(backButton.props('cluster')).toBe('foo')
    expect(backButton.text()).toBe('Back to jobs')
    // Check some jobs fields

    // User field has RouterLink, so check JobFieldRaw component and props
    const userField = wrapper.get('dl div#user').getComponent(JobFieldRaw)
    expect(userField.props('field')).toBe(jobRunning.user)
    expect(userField.props('to')).toEqual({
      name: 'user',
      params: { cluster: 'foo', user: jobRunning.user }
    })

    // Account field has RouterLink, so check JobFieldRaw component and props
    const accountField = wrapper.get('dl div#account').getComponent(JobFieldRaw)
    expect(accountField.props('field')).toBe(jobRunning.account)
    expect(accountField.props('to')).toEqual({
      name: 'account',
      params: { cluster: 'foo', account: jobRunning.account }
    })
    // Fields without RouterLink should have text directly accessible
    expect(wrapper.get('dl div#group dd').text()).toBe(jobRunning.group)
    expect(wrapper.get('dl div#priority dd').text()).toBe(jobRunning.priority.number.toString())
    expect(wrapper.get('dl div#workdir dd').text()).toBe(jobRunning.working_directory)
    expect(wrapper.get('dl div#nodes dd').text()).toBe(jobRunning.nodes)
    expect(wrapper.get('dl div#partition dd').text()).toBe(jobRunning.partition)
    expect(wrapper.get('dl div#qos dd').text()).toBe(jobRunning.qos)
  })
  test('highlight job field in route hash', async () => {
    await router.setHash('#user')
    mockClusterDataPoller.data.value = jobRunning
    const wrapper = mount(JobView, {
      props: {
        cluster: 'foo',
        id: 1234
      }
    })
    await nextTick()
    // Check user field is highlighted with specific background color due to
    // #user hash in route while group field is not highlighted.
    expect(wrapper.get('dl div#user').classes('bg-slurmweb-light')).toBe(true)
    expect(wrapper.get('dl div#group').classes('bg-slurmweb-light')).toBe(false)
  })
  test('display job metrics charts for started job', () => {
    mockClusterDataPoller.data.value = jobRunning
    mockClusterDataPoller.loaded.value = true
    const wrapper = mount(JobView, {
      props: { cluster: 'foo', id: 1234 },
      global: { stubs: { JobMetricsCharts: true } }
    })
    const charts = wrapper.findComponent(JobMetricsCharts)
    expect(charts.exists()).toBe(true)
    expect(charts.props('cluster')).toBe('foo')
    expect(charts.props('id')).toBe(1234)
  })
  test('hide job metrics charts for pending job', () => {
    mockClusterDataPoller.data.value = jobPending
    mockClusterDataPoller.loaded.value = true
    const wrapper = mount(JobView, {
      props: { cluster: 'foo', id: 1234 },
      global: { stubs: { JobMetricsCharts: true } }
    })
    expect(wrapper.findComponent(JobMetricsCharts).exists()).toBe(false)
  })
  test('hide job metrics charts when metrics are disabled', () => {
    useRuntimeStore().availableClusters[0].metrics = false
    mockClusterDataPoller.data.value = jobRunning
    mockClusterDataPoller.loaded.value = true
    const wrapper = mount(JobView, {
      props: { cluster: 'foo', id: 1234 },
      global: { stubs: { JobMetricsCharts: true } }
    })
    expect(wrapper.findComponent(JobMetricsCharts).exists()).toBe(false)
  })
  test('hide job metrics charts without job metrics on cluster', () => {
    useRuntimeStore().availableClusters[0].job_metrics = []
    mockClusterDataPoller.data.value = jobRunning
    mockClusterDataPoller.loaded.value = true
    const wrapper = mount(JobView, {
      props: { cluster: 'foo', id: 1234 },
      global: { stubs: { JobMetricsCharts: true } }
    })
    expect(wrapper.findComponent(JobMetricsCharts).exists()).toBe(false)
  })
})
