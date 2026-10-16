/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import ResourcesScene3D from '@/components/resources/ResourcesScene3D.vue'
import { init_plugins } from '../../lib/common'
import { useRuntimeStore } from '@/stores/runtime'
import { APIServerError } from '@/composables/HTTPErrors'
import type { SlurmNode } from '@/composables/gateway/slurm/types'
import type { RouterMock } from 'vue-router-mock'

const infrastructureGltf = vi.fn()

vi.mock('@/composables/GatewayAPI', () => ({
  useGatewayAPI: () => ({
    infrastructureGltf
  })
}))

type MockMaterial = {
  color: { value: string; set: (color: string) => void; getHex: () => number }
  emissive: { setHex: (color: number) => void }
  emissiveIntensity: number
  map: null
  polygonOffset: boolean
  polygonOffsetFactor: number
  polygonOffsetUnits: number
  userData: {
    faceBar?: { progress: number; axis: number; fill: string; stroke: string | null }
  }
  dispose: () => void
  clone: () => MockMaterial
}

type MockVec = {
  x: number
  y: number
  z: number
  set: (x: number, y: number, z: number) => void
}

type MockGeometry = {
  userData: { faceSplit?: boolean; split?: MockGeometry }
  groups: { start: number; count: number; materialIndex: number }[]
  getIndex: () => { count: number }
  clearGroups: () => void
  addGroup: (start: number, count: number, materialIndex: number) => void
  clone: () => MockGeometry
  dispose: () => void
}

type MockObject = {
  name: string
  isMesh?: boolean
  userData: { category?: string; coresBase?: unknown }
  material?: MockMaterial | MockMaterial[]
  geometry?: MockGeometry
  children: MockObject[]
  parent: MockObject | null
  renderOrder?: number
  scale: MockVec
  position: MockVec
  updateMatrixWorld?: () => void
  traverse: (fn: (object: MockObject) => void) => void
  clone: () => MockObject
  add: (child: MockObject) => void
  remove: (child: MockObject) => void
}

function makeVec(x = 0, y = 0, z = 0): MockVec {
  return {
    x,
    y,
    z,
    set(nextX: number, nextY: number, nextZ: number) {
      this.x = nextX
      this.y = nextY
      this.z = nextZ
    }
  }
}

const sceneMock = vi.hoisted(() => ({
  root: null as MockObject | null,
  hitName: null as string | null,
  frames: [] as FrameRequestCallback[],
  camera: null as {
    position: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => void }
    fov: number
  } | null,
  controls: null as {
    target: { x: number; y: number; z: number }
    pans: number[][]
    rotateUps: number[]
  } | null,
  frameDelta: 0
}))

function makeMaterial(): MockMaterial {
  const color = {
    value: '',
    set(next: string) {
      this.value = next
    },
    getHex() {
      return 0xffffff
    }
  }
  const material: MockMaterial = {
    color,
    emissive: { setHex() {} },
    emissiveIntensity: 0,
    map: null,
    polygonOffset: false,
    polygonOffsetFactor: 0,
    polygonOffsetUnits: 0,
    userData: {} as {
      faceBar?: { progress: number; axis: number; fill: string; stroke: string | null }
    },
    dispose() {},
    clone() {
      const copy = makeMaterial()
      copy.color.value = color.value
      return copy
    }
  }
  return material
}

const sharedGeometryUserData: MockGeometry['userData'] = {}

function makeCubeGeometry(): MockGeometry {
  const groups: { start: number; count: number; materialIndex: number }[] = []
  const geometry: MockGeometry = {
    userData: sharedGeometryUserData,
    groups,
    getIndex: () => ({ count: 36 }),
    clearGroups() {
      groups.length = 0
    },
    addGroup(start, count, materialIndex) {
      groups.push({ start, count, materialIndex })
    },
    clone() {
      const copy = makeCubeGeometry()
      copy.userData = this.userData
      return copy
    },
    dispose() {}
  }
  return geometry
}

function clonedMaterial(material: MockMaterial | MockMaterial[] | undefined) {
  if (Array.isArray(material)) return material.map((entry) => entry.clone())
  return material?.clone()
}

