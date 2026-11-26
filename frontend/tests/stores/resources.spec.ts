import { describe, test, beforeEach, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { resourcesDiagramRouteName, useResourcesRuntimeStore } from '@/stores/runtime/resources'

describe('stores/runtime/resources.ts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  test('showNodeNames defaults to true when not set in localStorage', () => {
    const store = useResourcesRuntimeStore()
    expect(store.showNodeNames).toBe(true)
  })

  test('showNodeNames updates state and persists to localStorage', async () => {
    const store = useResourcesRuntimeStore()
    store.showNodeNames = false
    await nextTick()
    expect(store.showNodeNames).toBe(false)
    expect(localStorage.getItem('showNodeNames')).toBe('false')

    store.showNodeNames = true
    await nextTick()
    expect(store.showNodeNames).toBe(true)
    expect(localStorage.getItem('showNodeNames')).toBe('true')
  })

  test('resourcesDiagramRouteName returns routes of layouts and representations', () => {
    expect(resourcesDiagramRouteName('2d', 'nodes')).toBe('resources-diagram-nodes')
    expect(resourcesDiagramRouteName('2d', 'cores')).toBe('resources-diagram-cores')
    expect(resourcesDiagramRouteName('3d', 'nodes')).toBe('resources-3d-nodes')
    expect(resourcesDiagramRouteName('3d', 'cores')).toBe('resources-3d-cores')
  })
})
