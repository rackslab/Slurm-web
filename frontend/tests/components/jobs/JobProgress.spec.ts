import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobProgress from '@/components/jobs/JobProgress.vue'
import jobPending from '../../assets/job-pending.json'
import jobRunning from '../../assets/job-running.json'
import jobCompleted from '../../assets/job-completed.json'

describe('JobProgress.vue', () => {
  test('display job progress of pending job', () => {
    const wrapper = mount(JobProgress, {
      props: {
        job: jobPending
      }
    })
    // Must have 3 bullets in blue
    expect(wrapper.findAll('span.bg-slurmweb').length).toBe(3)

    const submittedSpans = wrapper.get('li#step-submitted').findAll('span')
    expect(submittedSpans[1].classes('bg-slurmweb')).toBe(true)

    const eligibleSpans = wrapper.get('li#step-eligible').findAll('span')
    expect(eligibleSpans[1].classes('bg-slurmweb')).toBe(true)

    // current
    const schedulingSpans = wrapper.get('li#step-scheduling').findAll('span')
    expect(schedulingSpans[1].classes('border-slurmweb')).toBe(true)
    expect(schedulingSpans[1].classes('bg-white')).toBe(true)
    expect(schedulingSpans[4].classes('text-slurmweb-dark')).toBe(true)

    const runningSpans = wrapper.get('li#step-running').findAll('span')
    expect(runningSpans[1].classes('border-gray-300')).toBe(true)
    expect(runningSpans[1].classes('bg-white')).toBe(true)
    expect(runningSpans[4].classes('text-gray-500')).toBe(true)

    const completingSpans = wrapper.get('li#step-completing').findAll('span')
    expect(completingSpans[1].classes('border-gray-300')).toBe(true)
    expect(completingSpans[1].classes('bg-white')).toBe(true)
    expect(completingSpans[4].classes('text-gray-500')).toBe(true)

    const terminatedSpans = wrapper.get('li#step-terminated').findAll('span')
    expect(terminatedSpans[1].classes('border-gray-300')).toBe(true)
    expect(terminatedSpans[1].classes('bg-slurmweb')).toBe(false)
    expect(terminatedSpans[4].classes('text-gray-500')).toBe(true)
  })
  test('display job progress of running job', () => {
    const wrapper = mount(JobProgress, {
      props: {
        job: jobRunning
      }
    })
    // Must have 4 bullets in blue
    expect(wrapper.findAll('span.bg-slurmweb').length).toBe(4)

    const submittedSpans = wrapper.get('li#step-submitted').findAll('span')
    expect(submittedSpans[1].classes('bg-slurmweb')).toBe(true)

    const eligibleSpans = wrapper.get('li#step-eligible').findAll('span')
    expect(eligibleSpans[1].classes('bg-slurmweb')).toBe(true)

    const schedulingSpans = wrapper.get('li#step-scheduling').findAll('span')
    expect(schedulingSpans[1].classes('bg-slurmweb')).toBe(true)

    // current
    const runningSpans = wrapper.get('li#step-running').findAll('span')
    expect(runningSpans[1].classes('border-slurmweb')).toBe(true)
    expect(runningSpans[1].classes('bg-white')).toBe(true)
    expect(runningSpans[4].classes('text-slurmweb-dark')).toBe(true)

    const completingSpans = wrapper.get('li#step-completing').findAll('span')
    expect(completingSpans[1].classes('border-gray-300')).toBe(true)
    expect(completingSpans[1].classes('bg-white')).toBe(true)
    expect(completingSpans[4].classes('text-gray-500')).toBe(true)

    const terminatedSpans = wrapper.get('li#step-terminated').findAll('span')
    expect(terminatedSpans[1].classes('border-gray-300')).toBe(true)
    expect(terminatedSpans[1].classes('bg-slurmweb')).toBe(false)
    expect(terminatedSpans[4].classes('text-gray-500')).toBe(true)
  })
  test('display job progress of completed job', () => {
    const wrapper = mount(JobProgress, {
      props: {
        job: jobCompleted
      }
    })
    // Must have all 6 bullets in blue
    expect(wrapper.findAll('span.bg-slurmweb').length).toBe(6)

    const submittedSpans = wrapper.get('li#step-submitted').findAll('span')
    expect(submittedSpans[1].classes('bg-slurmweb')).toBe(true)

    const eligibleSpans = wrapper.get('li#step-eligible').findAll('span')
    expect(eligibleSpans[1].classes('bg-slurmweb')).toBe(true)

    const schedulingSpans = wrapper.get('li#step-scheduling').findAll('span')
    expect(schedulingSpans[1].classes('bg-slurmweb')).toBe(true)

    const runningSpans = wrapper.get('li#step-running').findAll('span')
    expect(runningSpans[1].classes('bg-slurmweb')).toBe(true)

    const completingSpans = wrapper.get('li#step-completing').findAll('span')
    expect(completingSpans[1].classes('bg-slurmweb')).toBe(true)

    const terminatedSpans = wrapper.get('li#step-terminated').findAll('span')
    expect(terminatedSpans[1].classes('bg-slurmweb')).toBe(true)
  })
})
