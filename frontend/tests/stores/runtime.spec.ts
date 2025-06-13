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
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
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
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
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
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
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
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
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
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
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
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs', 'view-nodes'] }
    }
    const clusterBar = {
      name: 'bar',
      infrastructure: 'bar',
      racksdb: true,
      metrics: true,
      permissions: { roles: ['user', 'admin'], actions: ['view-jobs'] }
    }
    runtime.addCluster(clusterFoo)
    runtime.addCluster(clusterBar)
    expect(runtime.hasClusterPermission('foo', 'view-nodes')).toBeTruthy()
    expect(runtime.hasClusterPermission('bar', 'view-nodes')).toBeFalsy()
  })
})
