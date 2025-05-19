import { describe, test, expect } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import JobStatusBadge from '@/components/job/JobStatusBadge.vue'
import jobRunning from '../../assets/job-running.json'
import jobPending from '../../assets/job-pending.json'
import jobCompleted from '../../assets/job-completed.json'
import jobFailed from '../../assets/job-failed.json'
import jobTimeout from '../../assets/job-timeout.json'
import jobArchived from '../../assets/job-archived.json'
import {
  ArrowDownOnSquareIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowsPointingOutIcon,
  Cog8ToothIcon,
  ArrowPathRoundedSquareIcon,
  LockClosedIcon,
  StopCircleIcon,
  BellAlertIcon,
  EyeSlashIcon,
  FolderMinusIcon,
  ExclamationTriangleIcon
} from '@heroicons/vue/16/solid'

describe('JobStatusBadge.vue', () => {
  // tests with specific values
  test('badge pending job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['PENDING']
      }
    })
    expect(wrapper.get('span').classes('bg-yellow-100')).toBe(true)
    expect(wrapper.get('span').classes('text-yellow-800')).toBe(true)
    expect(wrapper.get('svg').classes('fill-yellow-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('PENDING')
  })
  test('badge running job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['RUNNING']
      }
    })
    expect(wrapper.get('span').classes('bg-green-100')).toBe(true)
    expect(wrapper.get('span').classes('text-green-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('RUNNING')
  })
  test('badge suspended job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['SUSPENDED']
      }
    })
    expect(wrapper.get('span').classes('bg-purple-100')).toBe(true)
    expect(wrapper.get('span').classes('text-purple-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-purple-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('SUSPENDED')
  })
  test('badge completed job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['COMPLETED']
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('COMPLETED')
  })
  test('badge cancelled job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['CANCELLED']
      }
    })
    expect(wrapper.get('span').classes('bg-purple-100')).toBe(true)
    expect(wrapper.get('span').classes('text-purple-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-purple-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('CANCELLED')
  })
  test('badge failed job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['FAILED']
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('FAILED')
  })
  test('badge timeout job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['TIMEOUT']
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-orange-600')).toBe(true)
    expect(wrapper.get('span').text()).toBe('TIMEOUT')
  })
  test('badge node fail job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['NODE_FAIL']
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('NODE FAIL')
  })
  test('badge preempted job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['PREEMPTED']
      }
    })
    expect(wrapper.get('span').classes('bg-purple-100')).toBe(true)
    expect(wrapper.get('span').classes('text-purple-700')).toBe(true)
    expect(wrapper.get('svg').classes('fill-purple-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('PREEMPTED')
  })
  test('badge boot fail job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['BOOT_FAIL']
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('BOOT FAIL')
  })
  test('badge deadline job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['DEADLINE']
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('DEADLINE')
  })
  test('badge out of memory job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: ['OUT_OF_MEMORY']
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('OUT OF MEMORY')
  })
  // tests with assets
  test('asset running job', () => {
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
  test('asset pending job', () => {
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
  test('asset completed job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobCompleted.state.current
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('COMPLETED')
  })
  test('asset failed job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobFailed.state.current
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-red-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('FAILED')
  })
  test('asset timeout job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobTimeout.state.current
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-orange-600')).toBe(true)
    expect(wrapper.get('span').text()).toBe('TIMEOUT')
  })
  test('asset archived job', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobArchived.state.current
      }
    })
    expect(wrapper.get('span').classes('bg-gray-100')).toBe(true)
    expect(wrapper.get('span').classes('text-gray-600')).toBe(true)
    expect(wrapper.get('svg').classes('fill-green-500')).toBe(true)
    expect(wrapper.get('span').text()).toBe('COMPLETED')
  })
  test('asset badge large', () => {
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
  test('asset badge custom label', () => {
    const wrapper = mount(JobStatusBadge, {
      props: {
        status: jobRunning.state.current,
        label: 'testing'
      }
    })
    expect(wrapper.get('span').text()).toBe('testing')
  })
})
