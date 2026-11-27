import { describe, test, beforeEach, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { DateTime } from 'luxon'
import { init_plugins } from '../../lib/common'
import JobMetricSettingsPane from '@/components/job/JobMetricSettingsPane.vue'

const items = [
  { id: 'cn1', label: 'cn1' },
  { id: 'cn2', label: 'cn2' },
  { id: 'cn3', label: 'cn3' }
]
const JOB_START = 1800000007
const JOB_END = 1800003613

function inputValue(timestamp: number): string {
  return DateTime.fromSeconds(timestamp).toFormat("yyyy-LL-dd'T'HH:mm:ss")
}

/* Timestamp of datetime-local input value, which may be normalized by the DOM */
function inputTimestamp(element: Element): number {
  return DateTime.fromISO((element as HTMLInputElement).value).toSeconds()
}

function mountPane(props: Record<string, unknown> = {}) {
  return mount(JobMetricSettingsPane, {
    global: {
      stubs: {
        // Headless UI stubs to keep drawer content within wrapper
        teleport: true,
        Dialog: { template: '<div v-bind="$attrs"><slot /></div>' },
        DialogPanel: { template: '<div v-bind="$attrs"><slot /></div>' },
        TransitionRoot: { props: ['show'], template: '<div v-if="show"><slot /></div>' },
        TransitionChild: { template: '<div><slot /></div>' }
      }
    },
    props: {
      open: true,
      resource: 'cpu',
      items: items,
      jobStart: JOB_START,
      jobEnd: JOB_END,
      detail: true,
      selection: [],
      start: undefined,
      end: undefined,
      ...props
    }
  })
}

describe('JobMetricSettingsPane.vue', () => {
  beforeEach(() => {
    init_plugins()
  })
  test('display toggle per node for CPU resource', () => {
    const wrapper = mountPane({ detail: false })
    expect(wrapper.get('[data-testid="job-metric-display-job"]').classes()).toContain('bg-slurmweb')
    expect(wrapper.get('[data-testid="job-metric-display-detail"]').text()).toBe('Per node')
    // Nodes list is hidden without detail
    expect(wrapper.find('[data-testid="job-metric-items"]').exists()).toBe(false)
  })
  test('display toggle per GPU for GPU resource', () => {
    const wrapper = mountPane({ resource: 'gpu' })
    expect(wrapper.get('[data-testid="job-metric-display-detail"]').text()).toBe('Per GPU')
    expect(wrapper.get('[data-testid="job-metric-items"] h3').text()).toBe('GPUs')
  })
  test('toggle detail', async () => {
    const wrapper = mountPane({ detail: false })
    await wrapper.get('[data-testid="job-metric-display-detail"]').trigger('click')
    expect(wrapper.emitted('update:detail')).toEqual([[true]])
    await wrapper.setProps({ detail: true })
    await wrapper.get('[data-testid="job-metric-display-job"]').trigger('click')
    expect(wrapper.emitted('update:detail')).toEqual([[true], [false]])
  })
  test('all items selected with empty selection', () => {
    const wrapper = mountPane()
    for (const item of items) {
      const checkbox = wrapper.get(`[data-testid="job-metric-item-${item.id}"]`)
      expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    }
    expect(wrapper.find('[data-testid="job-metric-items-all"]').exists()).toBe(false)
  })
  test('unselect item', async () => {
    const wrapper = mountPane()
    await wrapper.get('[data-testid="job-metric-item-cn2"]').trigger('change')
    expect(wrapper.emitted('update:selection')).toEqual([[['cn1', 'cn3']]])
  })
  test('select back last item selects all', async () => {
    const wrapper = mountPane({ selection: ['cn1', 'cn3'] })
    expect(
      (wrapper.get('[data-testid="job-metric-item-cn2"]').element as HTMLInputElement).checked
    ).toBe(false)
    await wrapper.get('[data-testid="job-metric-item-cn2"]').trigger('change')
    expect(wrapper.emitted('update:selection')).toEqual([[[]]])
  })
  test('keep at least one item selected', async () => {
    const wrapper = mountPane({ selection: ['cn1'] })
    await wrapper.get('[data-testid="job-metric-item-cn1"]').trigger('change')
    expect(wrapper.emitted('update:selection')).toBeUndefined()
  })
  test('select only one item and all items', async () => {
    const wrapper = mountPane({ selection: ['cn1', 'cn2'] })
    await wrapper.get('[data-testid="job-metric-item-only-cn3"]').trigger('click')
    expect(wrapper.emitted('update:selection')).toEqual([[['cn3']]])
    await wrapper.get('[data-testid="job-metric-items-all"]').trigger('click')
    expect(wrapper.emitted('update:selection')).toEqual([[['cn3']], [[]]])
  })
  test('no data message without items', () => {
    const wrapper = mountPane({ items: [] })
    expect(wrapper.get('[data-testid="job-metric-items"]').text()).toContain('No data available')
  })
  test('time range inputs default to job range', () => {
    const wrapper = mountPane()
    const start = wrapper.get('[data-testid="job-metric-range-start"]')
    const end = wrapper.get('[data-testid="job-metric-range-end"]')
    expect(inputTimestamp(start.element)).toBe(JOB_START)
    expect(inputTimestamp(end.element)).toBe(JOB_END)
    expect(start.attributes('min')).toBe(inputValue(JOB_START))
    expect(end.attributes('max')).toBe(inputValue(JOB_END))
    expect(wrapper.find('[data-testid="job-metric-range-reset"]').exists()).toBe(false)
  })
  test('set time range', async () => {
    const wrapper = mountPane()
    await wrapper
      .get('[data-testid="job-metric-range-start"]')
      .setValue(inputValue(JOB_START + 600))
    expect(wrapper.emitted('update:start')).toEqual([[JOB_START + 600]])
    await wrapper.get('[data-testid="job-metric-range-end"]').setValue(inputValue(JOB_END - 600))
    expect(wrapper.emitted('update:end')).toEqual([[JOB_END - 600]])
  })
  test('time range bounds of job are undefined', async () => {
    const wrapper = mountPane({ start: JOB_START + 600, end: JOB_END - 600 })
    await wrapper.get('[data-testid="job-metric-range-start"]').setValue(inputValue(JOB_START - 60))
    expect(wrapper.emitted('update:start')).toEqual([[undefined]])
    await wrapper.get('[data-testid="job-metric-range-end"]').setValue(inputValue(JOB_END + 60))
    expect(wrapper.emitted('update:end')).toEqual([[undefined]])
  })
  test('ignore invalid time range', async () => {
    const wrapper = mountPane({ start: JOB_START + 600, end: JOB_START + 1200 })
    const start = wrapper.get('[data-testid="job-metric-range-start"]')
    // Start after end is ignored and input displays current start again.
    await start.setValue(inputValue(JOB_START + 1800))
    expect(wrapper.emitted('update:start')).toBeUndefined()
    expect(inputTimestamp(start.element)).toBe(JOB_START + 600)
    // End before start is ignored.
    await wrapper.get('[data-testid="job-metric-range-end"]').setValue(inputValue(JOB_START))
    expect(wrapper.emitted('update:end')).toBeUndefined()
  })
  test('reset time range to whole job', async () => {
    const wrapper = mountPane({ start: JOB_START + 600, end: JOB_END - 600 })
    await wrapper.get('[data-testid="job-metric-range-reset"]').trigger('click')
    expect(wrapper.emitted('update:start')).toEqual([[undefined]])
    expect(wrapper.emitted('update:end')).toEqual([[undefined]])
  })
  test('display settings sections like filters panels', () => {
    const wrapper = mountPane()
    expect(wrapper.get('h2').text()).toBe('Settings')
    expect(wrapper.findAll('h3').map((heading) => heading.text())).toEqual([
      'Display',
      'Nodes',
      'Time range'
    ])
  })
  test('collapse and expand section', async () => {
    const wrapper = mountPane()
    const section = wrapper.get('[data-testid="job-metric-section-range"]')
    expect(section.find('[data-testid="job-metric-range-start"]').exists()).toBe(true)
    await section.get('h3 button').trigger('click')
    expect(section.find('[data-testid="job-metric-range-start"]').exists()).toBe(false)
    await section.get('h3 button').trigger('click')
    expect(section.find('[data-testid="job-metric-range-start"]').exists()).toBe(true)
  })
  test('close drawer', async () => {
    const wrapper = mountPane()
    await wrapper.get('[data-testid="job-metric-settings-close"]').trigger('click')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
  test('nothing displayed when drawer is closed', () => {
    const wrapper = mountPane({ open: false })
    expect(wrapper.find('[data-testid="job-metric-settings"]').exists()).toBe(false)
  })
})
