<!--
  Copyright (c) 2026 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch, nextTick } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Color,
  type BufferGeometry,
  type Line,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type PerspectiveCamera
} from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useGatewayAPI } from '@/composables/GatewayAPI'
import { APIServerError } from '@/composables/HTTPErrors'
import {
  chassisColors,
  CORES_BAR_TRACK_COLOR,
  coresBarAxis,
  coresPercentage,
  progressBarColor
} from '@/composables/resources/nodeColors'
import { useRuntimeStore } from '@/stores/runtime'
import type { ResourcesRepresentation } from '@/stores/runtime/resources'
import type { SlurmNode } from '@/composables/gateway/slurm/types'
import NodeMainState from '@/components/resources/NodeMainState.vue'
import NodeAllocationState from '@/components/resources/NodeAllocationState.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { ArrowPathIcon, ViewfinderCircleIcon } from '@heroicons/vue/24/outline'
import {
  applyFreeCameraDefaults,
  clampTurntableRadius,
  computeRackFocusBox,
  createTurntableEntryTransition,
  defaultTurntableHeight,
  defaultTurntableRadius,
  stepCameraTransition,
  TURNTABLE_SPEED,
  updateTurntableCamera,
  type CameraTransition,
  type RackFocus
} from '@/lib/infrastructureScene3d'

const props = withDefaults(
  defineProps<{
    cluster: string
    nodes: SlurmNode[]
    fullscreen: boolean
    mode?: ResourcesRepresentation
    showCameraControls?: boolean
  }>(),
  { showCameraControls: true }
)

const EQUIPMENT_CATEGORIES = new Set(['node', 'storage', 'network', 'misc'])
const CLICK_SLOP_PX = 4

const route = useRoute()
const router = useRouter()
const runtimeStore = useRuntimeStore()
const gateway = useGatewayAPI()

const containerRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const currentNode: Ref<SlurmNode | undefined> = ref()
const cameraMode = ref<'free' | 'turntable'>('free')

type PaintableMaterial = Material & {
  color: { set: (color: string) => void }
}

type SceneBundle = {
  renderer: import('three').WebGLRenderer
  controls: OrbitControls
  scene: import('three').Scene
  camera: PerspectiveCamera
  clock: import('three').Clock
  animationId: number
  resizeObserver: ResizeObserver
  root: Object3D
  raycaster: import('three').Raycaster
  pointer: import('three').Vector2
  pointerClientX: number
  pointerClientY: number
  pointerDirty: boolean
  hoveredEquipment: Object3D | null
  onKeyDown: (event: KeyboardEvent) => void
  onKeyUp: (event: KeyboardEvent) => void
  onKeyBlur: () => void
  onPointerMove: (event: PointerEvent) => void
  onPointerLeave: () => void
  onPointerDown: (event: PointerEvent) => void
  onPointerUp: (event: PointerEvent) => void
  onWheel: (event: WheelEvent) => void
  focus: RackFocus
  minDistance: number
  maxDistance: number
  turntableAngle: number
  turntableRadius: number
  turntableHeight: number
  cameraTransition: CameraTransition | null
  pointerDownX: number
  pointerDownY: number
  resize: () => void
}

const sceneBundle = shallowRef<SceneBundle | null>(null)
const NODE_EDGE_COLOR = '#4b5563'
const EQUIPMENT_BODY_COLOR = '#a8a8a8'
const CUBE_INDEX_COUNT = 36
const SHELL_INDEX_COUNT = 24
const FACE_INDEX_COUNT = 12
const FACE_STROKE_PX = 6
let sceneGeneration = 0

function findEquipmentAncestor(object: Object3D): Object3D | null {
  let current: Object3D | null = object
  while (current) {
    const category = current.userData?.category as string | undefined
    if (category && EQUIPMENT_CATEGORIES.has(category)) {
      return current
    }
    current = current.parent
  }
  return null
}

function isPaintable(object: Object3D): object is Mesh {
  return Boolean((object as Mesh).isMesh || (object as Line).isLine)
}

