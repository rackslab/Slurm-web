import { nextTick } from 'vue'
import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import JobView from '@/views/JobView.vue'
import JobBackButton from '@/components/job/JobBackButton.vue'
import JobRunSelector from '@/components/job/JobRunSelector.vue'
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'
import { init_plugins, getMockClusterDataPoller } from '../lib/common'
import jobRunning from '../assets/job-running.json'
import jobRequeued from '../assets/job-requeued.json'
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
  test('run selector hidden without previous runs', () => {
    mockClusterDataPoller.data.value = jobRunning
    mockClusterDataPoller.loaded.value = true
    const wrapper = mount(JobView, {
      props: {
        cluster: 'foo',
        id: 1234
      }
    })
    expect(wrapper.findComponent(JobRunSelector).exists()).toBe(false)
    expect(wrapper.find('#previous-run-notice').exists()).toBe(false)
  })
  test('browse previous runs of requeued job', async () => {
    mockClusterDataPoller.data.value = jobRequeued as unknown as SlurmJobDetail
    mockClusterDataPoller.loaded.value = true
    const previousRun = jobRequeued.previous_runs[0]!
    const wrapper = mount(JobView, {
      props: {
        cluster: 'foo',
        id: 1234
      }
    })
    // Latest run is displayed by default
    const selector = wrapper.getComponent(JobRunSelector)
    expect(selector.get('#run-label').text()).toContain('Run 2 of 2')
    expect(wrapper.get('dl div#nodes dd').text()).toBe(jobRequeued.nodes)
    expect(wrapper.getComponent(JobStatusBadge).props('status')).toEqual(jobRequeued.state.current)
    expect(wrapper.find('#previous-run-notice').exists()).toBe(false)
    // Select previous run, terminated by node failure
    await selector.get('#run-previous').trigger('click')
    expect(selector.get('#run-label').text()).toContain('Run 1 of 2')
    expect(selector.get('#run-label').text()).toContain(
      new Date(previousRun.time.submission * 1000).toLocaleString()
    )
    expect(wrapper.get('dl div#nodes dd').text()).toBe(previousRun.nodes)
    expect(wrapper.get('dl div#exit-code dd').text()).toContain(previousRun.exit_code.status[0])
    expect(wrapper.getComponent(JobStatusBadge).props('status')).toEqual(['NODE_FAIL'])
    expect(wrapper.get('#previous-run-notice').text()).toContain('previous run 1')
    // Back to latest run
    await selector.get('#run-next').trigger('click')
    expect(wrapper.get('dl div#nodes dd').text()).toBe(jobRequeued.nodes)
    expect(wrapper.find('#previous-run-notice').exists()).toBe(false)
  })
})
