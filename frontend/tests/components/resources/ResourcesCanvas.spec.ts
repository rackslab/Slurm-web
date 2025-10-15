import { describe, test, beforeEach, vi, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { useRuntimeStore } from '@/stores/runtime'
import ResourcesCanvas from '@/components/resources/ResourcesCanvas.vue'
import { APIServerError } from '@/composables/HTTPErrors'
import { init_plugins } from '../../lib/common'
import nodes from '../../assets/nodes.json'
import requestsStatus from '../../assets/status.json'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const fs = require('fs')
const path = require('path')

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
})
