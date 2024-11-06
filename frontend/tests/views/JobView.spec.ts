import { describe, test, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import JobView from '@/views/JobView.vue'
import { init_plugins, getMockClusterDataPoller } from './common'
import type { ClusterIndividualJob } from '@/composables/GatewayAPI'
import jobRunning from '../assets/job-running.json'

const mockClusterDataPoller = getMockClusterDataPoller<ClusterIndividualJob>()

vi.mock('@/composables/DataPoller', () => ({
  useClusterDataPoller: () => mockClusterDataPoller
}))

describe('JobView.vue', () => {
  beforeEach(() => {
    init_plugins()
  })
  test('display job details', () => {
    mockClusterDataPoller.data.value = jobRunning
    const wrapper = mount(JobView, {
      props: {
        cluster: 'foo',
        id: 1234
      }
    })
    // Check some jobs fields
    expect(wrapper.get('dl div#job-user dd').text()).toBe(jobRunning.user)
    expect(wrapper.get('dl div#job-group dd').text()).toBe(jobRunning.group)
    expect(wrapper.get('dl div#job-account dd').text()).toBe(jobRunning.association.account)
    expect(wrapper.get('dl div#job-priority dd').text()).toBe(jobRunning.priority.number.toString())
    expect(wrapper.get('dl div#job-workdir dd').text()).toBe(jobRunning.working_directory)
    expect(wrapper.get('dl div#job-nodes dd').text()).toBe(jobRunning.nodes)
    expect(wrapper.get('dl div#job-partition dd').text()).toBe(jobRunning.partition)
    expect(wrapper.get('dl div#job-qos dd').text()).toBe(jobRunning.qos)
  })
})