function makeEquipment(name: string, ghost = false): MockObject {
  const equipment: MockObject = {
    name,
    userData: ghost ? { category: 'node', selected: false } : { category: 'node' },
    children: [],
    parent: null,
    scale: makeVec(),
    position: makeVec(),
    traverse(fn) {
      fn(this)
      for (const child of this.children) child.traverse(fn)
    },
    clone() {
      return this
    },
    add(child) {
      child.parent = this
      this.children.push(child)
    },
    remove(child) {
      const index = this.children.indexOf(child)
      if (index >= 0) this.children.splice(index, 1)
      child.parent = null
    }
  }
  const fill: MockObject = {
    name: `${name}-fill`,
    isMesh: true,
    userData: {},
    material: makeMaterial(),
    geometry: makeCubeGeometry(),
    children: [],
    parent: equipment,
    scale: makeVec(2, 0.2, 1),
    position: makeVec(),
    traverse(fn) {
      fn(this)
    },
    clone() {
      const copy: MockObject = {
        name: 'cores-progress',
        isMesh: true,
        userData: {},
        material: clonedMaterial(this.material),
        geometry: this.geometry,
        children: [],
        parent: null,
        scale: makeVec(this.scale.x, this.scale.y, this.scale.z),
        position: makeVec(this.position.x, this.position.y, this.position.z),
        traverse(fn) {
          fn(copy)
        },
        clone() {
          return copy
        },
        add() {},
        remove() {}
      }
      return copy
    },
    add() {},
    remove() {}
  }
  const border: MockObject = {
    name: `${name}-border`,
    isMesh: true,
    userData: { category: 'equipment-border' },
    material: makeMaterial(),
    children: [],
    parent: equipment,
    renderOrder: 0,
    scale: makeVec(2, 0.2, 1),
    position: makeVec(),
    traverse(fn) {
      fn(this)
    },
    clone() {
      return this
    },
    add() {},
    remove() {}
  }
  if (ghost && fill.material && border.material) {
    fill.material.color.set('#737373')
    border.material.color.set('#737373')
  }
  equipment.children.push(fill, border)
  return equipment
}

function stateMaterial(material: MockMaterial | MockMaterial[] | undefined): MockMaterial | undefined {
  if (Array.isArray(material)) return material[1]
  return material
}

function fillColor(name: string): string {
  const equipment = sceneMock.root?.children.find((child) => child.name === name)
  return stateMaterial(equipment?.children[0].material)?.color.value ?? ''
}

function shellColor(name: string): string {
  const equipment = sceneMock.root?.children.find((child) => child.name === name)
  const material = equipment?.children[0].material
  return Array.isArray(material) ? material[0].color.value : ''
}

function strokeColor(name: string): string {
  const equipment = sceneMock.root?.children.find((child) => child.name === name)
  return equipment?.children[1].material?.color.value ?? ''
}

