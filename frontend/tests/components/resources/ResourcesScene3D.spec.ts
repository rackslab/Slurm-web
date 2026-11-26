import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { RouterMock } from 'vue-router-mock'
import { useRuntimeStore } from '@/stores/runtime'
import ResourcesScene3D from '@/components/resources/ResourcesScene3D.vue'
import ResourcesNodeTooltip from '@/components/resources/ResourcesNodeTooltip.vue'
import ErrorAlert from '@/components/ErrorAlert.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { APIServerError } from '@/composables/HTTPErrors'
import type { ResourcesViewerCallbacks } from '@/lib/resources3d/viewer'
import type { SlurmNode } from '@/composables/gateway/slurm/types'
import { init_plugins } from '../../lib/common'

const mockGatewayAPI = {
  infrastructureGlb: vi.fn()
}

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => mockGatewayAPI
}))

const mockViewer = {
  setNodes: vi.fn(),
  setCameraMode: vi.fn(),
  resetCamera: vi.fn(),
  focusKeyboard: vi.fn(),
  dispose: vi.fn()
}
let callbacks: ResourcesViewerCallbacks

const createResourcesViewer = vi.fn(
  async (container: HTMLElement, data: ArrayBuffer, cb: ResourcesViewerCallbacks) => {
    callbacks = cb
    return mockViewer
  }
)

vi.mock('@/lib/resources3d/viewer', () => ({
  createResourcesViewer: (...args: Parameters<typeof createResourcesViewer>) =>
    createResourcesViewer(...args)
}))

const glb = new ArrayBuffer(4)
const nodes = [
  { name: 'cn1', state: ['IDLE'], alloc_cpus: 0, cpus: 8 },
  { name: 'cn2', state: ['ALLOCATED'], alloc_cpus: 8, cpus: 8 }
] as unknown as SlurmNode[]

let router: RouterMock

describe('ResourcesScene3D.vue', () => {
  beforeEach(() => {
    router = init_plugins()
    useRuntimeStore().availableClusters = [
      {
        name: 'foo',
        permissions: { roles: [], actions: [] },
        racksdb: true,
        infrastructure: 'foo-infra',
        metrics: true,
        cache: true,
        slurmdbd: { jobs_max_hours: 168 }
      }
    ]
    mockGatewayAPI.infrastructureGlb.mockResolvedValue(glb)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('shows spinner while loading', () => {
    mockGatewayAPI.infrastructureGlb.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(true)
  })

  test('creates viewer with infrastructure glb and paints nodes', async () => {
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'cores' } })
    await flushPromises()
    expect(mockGatewayAPI.infrastructureGlb).toHaveBeenCalledWith('foo', 'foo-infra')
    expect(createResourcesViewer).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      glb,
      expect.any(Object)
    )
    expect(mockViewer.setNodes).toHaveBeenCalledWith(nodes, 'cores')
    expect(wrapper.findComponent(LoadingSpinner).exists()).toBe(false)
  })

  test('repaints nodes on props change without reloading', async () => {
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    await flushPromises()
    await wrapper.setProps({ nodes: [nodes[0]], mode: 'cores' })
    expect(mockViewer.setNodes).toHaveBeenLastCalledWith([nodes[0]], 'cores')
    expect(mockGatewayAPI.infrastructureGlb).toHaveBeenCalledTimes(1)
  })

  test('reloads viewer on cluster change', async () => {
    useRuntimeStore().availableClusters.push({
      ...useRuntimeStore().availableClusters[0],
      name: 'bar',
      infrastructure: 'bar-infra'
    })
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    await flushPromises()
    await wrapper.setProps({ cluster: 'bar' })
    await flushPromises()
    expect(mockViewer.dispose).toHaveBeenCalledTimes(1)
    expect(mockGatewayAPI.infrastructureGlb).toHaveBeenLastCalledWith('bar', 'bar-infra')
    expect(createResourcesViewer).toHaveBeenCalledTimes(2)
  })

  test('reports API server errors', async () => {
    mockGatewayAPI.infrastructureGlb.mockRejectedValue(new APIServerError(500, 'draw failed'))
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    await flushPromises()
    const alert = wrapper.getComponent(ErrorAlert)
    expect(alert.text()).toContain('API server error (500): draw failed')
    expect(createResourcesViewer).not.toHaveBeenCalled()
  })

  test('reports viewer errors', async () => {
    createResourcesViewer.mockRejectedValueOnce(new Error('WebGL is not available'))
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    await flushPromises()
    expect(wrapper.getComponent(ErrorAlert).text()).toContain('WebGL is not available')
  })

  test('camera buttons control viewer', async () => {
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    await flushPromises()
    await wrapper.get('[data-testid="resources-scene-camera-turntable"]').trigger('click')
    expect(mockViewer.setCameraMode).toHaveBeenCalledWith('turntable')
    await wrapper.get('[data-testid="resources-scene-camera-free"]').trigger('click')
    expect(mockViewer.setCameraMode).toHaveBeenCalledWith('free')
    await wrapper.get('[data-testid="resources-scene-camera-reset"]').trigger('click')
    expect(mockViewer.resetCamera).toHaveBeenCalled()
    // Keyboard focus is given back to the scene after each button click
    expect(mockViewer.focusKeyboard).toHaveBeenCalledTimes(3)
  })

  test('reflects camera mode changes of viewer', async () => {
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    await flushPromises()
    const turntable = wrapper.get('[data-testid="resources-scene-camera-turntable"]')
    expect(turntable.classes()).not.toContain('bg-slurmweb')
    callbacks.onCameraModeChange('turntable')
    await flushPromises()
    expect(turntable.classes()).toContain('bg-slurmweb')
  })

  test('shows tooltip of hovered node', async () => {
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'cores' } })
    await flushPromises()
    expect(wrapper.find('[data-testid="resources-scene-tooltip"]').exists()).toBe(false)
    callbacks.onHover('cn2', 120, 80)
    await flushPromises()
    const tooltip = wrapper.get('[data-testid="resources-scene-tooltip"]')
    expect(tooltip.attributes('style')).toContain('left: 120px')
    expect(tooltip.attributes('style')).toContain('top: 80px')
    const content = wrapper.getComponent(ResourcesNodeTooltip)
    expect(content.props('node')).toStrictEqual(nodes[1])
    expect(content.text()).toContain('8/8')
    callbacks.onHover(null, 0, 0)
    await flushPromises()
    expect(wrapper.find('[data-testid="resources-scene-tooltip"]').exists()).toBe(false)
  })

  test('opens node page on selection', async () => {
    router.setQuery({})
    mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    await flushPromises()
    callbacks.onSelect('cn1')
    expect(router.push).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'node', params: { cluster: 'foo', nodeName: 'cn1' } })
    )
  })

  test('disposes viewer on unmount', async () => {
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    await flushPromises()
    wrapper.unmount()
    expect(mockViewer.dispose).toHaveBeenCalled()
  })

  test('disposes viewer created after unmount', async () => {
    let resolve: (value: ArrayBuffer) => void = () => {}
    mockGatewayAPI.infrastructureGlb.mockReturnValue(new Promise((r) => (resolve = r)))
    const wrapper = mount(ResourcesScene3D, { props: { cluster: 'foo', nodes, mode: 'nodes' } })
    wrapper.unmount()
    resolve(glb)
    await flushPromises()
    expect(createResourcesViewer).not.toHaveBeenCalled()
  })
})
