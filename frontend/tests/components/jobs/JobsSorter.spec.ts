import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import {
  PAST_JOBS_DEFAULT_ORDER,
  PAST_JOBS_DEFAULT_SORT
} from '@/stores/runtime/jobs'
import { init_plugins } from '../../lib/common'
import JobsSorter from '@/components/jobs/JobsSorter.vue'

const headlessStubs = {
  Menu: { template: '<div><slot /></div>' },
  MenuButton: { template: '<button type="button" v-bind="$attrs"><slot /></button>' },
  MenuItems: { template: '<div><slot /></div>' },
  MenuItem: { template: '<div><slot :active="false" /></div>' },
  transition: { template: '<div><slot /></div>' }
}

function mountSorter(past = false) {
  return mount(JobsSorter, {
    props: { past },
    global: { stubs: headlessStubs }
  })
}

function sortOptionLabels(wrapper: ReturnType<typeof mountSorter>): string[] {
  return wrapper.findAll('a').map((a) => a.text())
}

describe('JobsSorter.vue', () => {
  beforeEach(() => {
    init_plugins()
    const jobs = useRuntimeStore().jobs
    jobs.activeSort = 'id'
    jobs.activeOrder = 'asc'
    jobs.pastSort = PAST_JOBS_DEFAULT_SORT
    jobs.pastOrder = PAST_JOBS_DEFAULT_ORDER
  })

  test('lists active job sort options by default', () => {
    const wrapper = mountSorter()
    expect(sortOptionLabels(wrapper)).toEqual([
      '#ID',
      'State',
      'User',
      'Priority',
      'Resources'
    ])
  })

  test('lists past job sort options when past prop is set', () => {
    const wrapper = mountSorter(true)
    expect(sortOptionLabels(wrapper)).toEqual([
      'End time',
      '#ID',
      'State',
      'User',
      'Resources'
    ])
  })

  test('highlights the selected active sort criterion', () => {
    useRuntimeStore().jobs.activeSort = 'state'
    const wrapper = mountSorter()
    const state = wrapper.findAll('a').find((a) => a.text() === 'State')
    expect(state?.classes()).toContain('font-medium')
    const user = wrapper.findAll('a').find((a) => a.text() === 'User')
    expect(user?.classes()).not.toContain('font-medium')
  })

  test('updates active sort and emits sort when a criterion is chosen', async () => {
    const wrapper = mountSorter()
    await wrapper.findAll('a').find((a) => a.text() === 'User')?.trigger('click')
    expect(useRuntimeStore().jobs.activeSort).toBe('user')
    expect(wrapper.emitted('sort')).toHaveLength(1)
  })

  test('updates past sort and emits sort in past mode', async () => {
    const wrapper = mountSorter(true)
    await wrapper.findAll('a').find((a) => a.text() === '#ID')?.trigger('click')
    expect(useRuntimeStore().jobs.pastSort).toBe('id')
    expect(wrapper.emitted('sort')).toHaveLength(1)
  })

  test('toggles active sort order and emits sort', async () => {
    const wrapper = mountSorter()
    const orderButton = wrapper.findAll('button')[0]
    expect(orderButton.find('.sr-only').text()).toBe('Order')

    await orderButton.trigger('click')
    expect(useRuntimeStore().jobs.activeOrder).toBe('desc')
    expect(wrapper.emitted('sort')).toHaveLength(1)

    await orderButton.trigger('click')
    expect(useRuntimeStore().jobs.activeOrder).toBe('asc')
    expect(wrapper.emitted('sort')).toHaveLength(2)
  })

  test('toggles past sort order in past mode', async () => {
    const wrapper = mountSorter(true)
    const orderButton = wrapper.findAll('button')[0]
    await orderButton.trigger('click')
    expect(useRuntimeStore().jobs.pastOrder).toBe('asc')
    await orderButton.trigger('click')
    expect(useRuntimeStore().jobs.pastOrder).toBe('desc')
  })
})