function equipmentMesh(equipment: Object3D): Mesh | null {
  for (const child of equipment.children) {
    const mesh = child as Mesh
    if (
      mesh.isMesh && mesh.userData?.category !== 'equipment-border'
    ) {
      return mesh
    }
  }
  return null
}

function equipmentBorder(equipment: Object3D): Object3D | null {
  for (const child of equipment.children) {
    if (child.userData?.category === 'equipment-border' && isPaintable(child)) {
      return child
    }
  }
  return null
}

function representation(): ResourcesRepresentation {
  return props.mode ?? 'nodes'
}

function selectableNode(nodeName: string): SlurmNode | undefined {
  return props.nodes.find((node) => node.name === nodeName)
}

function paintMaterial(material: PaintableMaterial, color: string) {
  material.color.set(color)
}

function stateMaterialOf(mesh: Mesh): MeshStandardMaterial | null {
  const material = mesh.material
  if (Array.isArray(material)) {
    return (material[1] as MeshStandardMaterial) ?? null
  }
  return material as MeshStandardMaterial
}

const groupedGeometries = new WeakSet<BufferGeometry>()
let shellMaterial: MeshStandardMaterial | null = null

type FaceBarUniforms = {
  uProgress: { value: number }
  uAxis: { value: number }
  uFill: { value: Color }
  uTrack: { value: Color }
  uStroke: { value: Color }
  uStrokePx: { value: number }
}

function withDepthBias(material: MeshStandardMaterial) {
  material.polygonOffset = true
  material.polygonOffsetFactor = 1
  material.polygonOffsetUnits = 1
  return material
}

function ensureFaceGroups(geometry: BufferGeometry) {
  if (groupedGeometries.has(geometry)) {
    return
  }
  geometry.clearGroups()
  geometry.addGroup(0, SHELL_INDEX_COUNT, 0)
  geometry.addGroup(SHELL_INDEX_COUNT, FACE_INDEX_COUNT, 1)
  groupedGeometries.add(geometry)
}

function equipmentShellMaterial(template: MeshStandardMaterial) {
  if (!shellMaterial) {
    shellMaterial = withDepthBias(template.clone())
    shellMaterial.color.set(EQUIPMENT_BODY_COLOR)
    shellMaterial.name = 'equipment-shell'
  }
  return shellMaterial
}