vi.mock('three', () => {
  class Vector3 {
    x = 0
    y = 0
    z = 0
    set(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
      return this
    }
    copy(other: Vector3) {
      this.x = other.x
      this.y = other.y
      this.z = other.z
      return this
    }
    clone() {
      return new Vector3().copy(this)
    }
    lerpVectors(a: Vector3, b: Vector3, t: number) {
      this.x = a.x + (b.x - a.x) * t
      this.y = a.y + (b.y - a.y) * t
      this.z = a.z + (b.z - a.z) * t
      return this
    }
    add(other: { x: number; y: number; z: number }) {
      this.x += other.x
      this.y += other.y
      this.z += other.z
      return this
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z
    }
    normalize() {
      const length = Math.hypot(this.x, this.y, this.z) || 1
      this.x /= length
      this.y /= length
      this.z /= length
      return this
    }
    multiplyScalar(scale: number) {
      this.x *= scale
      this.y *= scale
      this.z *= scale
      return this
    }
  }
  return {
    Scene: class {
      add() {}
      background = null
    },
    Color: class {
      constructor() {}
    },
    PerspectiveCamera: class {
      fov = 50
      position = new Vector3()
      aspect = 1
      constructor(fov = 50) {
        this.fov = fov
        sceneMock.camera = this
      }
      updateProjectionMatrix() {}
      lookAt() {}
      getWorldDirection(target: Vector3) {
        target.set(0, -0.5, -1)
        return target
      }
    },
    WebGLRenderer: class {
      domElement = Object.assign(document.createElement('canvas'), {
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width: 200,
          height: 200,
          right: 200,
          bottom: 200,
          x: 0,
          y: 0,
          toJSON() {
            return {}
          }
        })
      })
      outputColorSpace = ''
      capabilities = { getMaxAnisotropy: () => 8 }
      setSize() {}
      setPixelRatio() {}
      dispose() {}
      render() {}
    },
    SRGBColorSpace: 'srgb',
    AmbientLight: class {},
    HemisphereLight: class {},
    DirectionalLight: class {
      position = new Vector3()
    },
    Box3: class {
      isEmpty() {
        return true
      }
      setFromObject() {
        return this
      }
      union() {
        return this
      }
      getCenter(target: Vector3) {
        return target
      }
      getSize(target: Vector3) {
        return target
      }
    },
    Vector3,
    Raycaster: class {
      setFromCamera() {}
      intersectObjects() {
        if (!sceneMock.hitName || !sceneMock.root) return []
        const equipment = sceneMock.root.children.find((child) => child.name === sceneMock.hitName)
        const mesh = equipment?.children.find(
          (child) => child.isMesh && child.userData.category !== 'equipment-border'
        )
        return mesh ? [{ object: mesh }] : []
      }
    },
    Vector2: class {
      x = 0
      y = 0
    },
    Clock: class {
      getDelta() {
        return sceneMock.frameDelta
      }
    }
  }
})

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    enableDamping = true
    enabled = true
    minDistance = 0
    maxDistance = 10
    minPolarAngle = 0
    maxPolarAngle = Math.PI
    enablePan = true
    screenSpacePanning = true
    keyPanSpeed = 7
    keyRotateSpeed = 1
    pans: number[][] = []
    rotateUps: number[] = []
    target = {
      x: 0,
      y: 0,
      z: 0,
      add(other: { x: number; y: number; z: number }) {
        this.x += other.x
        this.y += other.y
        this.z += other.z
        return this
      },
      copy() {
        return this
      },
      clone() {
        return { x: 0, y: 0, z: 0, copy() {}, clone() {} }
      }
    }
    constructor() {
      sceneMock.controls = this
    }
    pan(x: number, y: number) {
      this.pans.push([x, y])
    }
    rotateLeft() {}
    rotateUp(angle: number) {
      this.rotateUps.push(angle)
    }
    update() {}
    dispose() {}
  }
}))

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    parse(_json: string, _path: string, onLoad: (gltf: { scene: MockObject }) => void) {
      const root: MockObject = {
        name: 'root',
        userData: {},
        children: [
          makeEquipment('cn-idle'),
          makeEquipment('cn-full'),
          makeEquipment('cn-hidden'),
          makeEquipment('sw-ghost', true)
        ],
        parent: null,
        updateMatrixWorld() {},
        traverse(fn) {
          fn(this)
          for (const child of this.children) child.traverse(fn)
        }
      }
      sceneMock.root = root
      onLoad({ scene: root })
    }
  }
}))

function slurmNode(name: string, state: string[], alloc_cpus: number, cpus: number): SlurmNode {
  return { name, state, alloc_cpus, cpus } as SlurmNode
}

const visibleNodes = [
  slurmNode('cn-idle', ['IDLE', 'DRAIN'], 0, 8),
  slurmNode('cn-full', ['ALLOCATED'], 8, 8)
]

let router: RouterMock

