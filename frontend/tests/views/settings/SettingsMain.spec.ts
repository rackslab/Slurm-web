import { describe, test, beforeEach, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import SettingsMainView from '@/views/settings/SettingsMain.vue'
import { init_plugins } from '../../lib/common'
import { useRuntimeStore } from '@/stores/runtime'

describe('views/settings/SettingsMain.vue', () => {
  beforeEach(() => {
    init_plugins()
    localStorage.clear()
  })

  test('renders toggle and description', () => {
    const wrapper = mount(SettingsMainView)
    expect(wrapper.text()).toContain('Show node names on cluster diagram')
    expect(wrapper.text()).toContain(
      'When enabled, node names are displayed on the cluster diagram'
    )
  })

  test('toggle binds to store and persists', async () => {
    const wrapper = mount(SettingsMainView, {
      global: {
        stubs: {
          SettingsTabs: true
        }
      }
    })
    const runtimeStore = useRuntimeStore()
    // default true
    expect(runtimeStore.resources.showNodeNames).toBe(true)

    // click the switch root to toggle
    await wrapper.find('[role="switch"]').trigger('click')
    await nextTick()
    expect(runtimeStore.resources.showNodeNames).toBe(false)
    expect(localStorage.getItem('showNodeNames')).toBe('false')

    await wrapper.find('[role="switch"]').trigger('click')
    await nextTick()
    expect(runtimeStore.resources.showNodeNames).toBe(true)
    expect(localStorage.getItem('showNodeNames')).toBe('true')
  })
})
