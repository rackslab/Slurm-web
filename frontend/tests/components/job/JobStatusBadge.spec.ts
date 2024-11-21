import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'
import jobRunning from '../../assets/job-running.json'
import jobPending from '../../assets/job-pending.json'
import jobCompleted from '../../assets/job-completed.json'
import jobArchived from '../../assets/job-archived.json'

describe('JobStatusBadge.vue', () => {
  test('badge running job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobRunning.state.current
      }
    })
    expect(wrapper.get('span').classes('bg-green-100')).toBe(true)
    expect(wrapper.get('span').classes('text-green-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('RUNNING')
  })
  test('badge pending job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobPending.state.current
      }
    })
    expect(wrapper.get('span').classes('bg-yellow-100')).toBe(true)
    expect(wrapper.get('span').classes('text-yellow-800')).toBe(true)
    expect(wrapper.get('svg').classes('fill-yellow-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('PENDING')
  })
  test('badge completed job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobCompleted.state.current
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-gray-400')).toBe(true)
    expect(wrapper.get('span').text()).toBe('COMPLETED')
  })
  test('badge archived job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobArchived.state.current
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-gray-400')).toBe(true)
    expect(wrapper.get('span').text()).toBe('COMPLETED')
  })
  test('job badge large', () => {
    const wrapperDefault = mount(JobStatusBadge, {
      props: {
        status: jobRunning.state.current
      }
    })
    expect(wrapperDefault.get('span').classes('max-h-6')).toBe(true)
    expect(wrapperDefault.get('span').classes('text-xs')).toBe(true)
    const wrapperLarge = mount(JobStatusBadge, {
      props: {
        status: jobRunning.state.current,
        large: true
      }
    })
    expect(wrapperLarge.get('span').classes('max-h-10')).toBe(true)
    expect(wrapperLarge.get('span').classes('text-sm')).toBe(true)
  })
  test('job badge custom label', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobRunning.state.current,
        label: 'testing'
      }
    })
    expect(wrapper.get('span').text()).toBe('testing')
  })
})
