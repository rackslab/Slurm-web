import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobRunSelector from '@/components/job/JobRunSelector.vue'
import jobRunning from '../../assets/job-running.json'
import type { SlurmJobDetail } from '@/composables/gateway/slurm/types'

const runs = [
  { ...jobRunning, time: { ...jobRunning.time, submission: 1000 } },
  { ...jobRunning, time: { ...jobRunning.time, submission: 2000 } },
  { ...jobRunning, time: { ...jobRunning.time, submission: 3000 } }
] as unknown as SlurmJobDetail[]

describe('JobRunSelector.vue', () => {
  test('display selected run', () => {
    const wrapper = mount(JobRunSelector, {
      props: { runs: runs, modelValue: 1 }
    })
    const label = wrapper.get('#run-label').text()
    expect(label).toContain('Run 2 of 3')
    expect(label).toContain(new Date(2000 * 1000).toLocaleString())
  })
  test('navigate between runs', async () => {
    const wrapper = mount(JobRunSelector, {
      props: {
        runs: runs,
        modelValue: 1,
        'onUpdate:modelValue': (value: number) => wrapper.setProps({ modelValue: value })
      }
    })
    await wrapper.get('#run-previous').trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([0])
    expect(wrapper.get('#run-label').text()).toContain('Run 1 of 3')
    expect(wrapper.get('#run-previous').attributes('disabled')).toBeDefined()
    await wrapper.get('#run-next').trigger('click')
    await wrapper.get('#run-next').trigger('click')
    expect(wrapper.get('#run-label').text()).toContain('Run 3 of 3')
    expect(wrapper.get('#run-next').attributes('disabled')).toBeDefined()
  })
})
