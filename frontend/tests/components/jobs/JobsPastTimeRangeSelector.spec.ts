import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import { PAST_JOBS_DEFAULT_HOURS } from '@/stores/runtime/jobs'
import { init_plugins } from '../../lib/common'
import JobsPastTimeRangeSelector from '@/components/jobs/JobsPastTimeRangeSelector.vue'

describe('JobsPastTimeRangeSelector.vue', () => {
  beforeEach(() => {
    init_plugins()
    useRuntimeStore().jobs.pastHours = PAST_JOBS_DEFAULT_HOURS
  })

  test('renders presets up to maxHours with formatted labels', () => {
    const wrapper = mount(JobsPastTimeRangeSelector, {
      props: { maxHours: 24, defaultHours: 6 }
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.map((b) => b.text())).toEqual(['1 h', '6 h', '12 h', '24 h'])
  })

  test('formats 48 h and 7 d labels', () => {
    const wrapper = mount(JobsPastTimeRangeSelector, {
      props: { maxHours: 168, defaultHours: 6 }
    })
    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels).toContain('48 h')
    expect(labels).toContain('7 d')
  })

  test('includes defaultHours when missing from standard presets', async () => {
    const withDefault = mount(JobsPastTimeRangeSelector, {
      props: { maxHours: 168, defaultHours: 72 }
    })
    const withoutExtra = mount(JobsPastTimeRangeSelector, {
      props: { maxHours: 168, defaultHours: 6 }
    })
    expect(withDefault.findAll('button')).toHaveLength(7)
    expect(withoutExtra.findAll('button')).toHaveLength(6)
    await withDefault.findAll('button')[5].trigger('click')
    expect(withDefault.emitted('select')).toEqual([[72]])
  })

  test('highlights the preset matching store pastHours', () => {
    useRuntimeStore().jobs.pastHours = 12
    const wrapper = mount(JobsPastTimeRangeSelector, {
      props: { maxHours: 24, defaultHours: 6 }
    })
    const selected = wrapper.findAll('button').find((b) => b.text() === '12 h')
    expect(selected?.classes()).toContain('bg-slurmweb')
    const other = wrapper.findAll('button').find((b) => b.text() === '6 h')
    expect(other?.classes()).not.toContain('bg-slurmweb')
  })

  test('emits select with hours when a preset is clicked', async () => {
    const wrapper = mount(JobsPastTimeRangeSelector, {
      props: { maxHours: 24, defaultHours: 6 }
    })
    await wrapper.findAll('button').find((b) => b.text() === '24 h')?.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[24]])
  })
})