function ensureFaceShader(material: MeshStandardMaterial) {
  const data = material.userData as { faceBarUniforms?: FaceBarUniforms }
  if (data.faceBarUniforms) {
    return data.faceBarUniforms
  }
  const uniforms: FaceBarUniforms = {
    uProgress: { value: 1 },
    uAxis: { value: 0 },
    uFill: { value: new Color() },
    uTrack: { value: new Color(CORES_BAR_TRACK_COLOR) },
    uStroke: { value: new Color() },
    uStrokePx: { value: 0 }
  }
  data.faceBarUniforms = uniforms
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uProgress = uniforms.uProgress
    shader.uniforms.uAxis = uniforms.uAxis
    shader.uniforms.uFill = uniforms.uFill
    shader.uniforms.uTrack = uniforms.uTrack
    shader.uniforms.uStroke = uniforms.uStroke
    shader.uniforms.uStrokePx = uniforms.uStrokePx
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSlurmLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlurmLocal = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vSlurmLocal;
uniform float uProgress;
uniform float uAxis;
uniform vec3 uFill;
uniform vec3 uTrack;
uniform vec3 uStroke;
uniform float uStrokePx;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float slurmCoord = uAxis < 0.5 ? vSlurmLocal.x : vSlurmLocal.y;
diffuseColor.rgb = slurmCoord + 0.5 <= uProgress ? uFill : uTrack;
vec2 faceEdge = vec2(0.5) - abs(vSlurmLocal.xy);
vec2 faceGrad = max(fwidth(vSlurmLocal.xy), vec2(1e-6));
float edgePx = min(faceEdge.x / faceGrad.x, faceEdge.y / faceGrad.y);
float strokeMix = (1.0 - smoothstep(uStrokePx - 1.0, uStrokePx, edgePx)) * step(0.5, uStrokePx);
diffuseColor.rgb = mix(diffuseColor.rgb, uStroke, strokeMix);`
      )
  }
  material.customProgramCacheKey = () => 'slurm-equipment-face'
  material.needsUpdate = true
  return uniforms
}

function paintFace(mesh: Mesh, progress: number, axis: 0 | 1, fill: string, stroke?: string) {
  const material = stateMaterialOf(mesh)
  if (!material) {
    return
  }
  material.color.set(fill)
  material.userData.faceBar = { progress, axis, fill, stroke: stroke ?? null }
  if (typeof material.onBeforeCompile !== 'function') {
    return
  }
  const uniforms = ensureFaceShader(material)
  uniforms.uProgress.value = progress
  uniforms.uAxis.value = axis
  uniforms.uFill.value.set(fill)
  uniforms.uTrack.value.set(CORES_BAR_TRACK_COLOR)
  uniforms.uStroke.value.set(stroke ?? '#000000')
  uniforms.uStrokePx.value = stroke ? FACE_STROKE_PX : 0
}

function assignFrontBackMaterials(mesh: Mesh) {
  if (Array.isArray(mesh.material)) {
    return
  }
  const geometry = mesh.geometry
  const index = geometry?.getIndex()
  if (!geometry || !index || index.count !== CUBE_INDEX_COUNT) {
    mesh.material = withDepthBias((mesh.material as MeshStandardMaterial).clone())
    return
  }
  ensureFaceGroups(geometry)
  const source = mesh.material as MeshStandardMaterial
  const face = withDepthBias(source.clone())
  face.userData = {}
  mesh.material = [equipmentShellMaterial(source), face]
}

function colorEquipment(root: Object3D) {
  root.traverse((child) => {
    const category = child.userData?.category as string | undefined
    if (!category || !EQUIPMENT_CATEGORIES.has(category) || child.userData?.selected === false) {
      return
    }
    const node = selectableNode(child.name)
    const { fill, stroke } = chassisColors(node, representation())
    const mesh = equipmentMesh(child)
    if (mesh) {
      if (representation() === 'cores' && node) {
        const axis = coresBarAxis(mesh.scale.x, mesh.scale.y) === 'x' ? 0 : 1
        paintFace(
          mesh,
          coresPercentage(node) / 100,
          axis,
          progressBarColor(coresPercentage(node)),
          stroke
        )
      } else {
        paintFace(mesh, 1, 0, fill, stroke)
      }
    }
    const border = equipmentBorder(child)
    if (!border) {
      return
    }
    const borderMaterial = (border as Mesh).material as PaintableMaterial
    paintMaterial(borderMaterial, NODE_EDGE_COLOR)
  })
}

function prepareEquipmentMaterials(root: Object3D) {
  root.traverse((child) => {
    if (!isPaintable(child)) {
      return
    }
    const mesh = child as Mesh
    if (child.userData?.category === 'equipment-border') {
      mesh.renderOrder = 2
      mesh.material = (mesh.material as PaintableMaterial).clone()
      return
    }
    const equipment = findEquipmentAncestor(mesh)
    if (!equipment || !mesh.isMesh || equipment.userData?.selected === false) {
      return
    }
    assignFrontBackMaterials(mesh)
  })
}

function applyFloorAnisotropy(root: Object3D, anisotropy: number) {
  root.traverse((child) => {
    if (child.userData?.category !== 'floor') {
      return
    }
    const mesh = child as Mesh
    if (!mesh.isMesh) {
      return
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      const map = (material as MeshStandardMaterial).map
      if (map) {
        map.anisotropy = anisotropy
      }
    }
  })
}

function equipmentSurfaces(equipment: Object3D): Mesh[] {
  const surfaces: Mesh[] = []
  for (const child of equipment.children) {
    const mesh = child as Mesh
    if (
      mesh.isMesh && mesh.userData?.category !== 'equipment-border'
    ) {
      surfaces.push(mesh)
    }
  }
  return surfaces
}

function equipmentEmissiveColor(mesh: Mesh): number {
  return stateMaterialOf(mesh)?.color.getHex() ?? 0xffffff
}

function setEquipmentEmissive(mesh: Mesh, color: number, intensity: number) {
  const material = stateMaterialOf(mesh)
  if (!material) {
    return
  }
  material.emissive.setHex(color)
  material.emissiveIntensity = intensity
}

function applyHoverHighlight(bundle: SceneBundle, equipment: Object3D | null) {
  if (bundle.hoveredEquipment && bundle.hoveredEquipment !== equipment) {
    for (const mesh of equipmentSurfaces(bundle.hoveredEquipment)) {
      setEquipmentEmissive(mesh, 0x000000, 0)
    }
  }
  bundle.hoveredEquipment = equipment
  if (equipment) {
    for (const mesh of equipmentSurfaces(equipment)) {
      setEquipmentEmissive(mesh, equipmentEmissiveColor(mesh), 0.35)
    }
    bundle.renderer.domElement.style.cursor = 'pointer'
  } else {
    bundle.renderer.domElement.style.cursor = 'default'
  }
}

function pickEquipmentAt(
  renderer: import('three').WebGLRenderer,
  camera: PerspectiveCamera,
  root: Object3D,
  raycaster: import('three').Raycaster,
  pointer: import('three').Vector2,
  clientX: number,
  clientY: number
): Object3D | null {
  const rect = renderer.domElement.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return null
  }
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(root.children, true)
  for (const hit of hits) {
    const mesh = hit.object as Mesh
    if (!mesh.isMesh) {
      continue
    }
    const equipment = findEquipmentAncestor(mesh)
    if (
      equipment?.name &&
      equipment.userData?.selected !== false &&
      selectableNode(equipment.name)
    ) {
      return equipment
    }
  }
  return null
}

function updateHoverFromPointer(bundle: SceneBundle) {
  const equipment = pickEquipmentAt(
    bundle.renderer,
    bundle.camera,
    bundle.root,
    bundle.raycaster,
    bundle.pointer,
    bundle.pointerClientX,
    bundle.pointerClientY
  )
  if (bundle.hoveredEquipment === equipment) {
    return
  }
  applyHoverHighlight(bundle, equipment)
  currentNode.value = equipment ? selectableNode(equipment.name) : undefined
}

function disposeObject(object: Object3D) {
  const geometries = new Set<object>()
  const materials = new Set<Material>()
  object.traverse((child) => {
    if (!isPaintable(child)) {
      return
    }
    const mesh = child as Mesh
    if (mesh.geometry && !geometries.has(mesh.geometry)) {
      geometries.add(mesh.geometry)
      mesh.geometry.dispose()
    }
    const meshMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    meshMaterials.forEach((material) => {
      if (material && !materials.has(material)) {
        materials.add(material)
        material.dispose()
      }
    })
  })
  shellMaterial = null
}

function applyCameraModeChange(nextMode: 'free' | 'turntable') {
  const bundle = sceneBundle.value
  if (!bundle) {
    return
  }

  bundle.cameraTransition = null

  if (nextMode === 'turntable') {
    bundle.controls.enabled = false
    const { camera, controls, focus } = bundle
    const offsetX = camera.position.x - focus.center.x
    const offsetZ = camera.position.z - focus.center.z
    bundle.turntableAngle = Math.atan2(offsetX, offsetZ)
    bundle.turntableRadius = defaultTurntableRadius(focus, bundle.maxDistance)
    bundle.turntableHeight = defaultTurntableHeight(focus)
    bundle.cameraTransition = createTurntableEntryTransition(
      camera,
      controls,
      focus,
      bundle.turntableAngle,
      bundle.turntableRadius,
      bundle.turntableHeight
    )
    return
  }

  bundle.controls.target.copy(bundle.focus.center)
  bundle.controls.update()
  bundle.controls.enabled = true
}

watch(cameraMode, (nextMode) => {
  applyCameraModeChange(nextMode)
})

function teardown() {
  sceneGeneration += 1
  const bundle = sceneBundle.value
  if (!bundle) {
    return
  }
  cancelAnimationFrame(bundle.animationId)
  bundle.resizeObserver.disconnect()
  bundle.controls.dispose()
  applyHoverHighlight(bundle, null)
  currentNode.value = undefined
  bundle.renderer.domElement.removeEventListener('keydown', bundle.onKeyDown)
  bundle.renderer.domElement.removeEventListener('keyup', bundle.onKeyUp)
  bundle.renderer.domElement.removeEventListener('blur', bundle.onKeyBlur)
  window.removeEventListener('blur', bundle.onKeyBlur)
  bundle.renderer.domElement.removeEventListener('pointermove', bundle.onPointerMove)
  bundle.renderer.domElement.removeEventListener('pointerleave', bundle.onPointerLeave)
  bundle.renderer.domElement.removeEventListener('pointerdown', bundle.onPointerDown)
  bundle.renderer.domElement.removeEventListener('pointerup', bundle.onPointerUp)
  bundle.renderer.domElement.removeEventListener('wheel', bundle.onWheel)
  disposeObject(bundle.root)
  bundle.renderer.dispose()
  if (bundle.renderer.domElement.parentElement) {
    bundle.renderer.domElement.parentElement.removeChild(bundle.renderer.domElement)
  }
  sceneBundle.value = null
}

function reportLoadError(error: unknown) {
  if (error instanceof APIServerError) {
    errorMessage.value = `API server error (${error.status}): ${error.message}`
  } else if (error instanceof Error) {
    errorMessage.value = `Server error: ${error.message}`
  } else {
    errorMessage.value = 'Failed to load 3D scene'
  }
}

async function initScene() {
  const container = containerRef.value
  if (!container) {
    return
  }

  const generation = sceneGeneration + 1
  sceneGeneration = generation
  loading.value = true
  errorMessage.value = null
  currentNode.value = undefined

  try {
    const infrastructure = runtimeStore.getCluster(props.cluster).infrastructure
    const gltfDocument = await gateway.infrastructureGltf(props.cluster, infrastructure)
    if (generation !== sceneGeneration) {
      return
    }

    const THREE = await import('three')
    const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    if (generation !== sceneGeneration) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 5000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(window.devicePixelRatio)
    const canvas = renderer.domElement
    canvas.tabIndex = 0
    canvas.style.outline = 'none'
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    container.appendChild(canvas)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    scene.add(new THREE.AmbientLight(0xffffff, 0.82))
    scene.add(new THREE.HemisphereLight(0xf5f7ff, 0x8a9099, 0.48))
    const key = new THREE.DirectionalLight(0xffffff, 0.75)
    key.position.set(5, 14, 8)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.35)
    fill.position.set(-6, 9, -4)
    scene.add(fill)

    const loader = new GLTFLoader()
    const gltf = await new Promise<import('three/examples/jsm/loaders/GLTFLoader.js').GLTF>(
      (resolve, reject) => {
        loader.parse(
          JSON.stringify(gltfDocument),
          '',
          (result) => resolve(result),
          (error) => reject(error)
        )
      }
    )
    if (generation !== sceneGeneration) {
      renderer.dispose()
      canvas.remove()
      return
    }

    const root = gltf.scene
    applyFloorAnisotropy(root, renderer.capabilities.getMaxAnisotropy())
    prepareEquipmentMaterials(root)
    colorEquipment(root)
    scene.add(root)
    root.updateMatrixWorld(true)

    const focus = computeRackFocusBox(root)
    const { minDistance, maxDistance } = applyFreeCameraDefaults(camera, controls, focus)
    const turntableRadius = defaultTurntableRadius(focus, maxDistance)
    const turntableHeight = defaultTurntableHeight(focus)
    controls.enabled = cameraMode.value === 'free'
    if (props.fullscreen) {
      canvas.focus()
    }

    const resize = () => {
      const width = container.clientWidth
      const height = props.fullscreen
        ? container.clientHeight
        : Math.max(container.clientHeight, 384)
      if (width === 0 || height === 0) {
        return
      }
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
      controls.keyPanSpeed = Math.max(1, Math.round(height * 0.04))
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    const onPointerMove = (event: PointerEvent) => {
      const bundle = sceneBundle.value
      if (!bundle) {
        return
      }
      bundle.pointerClientX = event.clientX
      bundle.pointerClientY = event.clientY
      bundle.pointerDirty = true
    }

    const onPointerLeave = () => {
      const bundle = sceneBundle.value
      if (!bundle) {
        return
      }
      bundle.pointerDirty = false
      if (bundle.hoveredEquipment) {
        applyHoverHighlight(bundle, null)
        currentNode.value = undefined
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      const bundle = sceneBundle.value
      if (!bundle) {
        return
      }
      bundle.pointerDownX = event.clientX
      bundle.pointerDownY = event.clientY
    }

    const onPointerUp = (event: PointerEvent) => {
      const bundle = sceneBundle.value
      if (!bundle) {
        return
      }
      const dx = event.clientX - bundle.pointerDownX
      const dy = event.clientY - bundle.pointerDownY
      if (dx * dx + dy * dy > CLICK_SLOP_PX * CLICK_SLOP_PX) {
        return
      }
      const equipment = pickEquipmentAt(
        bundle.renderer,
        bundle.camera,
        bundle.root,
        bundle.raycaster,
        bundle.pointer,
        event.clientX,
        event.clientY
      )
      if (!equipment) {
        return
      }
      router.push({
        name: 'node',
        params: { cluster: props.cluster, nodeName: equipment.name },
        query: { returnTo: route.name as string }
      })
    }

    const onWheel = (event: WheelEvent) => {
      const bundle = sceneBundle.value
      if (!bundle || cameraMode.value !== 'turntable') {
        return
      }
      event.preventDefault()
      const delta = event.deltaY > 0 ? 0.15 : -0.15
      bundle.turntableRadius = clampTurntableRadius(
        bundle.turntableRadius + delta,
        bundle.minDistance,
        bundle.maxDistance
      )
    }

    const heldKeys = new Set<string>()
    let keyboardRotate = false
    let keyboardShift = false
    const arrowKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
    const modifierKeys = new Set([
      'ShiftLeft',
      'ShiftRight',
      'ControlLeft',
      'ControlRight',
      'MetaLeft',
      'MetaRight'
    ])
    // Each step is keyPanSpeed (4% of the canvas height). Twelve steps per second
    // crosses about half the view each second. Rotation keeps the faster rate.
    const keyHoldStepsPerSecond = 12
    const keyRotateStepsPerSecond = 30
    const keyPixelsPerSecond = () => controls.keyPanSpeed * keyHoldStepsPerSecond

    const moveFreeCameraForward = (pixelDelta: number) => {
      const offsetX = camera.position.x - controls.target.x
      const offsetY = camera.position.y - controls.target.y
      const offsetZ = camera.position.z - controls.target.z
      const distance = Math.hypot(offsetX, offsetY, offsetZ)
      const fov = ((camera.fov || 50) / 2) * (Math.PI / 180)
      const step =
        (2 * pixelDelta * distance * Math.tan(fov)) / Math.max(canvas.clientHeight, 1)
      const direction = new THREE.Vector3()
      camera.getWorldDirection(direction)
      direction.y = 0
      if (direction.lengthSq() < 1e-8) {
        direction.set(
          controls.target.x - camera.position.x,
          0,
          controls.target.z - camera.position.z
        )
      }
      if (direction.lengthSq() < 1e-8) {
        return
      }
      direction.normalize().multiplyScalar(step)
      camera.position.add(direction)
      controls.target.add(direction)
    }

    const applyHeldCameraKeys = (delta: number) => {
      if (!controls.enabled || heldKeys.size === 0 || delta <= 0) {
        return
      }
      const pixels = keyPixelsPerSecond() * delta
      if (keyboardRotate) {
        const rotate =
          ((2 * Math.PI * controls.keyRotateSpeed) / Math.max(canvas.clientHeight, 1)) *
          keyRotateStepsPerSecond *
          delta
        if (heldKeys.has('ArrowLeft')) {
          controls.rotateLeft(rotate)
        }
        if (heldKeys.has('ArrowRight')) {
          controls.rotateLeft(-rotate)
        }
        if (heldKeys.has('ArrowUp')) {
          controls.rotateUp(rotate)
        }
        if (heldKeys.has('ArrowDown')) {
          controls.rotateUp(-rotate)
        }
        return
      }
      let panX = 0
      let panY = 0
      if (heldKeys.has('ArrowLeft')) {
        panX += pixels
      }
      if (heldKeys.has('ArrowRight')) {
        panX -= pixels
      }
      if (keyboardShift) {
        if (heldKeys.has('ArrowUp')) {
          panY += pixels
        }
        if (heldKeys.has('ArrowDown')) {
          panY -= pixels
        }
      }
      if ((panX !== 0 || panY !== 0) && controls.enablePan) {
        controls.pan(panX, panY)
      }
      if (keyboardShift) {
        return
      }
      let forward = 0
      if (heldKeys.has('ArrowUp')) {
        forward += pixels
      }
      if (heldKeys.has('ArrowDown')) {
        forward -= pixels
      }
      if (forward !== 0) {
        moveFreeCameraForward(forward)
      }
    }

    const syncModifiers = (event: KeyboardEvent) => {
      keyboardRotate = event.ctrlKey || event.metaKey
      keyboardShift = event.shiftKey
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!controls.enabled) {
        return
      }
      if (modifierKeys.has(event.code)) {
        syncModifiers(event)
        return
      }
      if (!arrowKeys.has(event.code)) {
        return
      }
      heldKeys.add(event.code)
      syncModifiers(event)
      event.preventDefault()
    }

    const onKeyUp = (event: KeyboardEvent) => {
      heldKeys.delete(event.code)
      syncModifiers(event)
    }

    const onKeyBlur = () => {
      heldKeys.clear()
      keyboardRotate = false
      keyboardShift = false
    }

    renderer.domElement.addEventListener('keydown', onKeyDown)
    renderer.domElement.addEventListener('keyup', onKeyUp)
    renderer.domElement.addEventListener('blur', onKeyBlur)
    window.addEventListener('blur', onKeyBlur)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    const clock = new THREE.Clock()
    const bundleState: SceneBundle = {
      renderer,
      controls,
      scene,
      camera,
      clock,
      animationId: 0,
      resizeObserver,
      root,
      raycaster,
      pointer,
      pointerClientX: 0,
      pointerClientY: 0,
      pointerDirty: false,
      hoveredEquipment: null,
      onKeyDown,
      onKeyUp,
      onKeyBlur,
      onPointerMove,
      onPointerLeave,
      onPointerDown,
      onPointerUp,
      onWheel,
      focus,
      minDistance,
      maxDistance,
      turntableAngle: 0,
      turntableRadius,
      turntableHeight,
      cameraTransition: null,
      pointerDownX: 0,
      pointerDownY: 0,
      resize
    }
    sceneBundle.value = bundleState

    const animate = () => {
      bundleState.animationId = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      if (bundleState.pointerDirty) {
        bundleState.pointerDirty = false
        updateHoverFromPointer(bundleState)
      }
      if (bundleState.cameraTransition) {
        const finished = stepCameraTransition(camera, bundleState.cameraTransition, delta)
        if (finished) {
          controls.target.copy(bundleState.cameraTransition.toTarget)
          bundleState.cameraTransition = null
        }
      } else if (cameraMode.value === 'turntable') {
        bundleState.turntableAngle += delta * TURNTABLE_SPEED
        updateTurntableCamera(
          camera,
          bundleState.focus,
          bundleState.turntableAngle,
          bundleState.turntableRadius,
          bundleState.turntableHeight
        )
      } else {
        applyHeldCameraKeys(delta)
        controls.update()
      }
      renderer.render(scene, camera)
    }
    animate()
  } catch (error: unknown) {
    if (generation !== sceneGeneration) {
      return
    }
    reportLoadError(error)
  } finally {
    if (generation === sceneGeneration) {
      loading.value = false
    }
  }
}

watch(
  () => [props.nodes, props.mode] as const,
  () => {
    const bundle = sceneBundle.value
    if (!bundle) {
      return
    }
    if (bundle.hoveredEquipment && !selectableNode(bundle.hoveredEquipment.name)) {
      applyHoverHighlight(bundle, null)
      currentNode.value = undefined
    }
    colorEquipment(bundle.root)
  }
)

watch(
  () => props.cluster,
  async () => {
    teardown()
    await nextTick()
    await initScene()
  }
)

onMounted(() => {
  initScene()
})

onUnmounted(() => {
  teardown()
})
</script>

<template>
  <div
    :class="[fullscreen ? 'min-h-0 grow' : 'h-96', 'relative min-w-full']"
    :data-camera-mode="cameraMode"
    role="img"
    :aria-label="`3D layout of cluster ${props.cluster}`"
  >
    <div ref="containerRef" class="absolute inset-0" />

    <Teleport to="#resources-diagram-camera-controls" :disabled="!props.fullscreen">
      <div
        v-show="props.fullscreen || props.showCameraControls"
        :class="props.fullscreen ? '' : 'pointer-events-none absolute top-4 left-4 z-10'"
      >
        <span
          :class="[
            props.fullscreen ? '' : 'pointer-events-auto',
            'isolate inline-flex rounded-md shadow-xs'
          ]"
        >
        <button
          type="button"
          data-testid="resources-scene-camera-free"
          title="Free"
          aria-label="Free"
          :class="[
            cameraMode === 'free'
              ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
            'relative inline-flex items-center rounded-l-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
          ]"
          @click="cameraMode = 'free'"
        >
          <ViewfinderCircleIcon class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">Free</span>
        </button>
        <button
          type="button"
          data-testid="resources-scene-camera-orbit"
          title="Orbit racks"
          aria-label="Orbit racks"
          :class="[
            cameraMode === 'turntable'
              ? 'bg-slurmweb dark:bg-slurmweb-dark text-white'
              : 'bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 hover:dark:bg-gray-700',
            'relative inline-flex items-center rounded-r-md px-3 py-2 text-xs font-semibold ring-1 ring-gray-300 ring-inset focus:z-10 dark:ring-gray-600'
          ]"
          @click="cameraMode = 'turntable'"
        >
          <ArrowPathIcon class="h-4 w-4" aria-hidden="true" />
          <span class="sr-only">Orbit racks</span>
        </button>
        </span>
      </div>
    </Teleport>

    <div
      v-if="loading"
      class="text-slurmweb absolute inset-0 z-10 flex items-center justify-center"
    >
      <LoadingSpinner :size="8" />
    </div>
    <div
      v-else-if="errorMessage"
      class="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm text-gray-500"
    >
      {{ errorMessage }}
    </div>
    <aside
      v-if="currentNode && !loading && !errorMessage"
      data-testid="resources-scene-tooltip"
      class="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
    >
      <div class="w-40 overflow-hidden rounded-md bg-white shadow-lg dark:bg-gray-800">
        <ul role="list" class="divide-y divide-gray-200 dark:divide-gray-700">
          <li class="bg-gray-200 py-2 text-center text-sm dark:bg-gray-700 dark:text-gray-100">
            <strong>Node {{ currentNode.name }}</strong>
          </li>
          <li class="flex px-4 py-1 text-xs text-gray-400 dark:text-gray-200">
            <NodeMainState :status="currentNode.state" />
          </li>
          <li class="flex justify-between px-4 py-1 text-xs text-gray-400 dark:text-gray-200">
            <NodeAllocationState :status="currentNode.state" />
            <span
              v-if="props.mode === 'cores'"
              class="text-right text-xs text-gray-400 dark:text-gray-200"
            >
              {{ currentNode.alloc_cpus }}/{{ currentNode.cpus }}
            </span>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>
