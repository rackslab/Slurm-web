import { describe, test, beforeEach, expect } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { useResourcesRuntimeStore } from '@/stores/runtime/resources'

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

  test('query omits default representation and layout', () => {
    const store = useResourcesRuntimeStore()
    expect(store.query()).toEqual({})
  })

  test('query keeps a non-default layout', () => {
    const store = useResourcesRuntimeStore()
    store.layout = '3d'
    store.representation = 'cores'
    expect(store.query()).toEqual({ layout: '3d', representation: 'cores' })
  })
})
