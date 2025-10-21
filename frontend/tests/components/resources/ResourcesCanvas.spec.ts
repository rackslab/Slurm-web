import { nextTick } from 'vue'
import { describe, test, beforeEach, vi, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import { APIServerError } from '@/composables/HTTPErrors'
import { init_plugins } from '../../lib/common'
import nodes from '../../assets/nodes.json'
import requestsStatus from '../../assets/status.json'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

import fs from 'fs'
import path from 'path'

const mockRESTAPI = {
  postRaw: vi.fn()
}

vi.mock('@/composables/RESTAPI', () => ({
  useRESTAPI: () => mockRESTAPI
}))

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
  })
  test('display resources canvas', async () => {
    const message = fs.readFileSync(
      path.resolve(__dirname, '../../assets/racksdb-draw-coordinates.txt')
    )
    mockRESTAPI.postRaw.mockReturnValueOnce(
      Promise.resolve({
        headers: { 'content-type': requestsStatus['racksdb-draw-coordinates']['content-type'] },
        data: message
      })
    )
    const wrapper = mount(ResourcesCanvas, {
      props: {
        cluster: 'foo',
        nodes: nodes,
        fullscreen: false,
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
    // Wait for asynchronous code to execute and display the canvas
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
    mockRESTAPI.postRaw.mockImplementationOnce(() => {
      throw new APIServerError(500, 'fake API server error')
    })
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
    mockRESTAPI.postRaw.mockImplementationOnce(() => {
      throw new Error('fake other server error')
    })
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
    const message = fs.readFileSync(
      path.resolve(__dirname, '../../assets/racksdb-draw-coordinates.txt')
    )
    mockRESTAPI.postRaw.mockReturnValueOnce(
      Promise.resolve({
        headers: { 'content-type': requestsStatus['racksdb-draw-coordinates']['content-type'] },
        data: message
      })
    )
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
    expect(wrapper.get('canvas').attributes('style')).not.toContain('display: none;')
    // Check mode prop is passed correctly
    expect(wrapper.props('mode')).toBe('cores')
  })
  test('tooltip shows cores information in cores mode', async () => {
    const message = fs.readFileSync(
      path.resolve(__dirname, '../../assets/racksdb-draw-coordinates.txt')
    )
    mockRESTAPI.postRaw.mockReturnValueOnce(
      Promise.resolve({
        headers: { 'content-type': requestsStatus['racksdb-draw-coordinates']['content-type'] },
        data: message
      })
    )
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
})
