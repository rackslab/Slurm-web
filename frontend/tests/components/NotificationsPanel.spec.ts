import { describe, test, beforeEach, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import { init_plugins } from '../lib/common'
import NotificationsPanel from '@/components/notifications/NotificationsPanel.vue'
import Notification from '@/components/notifications/Notification.vue'

describe('DashboardCharts.vue', () => {
  beforeEach(() => {
    init_plugins()
    const cluster = {
      name: 'foo',
      permissions: { roles: ['admin'], actions: ['view-nodes', 'view-jobs'] },
      infrastructure: 'foo',
      metrics: true
    }
    const runtimeStore = useRuntimeStore()
    runtimeStore.availableClusters = [cluster]
    runtimeStore.currentCluster = cluster
  })
  test('should not display notification by default', () => {
    const wrapper = mount(NotificationsPanel)
    // check main div is fixed
    expect(wrapper.find('div').classes('fixed')).toBeTruthy()
    // empty by default
    expect(wrapper.findComponent(Notification).exists()).toBe(false)
  })
  test('should display reported info/error notifications', async () => {
    const runtimeStore = useRuntimeStore()
    runtimeStore.reportInfo('test info')
    runtimeStore.reportError('test error')
    const wrapper = mount(NotificationsPanel)
    // check presence of 2 notifications
    expect(wrapper.findAllComponents(Notification).length).toBe(2)
  })
})
