import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest'

import { useGatewayAPI } from '@/composables/GatewayAPI'

// Stub REST API for infrastructureImagePng tests; we only care about parsing.
const mockRestAPI = {
  postRaw: vi.fn()
}

vi.mock('@/composables/RESTAPI', () => ({
  useRESTAPI: () => mockRestAPI
}))

// Provide minimal runtime configuration for GatewayAPI initialization.
vi.mock('@/plugins/runtimeConfiguration', () => ({
  useRuntimeConfiguration: () => ({
    api_server: 'http://localhost',
    authentication: true,
    racksdb_rows_labels: true,
    racksdb_racks_labels: true,
    version: 'test'
  })
}))

describe('infrastructureImagePng', () => {
  const originalResponse = globalThis.Response
  const coordinates = { node1: [0, 0, 10, 10] }
  const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

  beforeEach(() => {
    // The response body is not used by our fake Response, but keep a realistic
    // shape so GatewayAPI continues to call Response.formData().
    mockRestAPI.postRaw.mockResolvedValue({
      headers: { 'content-type': 'multipart/form-data; boundary=mock' },
      data: new Uint8Array([0x00])
    })

    // Build a minimal FormData-like object with the parts GatewayAPI expects.
    // This avoids undici multipart parsing in tests while still exercising
    // the extraction and JSON parsing logic.
    const image = new Blob([imageBytes], { type: 'image/png' })
    const coordinatesFile = new Blob([JSON.stringify(coordinates)], {
      type: 'application/json'
    })
    const formData = {
      get: (key: string) => {
        if (key === 'image') return image
        if (key === 'coordinates') return coordinatesFile
        return null
      }
    }

    // Fake Response.formData() to return our synthetic parts.
    globalThis.Response = class {
      constructor() {}
      async formData() {
        return formData
      }
    } as typeof Response
  })

  afterEach(() => {
    globalThis.Response = originalResponse
    vi.clearAllMocks()
  })

  test('parses image and coordinates from multipart response', async () => {
    const gateway = useGatewayAPI()
    const [image, parsedCoordinates] = await gateway.infrastructureImagePng(
      'cluster',
      'infra',
      100,
      100
    )

    expect(image).toBeInstanceOf(Blob)
    expect((image as Blob).type).toBe('image/png')
    expect(parsedCoordinates).toStrictEqual(coordinates)
  })
})
