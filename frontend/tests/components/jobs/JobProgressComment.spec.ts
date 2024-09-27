import { describe, test, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { StopCircleIcon } from '@heroicons/vue/24/outline'
import JobProgressComment from '@/components/jobs/JobProgressComment.vue'
import jobPending from '../../assets/job-pending.json'
import jobRunning from '../../assets/job-running.json'
import jobCompleted from '../../assets/job-completed.json'

describe('JobProgressComment.vue', () => {
  // Pending job
  test('pending job submitted comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobPending,
        step: 'submitted'
      }
    })
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('pending job eligible comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobPending,
        step: 'eligible'
      }
    })
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('pending job scheduling comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobPending,
        step: 'scheduling'
      }
    })
    expect(wrapper.text().length).toBe(0)
  })
  test('pending job running comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobPending,
        step: 'running'
      }
    })
    expect(wrapper.text().length).toBe(0)
  })
  test('pending job completing comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobPending,
        step: 'completing'
      }
    })
    expect(wrapper.text().length).toBe(0)
  })
  test('pending job terminated comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobPending,
        step: 'terminated'
      }
    })
    expect(wrapper.text().length).toBe(0)
  })

  // Running job
  test('running job submitted comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobRunning,
        step: 'submitted'
      }
    })
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('running job eligible comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobRunning,
        step: 'eligible'
      }
    })
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('running job scheduling comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobRunning,
        step: 'scheduling'
      }
    })
    // Must contain start datetime
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('running job running comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobRunning,
        step: 'running'
      }
    })
    // Must contain elapsed time
    expect(wrapper.text()).toContain('elapsed')
  })
  test('running job completing comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobRunning,
        step: 'completing'
      }
    })
    // Check there is a stop icon to indicate job time limit with light gray color
    const icon = wrapper.getComponent(StopCircleIcon)
    expect(icon.classes('text-gray-400')).toBe(true)
    // Check the end datetime is present
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('running job terminated comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobRunning,
        step: 'terminated'
      }
    })
    expect(wrapper.text().length).toBe(0)
  })

  // Completed job
  test('completed job submitted comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobCompleted,
        step: 'submitted'
      }
    })
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('completed job eligible comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobCompleted,
        step: 'eligible'
      }
    })
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('completed job scheduling comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobCompleted,
        step: 'scheduling'
      }
    })
    // Must contain start datetime
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
  test('completed job running comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobCompleted,
        step: 'running'
      }
    })
    // Must contain elapsed time
    expect(wrapper.text()).toContain('elapsed')
  })
  test('completed job completing comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobCompleted,
        step: 'completing'
      }
    })
    expect(wrapper.text().length).toBe(0)
  })
  test('completed job terminated comment', () => {
    const wrapper = mount(JobProgressComment, {
      props: {
        job: jobCompleted,
        step: 'terminated'
      }
    })
    // Must contain end datetime
    expect(wrapper.text().length).toBeGreaterThan(0)
  })
})