describe('ResourcesScene3D.vue', () => {
  beforeEach(() => {
    router = init_plugins()
    sceneMock.root = null
    sceneMock.hitName = null
    sceneMock.frames = []
    sceneMock.camera = null
    sceneMock.controls = null
    sceneMock.frameDelta = 0
    infrastructureGltf.mockReset()
    infrastructureGltf.mockResolvedValue({ asset: { version: '2.0' } })
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      }
    )
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      sceneMock.frames.push(callback)
      return sceneMock.frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', () => {})
  })

  function mountScene(mode: 'nodes' | 'cores' = 'nodes') {
    return mount(ResourcesScene3D, {
      props: { cluster: 'foo', nodes: visibleNodes, fullscreen: false, mode },
      attachTo: document.body
    })
  }

  test('loads the infrastructure glTF', async () => {
    mountScene()
    await flushPromises()
    expect(infrastructureGltf).toHaveBeenCalledWith('foo', 'foo-infra')
  })

  test('shows the API error when glTF is unsupported', async () => {
    infrastructureGltf.mockRejectedValueOnce(
      new APIServerError(400, 'Unsupported image format gltf')
    )
    const wrapper = mountScene()
    await flushPromises()
    expect(wrapper.text()).toContain('API server error (400): Unsupported image format gltf')
  })

  test('colors chassis by node state and grays nodes outside the selection', async () => {
    mountScene('nodes')
    await flushPromises()
    expect(fillColor('cn-idle')).toBe('#70e079')
    expect(shellColor('cn-idle')).toBe('#a8a8a8')
    expect(strokeColor('cn-idle')).toBe('#4b5563')
    expect(fillColor('cn-full')).toBe('#e17100')
    expect(shellColor('cn-full')).toBe('#a8a8a8')
    expect(strokeColor('cn-full')).toBe('#4b5563')
    expect(fillColor('cn-hidden')).toBe('#aaaaaa')
    expect(strokeColor('cn-hidden')).toBe('#4b5563')
    expect(fillColor('sw-ghost')).toBe('#737373')
    expect(strokeColor('sw-ghost')).toBe('#737373')
    expect(
      Array.isArray(
        sceneMock.root?.children.find((child) => child.name === 'sw-ghost')?.children[0].material
      )
    ).toBe(false)
    const drainedFace = stateMaterial(
      sceneMock.root?.children.find((child) => child.name === 'cn-idle')?.children[0].material
    )
    expect(drainedFace?.userData.faceBar).toEqual({
      progress: 1,
      axis: 0,
      fill: '#70e079',
      stroke: '#b654d6'
    })
    const fullFace = stateMaterial(
      sceneMock.root?.children.find((child) => child.name === 'cn-full')?.children[0].material
    )
    expect(fullFace?.userData.faceBar?.stroke).toBeNull()
    const geometry = sceneMock.root?.children.find((child) => child.name === 'cn-full')?.children[0]
      .geometry
    expect(geometry?.groups).toEqual([
      { start: 0, count: 24, materialIndex: 0 },
      { start: 24, count: 12, materialIndex: 1 }
    ])
  })

  test('recolors chassis by core allocation as a progress bar', async () => {
    const wrapper = mountScene('nodes')
    await flushPromises()
    await wrapper.setProps({
      mode: 'cores',
      nodes: [
        slurmNode('cn-idle', ['IDLE', 'DRAIN'], 4, 8),
        slurmNode('cn-full', ['ALLOCATED'], 8, 8)
      ]
    })
    await nextTick()
    const idle = sceneMock.root?.children.find((child) => child.name === 'cn-idle')
    const idleFace = stateMaterial(idle?.children[0].material)
    expect(idle?.children).toHaveLength(2)
    expect(idle?.children[0].scale.x).toBe(2)
    expect(idle?.children[0].position.x).toBe(0)
    expect(idleFace?.userData.faceBar).toEqual({
      progress: 0.5,
      axis: 0,
      fill: '#ffd230',
      stroke: '#b654d6'
    })
    expect(shellColor('cn-idle')).toBe('#a8a8a8')
    expect(strokeColor('cn-idle')).toBe('#4b5563')
    const fullFace = stateMaterial(
      sceneMock.root?.children.find((child) => child.name === 'cn-full')?.children[0].material
    )
    expect(fullFace?.userData.faceBar).toEqual({
      progress: 1,
      axis: 0,
      fill: '#f54900',
      stroke: null
    })

    await wrapper.setProps({ mode: 'nodes', nodes: visibleNodes })
    await nextTick()
    expect(idleFace?.userData.faceBar).toEqual({
      progress: 1,
      axis: 0,
      fill: '#70e079',
      stroke: '#b654d6'
    })
    expect(idle?.children).toHaveLength(2)
    expect(idle?.children[0].scale.x).toBe(2)
  })

  function dispatchPointer(canvas: Element, type: string, clientX: number, clientY: number) {
    canvas.dispatchEvent(new PointerEvent(type, { clientX, clientY, bubbles: true }))
  }

  test('clicking a node opens its page', async () => {
    sceneMock.hitName = 'cn-full'
    const wrapper = mountScene()
    await flushPromises()
    const canvas = wrapper.get('canvas').element
    dispatchPointer(canvas, 'pointerdown', 10, 10)
    dispatchPointer(canvas, 'pointerup', 11, 10)
    expect(router.push).toHaveBeenCalledWith({
      name: 'node',
      params: { cluster: 'foo', nodeName: 'cn-full' },
      query: { returnTo: router.currentRoute.value.name }
    })
  })

  test('dragging the camera does not open a node', async () => {
    sceneMock.hitName = 'cn-full'
    const wrapper = mountScene()
    await flushPromises()
    const canvas = wrapper.get('canvas').element
    dispatchPointer(canvas, 'pointerdown', 0, 0)
    dispatchPointer(canvas, 'pointerup', 40, 0)
    expect(router.push).not.toHaveBeenCalled()
  })

  test('hovering a node shows its state card', async () => {
    sceneMock.hitName = 'cn-full'
    const wrapper = mountScene('cores')
    await flushPromises()
    dispatchPointer(wrapper.get('canvas').element, 'pointermove', 20, 20)
    sceneMock.frames.at(-1)?.(0)
    await nextTick()
    const tooltip = wrapper.get('[data-testid="resources-scene-tooltip"]')
    expect(tooltip.text()).toContain('Node cn-full')
    expect(tooltip.text()).toContain('8/8')
  })

  test('switches to the orbit camera', async () => {
    const wrapper = mountScene()
    await flushPromises()
    await wrapper.get('[data-testid="resources-scene-camera-orbit"]').trigger('click')
    expect(wrapper.attributes('data-camera-mode')).toBe('turntable')
  })

  test('arrow keys are handled by the focused canvas', async () => {
    const wrapper = mountScene()
    await flushPromises()
    const canvas = wrapper.get('canvas').element
    expect(canvas.tabIndex).toBe(0)
    expect((canvas as HTMLElement).style.outline).toBe('none')
    expect(document.activeElement).not.toBe(canvas)
    const controls = sceneMock.controls
    const camera = sceneMock.camera
    expect(controls).toBeTruthy()
    expect(camera).toBeTruthy()
    camera?.position.set(0, 2, 5)
    if (controls) {
      controls.target.x = 0
      controls.target.y = 1
      controls.target.z = 0
    }
    canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }))
    sceneMock.frameDelta = 1 / 12
    sceneMock.frames.at(-1)?.(0)
    expect(controls?.pans).toEqual([[7, 0]])
    expect(controls?.target.z).toBe(0)
    canvas.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }))
    canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }))
    sceneMock.frames.at(-1)?.(0)
    expect(controls?.target.y).toBe(1)
    expect(controls?.target.z).toBeLessThan(0)
    canvas.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', bubbles: true }))
    canvas.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true }))
    sceneMock.frames.at(-1)?.(0)
    expect(controls?.target.z).toBeCloseTo(0)
    expect(controls?.pans).toEqual([[7, 0]])
    canvas.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowDown', bubbles: true }))
    canvas.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowUp', shiftKey: true, bubbles: true })
    )
    sceneMock.frames.at(-1)?.(0)
    expect(controls?.pans).toEqual([
      [7, 0],
      [0, 7]
    ])
    expect(controls?.target.z).toBeCloseTo(0)
    canvas.dispatchEvent(
      new KeyboardEvent('keyup', { code: 'ArrowUp', shiftKey: false, bubbles: true })
    )
    canvas.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'ArrowUp', ctrlKey: true, bubbles: true })
    )
    sceneMock.frames.at(-1)?.(0)
    expect(controls?.rotateUps.length).toBe(1)
    expect(controls?.pans).toEqual([
      [7, 0],
      [0, 7]
    ])
    expect(controls?.target.z).toBeCloseTo(0)
  })

  test('fullscreen focuses the canvas so arrow keys work immediately', async () => {
    const target = document.createElement('div')
    target.id = 'resources-diagram-camera-controls'
    document.body.appendChild(target)
    const wrapper = mount(ResourcesScene3D, {
      props: { cluster: 'foo', nodes: visibleNodes, fullscreen: true },
      attachTo: document.body
    })
    await flushPromises()
    expect(document.activeElement).toBe(wrapper.get('canvas').element)
    wrapper.unmount()
    target.remove()
  })
})
