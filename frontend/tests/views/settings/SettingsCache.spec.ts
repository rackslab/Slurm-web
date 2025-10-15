import { describe, test, beforeEach, expect } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import SettingsCacheView from '@/views/settings/SettingsCache.vue'
import { useRuntimeStore } from '@/stores/runtime'
import InfoAlert from '@/components/InfoAlert.vue'
import SettingsCacheStatistics from '@/components/settings/SettingsCacheStatistics.vue'
import SettingsCacheMetrics from '@/components/settings/SettingsCacheMetrics.vue'
import { init_plugins } from '../../lib/common'

describe('settings/SettingsCache.vue', () => {
  beforeEach(() => {
    init_plugins()
  })
  test('should display clusters cache statistics and metrics', () => {
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: ['cache-view'] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true
      },
      {
        name: 'bar',
        permissions: { roles: [], actions: ['cache-view'] },
        racksdb: true,
        infrastructure: 'bar',
        metrics: true,
        cache: true
      },
      {
        name: 'baz',
        permissions: { roles: [], actions: ['cache-view'] },
        racksdb: true,
        infrastructure: 'baz',
        metrics: true,
        cache: true
      }
    ]
    const wrapper = shallowMount(SettingsCacheView)
    expect(wrapper.findAll('h3').map((element) => element.text())).toStrictEqual([
      'Cluster foo',
      'Cluster bar',
      'Cluster baz'
    ])
    expect(wrapper.findAllComponents(SettingsCacheStatistics).length).toBe(3)
    expect(wrapper.findAllComponents(SettingsCacheMetrics).length).toBe(3)
  })
  test('should not display cache statistics and metrics when cache disabled', () => {
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: ['cache-view'] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: false
      }
    ]
    const wrapper = mount(SettingsCacheView, {
      global: {
        stubs: {
          SettingsTabs: true
        }
      }
    })
    expect(wrapper.findAll('h3').map((element) => element.text())).toStrictEqual(['Cluster foo'])
    expect(wrapper.getComponent(InfoAlert).text()).toBe('Cache is disabled on this cluster.')
    expect(wrapper.findAllComponents(SettingsCacheStatistics).length).toBe(0)
    expect(wrapper.findAllComponents(SettingsCacheMetrics).length).toBe(0)
  })
  test('should not display cache statistics and metrics without permission', () => {
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: [] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: true,
        cache: true
      }
    ]
    const wrapper = mount(SettingsCacheView, {
      global: {
        stubs: {
          SettingsTabs: true
        }
      }
    })
    expect(wrapper.findAll('h3').map((element) => element.text())).toStrictEqual(['Cluster foo'])
    expect(wrapper.getComponent(InfoAlert).text()).toBe(
      'No permission to get cache information on this cluster.'
    )
    expect(wrapper.findAllComponents(SettingsCacheStatistics).length).toBe(0)
    expect(wrapper.findAllComponents(SettingsCacheMetrics).length).toBe(0)
  })
  test('should display cache statistics without metrics when metrics disabled', () => {
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: ['cache-view'] },
        racksdb: true,
        infrastructure: 'foo',
        metrics: false,
        cache: true
      }
    ]
    const wrapper = mount(SettingsCacheView, {
      global: {
        stubs: {
          SettingsTabs: true,
          SettingsCacheStatistics: true
        }
      }
    })
    expect(wrapper.findAll('h3').map((element) => element.text())).toStrictEqual(['Cluster foo'])
    expect(wrapper.findAllComponents(SettingsCacheStatistics).length).toBe(1)
    expect(wrapper.findAllComponents(SettingsCacheMetrics).length).toBe(0)
  })
})
