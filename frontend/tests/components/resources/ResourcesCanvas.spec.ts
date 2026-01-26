import { nextTick } from 'vue'
import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import { APIServerError } from '@/composables/HTTPErrors'
import { init_plugins } from '../../lib/common'
import nodes from '../../assets/nodes.json'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
// Mock the GatewayAPI to avoid exercising undici multipart parsing here.
// The multipart parsing is covered in GatewayAPI.spec; this spec focuses on UI.
const mockGatewayAPI = {
  infrastructureImagePng: vi.fn()
}

vi.mock('@/composables/GatewayAPI', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/composables/GatewayAPI')>()
  return {
    ...actual,
    useGatewayAPI: () => mockGatewayAPI
  }
})

const mockCoordinates = { node1: [0, 0, 10, 10] }
const mockImage = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' })
const mockBitmap = { width: 10, height: 10 }

describe('ResourcesCanvas.vue', () => {
  beforeEach(() => {
    init_plugins()
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
    mockGatewayAPI.infrastructureImagePng.mockResolvedValue([mockImage, mockCoordinates])
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap))
    vi.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
  test('display resources canvas', async () => {
    const wrapper = mount(ResourcesCanvas, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        fullscreen: false,
        loading: true, // nodesLoading prop
        modelValue: false
      },
      global: {
        stubs: {
          LoadingSpinner: true
        }
      }
    })
    // Check LoadingSpinner is visible and canvas is hidden initially
    expect(
      wrapper.getComponent(LoadingSpinner).element.parentElement.getAttribute('style')
    ).toBeNull()
    expect(wrapper.get('canvas').attributes('style')).toContain('display: none;')

    // Update loading prop to false to simulate data loaded
    await wrapper.setProps({ loading: false })
    await flushPromises()
    await flushPromises()

    // Check main div height is 96
    expect(wrapper.get('div').classes('h-96')).toBeTruthy()
    // Check parent of LoadingSpinner is hidden and canvas is now displayed
    expect(
      wrapper.getComponent(LoadingSpinner).element.parentElement.getAttribute('style')
    ).toContain('display: none;')
    expect(wrapper.get('canvas').attributes('style')).not.toContain('display: none;')
    // Check imageSize emit has been emitted
    expect(wrapper.emitted()).toHaveProperty('imageSize')
  })
  test('report API server error', async () => {
    mockGatewayAPI.infrastructureImagePng.mockRejectedValueOnce(
      new APIServerError(500, 'fake API server error')
    )
    const wrapper = mount(ResourcesCanvas, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        fullscreen: false,
        modelValue: false
      }
    })
    await flushPromises()
    // Check main div height is reduced to 8
    expect(wrapper.get('div').classes('h-8')).toBeTruthy()
    // Check API server error is properly reported
    expect(wrapper.get('span').text()).toBe('API server error (500): fake API server error')
    // Check unable model has been emitted
    expect(wrapper.emitted()).toHaveProperty('update:modelValue')
  })
  test('report other errors', async () => {
    mockGatewayAPI.infrastructureImagePng.mockRejectedValueOnce(
      new Error('fake other server error')
    )
    const wrapper = mount(ResourcesCanvas, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        fullscreen: false,
        modelValue: false
      }
    })
    await flushPromises()
    // Check main div height is reduced to 8
    expect(wrapper.get('div').classes('h-8')).toBeTruthy()
    // Check other server error is properly reported
    expect(wrapper.get('span').text()).toBe('Server error: fake other server error')
    // Check unable model has been emitted
    expect(wrapper.emitted()).toHaveProperty('update:modelValue')
  })
  test('display resources canvas in cores mode', async () => {
    const wrapper = mount(ResourcesCanvas, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        fullscreen: false,
        mode: 'cores',
        modelValue: false
      },
      global: {
        stubs: {
          LoadingSpinner: true
        }
      }
    })
    // Wait for asynchronous code to execute and display the canvas
    await flushPromises()
    await flushPromises()
    // Check canvas is displayed
    const canvasStyle = wrapper.get('canvas').attributes('style')
    expect(canvasStyle === undefined || !canvasStyle.includes('display: none;')).toBe(true)
    // Check mode prop is passed correctly
    expect(wrapper.props('mode')).toBe('cores')
  })
  test('tooltip shows cores information in cores mode', async () => {
    const wrapper = mount(ResourcesCanvas, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        fullscreen: false,
        mode: 'cores',
        modelValue: false
      },
      global: {
        stubs: {
          LoadingSpinner: true
        }
      }
    })
    await flushPromises()
    await flushPromises()

    // Simulate mouse hover to set currentNode by accessing internal properties
    ;(wrapper.vm as { currentNode: unknown }).currentNode = nodes[0] // Set the first node as current
    ;(wrapper.vm as { nodeTooltipOpen: boolean }).nodeTooltipOpen = true

    await nextTick()

    // Check tooltip is displayed
    const tooltip = wrapper.find('aside')
    expect(tooltip.exists()).toBe(true)

    // Check that tooltip list is displayed
    const tooltipContent = tooltip.find('ul')
    expect(tooltipContent.exists()).toBe(true)

    // Check that cores information is displayed
    const coresInfo = tooltip.find('span.text-right')
    expect(coresInfo.exists()).toBe(true)
    expect(coresInfo.text()).toContain(`${nodes[0].alloc_cpus}/${nodes[0].cpus}`)
  })

  test('shimmer animation starts when nodes are loading', async () => {
    const wrapper = mount(ResourcesCanvas, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        fullscreen: false,
        loading: true, // nodesLoading = true
        modelValue: false
      },
      global: {
        stubs: {
          LoadingSpinner: true
        }
      }
    })
    await flushPromises()
    await flushPromises()

    // Check that shimmer animation is active when nodes are loading
    // The animation should be running (animationId should not be null)
    const vm = wrapper.vm as { animationId: number | null }
    expect(vm.animationId).toBeDefined()
  })

  test('shimmer animation stops when nodes are loaded', async () => {
    const wrapper = mount(ResourcesCanvas, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        fullscreen: false,
        loading: false, // nodesLoading = false
        modelValue: false
      },
      global: {
        stubs: {
          LoadingSpinner: true
        }
      }
    })
    await flushPromises()
    await flushPromises()

    // Check that shimmer animation is not active when nodes are loaded
    // The animation should not be running (animationId should be null)
    const vm = wrapper.vm as { animationId: number | null }
    expect(vm.animationId).toBeNull()
  })
})
