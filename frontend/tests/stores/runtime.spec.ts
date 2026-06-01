import { describe, test, beforeEach, afterEach, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRuntimeStore } from '@/stores/runtime'

describe('Runtime Store', () => {
  beforeEach(() => {
    // creates a fresh pinia and makes it active
    // so it's automatically picked up by any useStore() call
    // without having to pass it to it: `useStore(pinia)`
    setActivePinia(createPinia())
  })
  afterEach(() => {
    localStorage.removeItem('availableClusters')
  })
  test('add and get cluster', () => {
    const runtime = useRuntimeStore()
    const clusterFoo = {
      name: 'foo',
      infrastructure: 'foo',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    runtime.addCluster(clusterFoo)
    runtime.addCluster(clusterBar)
    expect(runtime.getCluster('foo')).toEqual(clusterFoo)
  })
  test('get cluster not found', () => {
    const runtime = useRuntimeStore()
    const clusterFoo = {
      name: 'foo',
      infrastructure: 'foo',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    runtime.addCluster(clusterFoo)
    runtime.addCluster(clusterBar)
    expect(runtime.getCluster('baz')).toBeUndefined()
  })
  test('get available clusters', () => {
    const runtime = useRuntimeStore()
    const clusterFoo = {
      name: 'foo',
      infrastructure: 'foo',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    runtime.addCluster(clusterFoo)
    runtime.addCluster(clusterBar)
    expect(runtime.availableClusters).toStrictEqual([clusterFoo, clusterBar])
  })
  test('get allowed clusters', () => {
    const runtime = useRuntimeStore()
    const clusterFoo = {
      name: 'foo',
      infrastructure: 'foo',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: [] }
    }
    runtime.addCluster(clusterFoo)
    runtime.addCluster(clusterBar)
    expect(runtime.getAllowedClusters()).toStrictEqual([clusterFoo])
  })
  test('check cluster available', () => {
    const runtime = useRuntimeStore()
    const clusterFoo = {
      name: 'foo',
      infrastructure: 'foo',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    runtime.addCluster(clusterFoo)
    runtime.addCluster(clusterBar)
    expect(runtime.checkClusterAvailable('foo')).toBeTruthy()
    expect(runtime.checkClusterAvailable('baz')).toBeFalsy()
  })
  test('has cluster permission', () => {
    const runtime = useRuntimeStore()
    const clusterFoo = {
      name: 'foo',
      infrastructure: 'foo',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view', 'nodes-view'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user', 'admin'], actions: ['jobs-view'] }
    }
    runtime.addCluster(clusterFoo)
    runtime.addCluster(clusterBar)
    expect(runtime.hasClusterPermission('foo', 'nodes-view')).toBeTruthy()
    expect(runtime.hasClusterPermission('bar', 'nodes-view')).toBeFalsy()
  })

  describe('hasAnyPermission', () => {
    const clusterFoo = {
      name: 'foo',
      infrastructure: 'foo',
      racksdb: true,
      metrics: true,
      cache: true,
      permissions: { roles: ['user'], actions: ['jobs-view'] }
    }

    test('returns true when no cluster is selected', () => {
      const runtime = useRuntimeStore()
      expect(runtime.currentCluster).toBeUndefined()
      expect(runtime.hasAnyPermission(['jobs-view', 'nodes-view'])).toBe(true)
    })

    test('returns true when current cluster has at least one permission', () => {
      const runtime = useRuntimeStore()
      runtime.addCluster(clusterFoo)
      runtime.currentCluster = clusterFoo
      expect(runtime.hasAnyPermission(['nodes-view', 'jobs-view'])).toBe(true)
    })

    test('returns false when current cluster has none of the permissions', () => {
      const runtime = useRuntimeStore()
      runtime.addCluster(clusterFoo)
      runtime.currentCluster = clusterFoo
      expect(runtime.hasAnyPermission(['nodes-view', 'jobs-view-past'])).toBe(false)
    })

    test('returns false for an empty permission list', () => {
      const runtime = useRuntimeStore()
      runtime.addCluster(clusterFoo)
      runtime.currentCluster = clusterFoo
      expect(runtime.hasAnyPermission([])).toBe(false)
    })
  })
})
