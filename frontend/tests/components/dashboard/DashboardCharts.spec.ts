import { describe, test, beforeEach, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import { init_plugins } from '../../views/common'
import DashboardCharts from '@/components/dashboard/DashboardCharts.vue'
import ChartJobsHistogram from '@/components/dashboard/ChartJobsHistogram.vue'
import ChartResourcesHistogram from '@/components/dashboard/ChartResourcesHistogram.vue'

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
  test('should display resources and jobs charts', () => {
    const wrapper = shallowMount(DashboardCharts)
    // Check presence of resources and jobs charts component
    wrapper.getComponent(ChartResourcesHistogram)
    wrapper.getComponent(ChartJobsHistogram)
  })
  test('should not display resources charts without view-nodes permission', () => {
    const runtimeStore = useRuntimeStore()
    runtimeStore.currentCluster!.permissions.actions =
      runtimeStore.currentCluster!.permissions.actions.filter((action) => action !== 'view-nodes')
    const wrapper = shallowMount(DashboardCharts)
    // Check absence of resources chart and presence of jobs charts
    expect(wrapper.findComponent(ChartResourcesHistogram).exists()).toBe(false)
    wrapper.getComponent(ChartJobsHistogram)
  })
  test('should not display jobs charts without view-jobs permission', () => {
    const runtimeStore = useRuntimeStore()
    runtimeStore.currentCluster!.permissions.actions =
      runtimeStore.currentCluster!.permissions.actions.filter((action) => action !== 'view-jobs')
    const wrapper = shallowMount(DashboardCharts)
    // Check absence of jobs chart and presence of resources charts
    wrapper.getComponent(ChartResourcesHistogram)
    expect(wrapper.findComponent(ChartJobsHistogram).exists()).toBe(false)
  })
})
