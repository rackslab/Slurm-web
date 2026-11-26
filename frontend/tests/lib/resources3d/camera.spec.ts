import { describe, test, expect, vi } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import {
  KEY_ROTATE_SPEED,
  KeyboardNavigator,
  MAX_POLAR_ANGLE,
  MIN_DISTANCE,
  TURNTABLE_SPEED,
  Turntable,
  cameraAzimuth,
  cameraDepthRange,
  createTransition,
  defaultTurntableDistance,
  distanceLimits,
  initialPosition,
  moveForward,
  setupControls,
  stepTransition,
  zoomTurntableDistance
} from '@/lib/resources3d/camera'
import type { CameraControls } from '@/lib/resources3d/camera'
import type { Focus } from '@/lib/resources3d/scene'

const focus: Focus = {
  center: new Vector3(1, 1, 0),
  size: new Vector3(2, 2, 1),
  radius: 1.5,
  azimuth: 0
}

function mockControls(): CameraControls {
  return {
    target: focus.center.clone(),
    enabled: true,
    enablePan: true,
    screenSpacePanning: false,
    minDistance: 0,
    maxDistance: Infinity,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    pan: vi.fn(),
    rotateLeft: vi.fn(),
    rotateUp: vi.fn(),
    update: vi.fn(() => true)
  }
}

function key(key: string, modifiers: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, ...modifiers })
}

describe('resources3d camera', () => {
  test('depth range keeps near plane away from camera', () => {
    expect(cameraDepthRange(focus)).toStrictEqual({ near: 0.05, far: 1000 })
    expect(cameraDepthRange({ ...focus, radius: 100 }).far).toBe(2000)
  })

  test('setup controls limits', () => {
    const controls = mockControls()
    setupControls(controls, focus)
    expect(controls.minDistance).toBe(MIN_DISTANCE)
    expect(controls.maxDistance).toBe(distanceLimits(focus).max)
    expect(controls.maxPolarAngle).toBe(MAX_POLAR_ANGLE)
    expect(controls.enablePan).toBe(true)
    expect(controls.screenSpacePanning).toBe(true)
  })

  test('initial position is in front of and above racks', () => {
    const position = initialPosition(focus)
    expect(position.x).toBeCloseTo(focus.center.x)
    expect(position.y).toBeGreaterThan(focus.center.y)
    expect(position.z).toBeGreaterThan(focus.center.z + focus.radius)
    expect(cameraAzimuth(position, focus)).toBeCloseTo(0)
  })

  test('initial position faces racks doors', () => {
    const reversed = { ...focus, azimuth: Math.PI }
    const position = initialPosition(reversed)
    expect(position.z).toBeLessThan(focus.center.z - focus.radius)
    expect(position.x).toBeCloseTo(focus.center.x)
  })

  test('turntable distance is limited by zoom', () => {
    const distance = defaultTurntableDistance(focus)
    expect(zoomTurntableDistance(distance, 1, focus)).toBeGreaterThan(distance)
    expect(zoomTurntableDistance(distance, -1, focus)).toBeLessThan(distance)
    expect(zoomTurntableDistance(distance, 0, focus)).toBe(distance)
    expect(zoomTurntableDistance(1000, 1, focus)).toBe(distanceLimits(focus).max)
    expect(zoomTurntableDistance(MIN_DISTANCE, -1, focus)).toBe(MIN_DISTANCE)
  })

  test('turntable rotates around focus with eased speed', () => {
    const turntable = new Turntable()
    turntable.start(0, 5)
    // Rotation starts slowly
    turntable.step(focus, 0.1)
    expect(turntable.azimuth).toBeLessThan(TURNTABLE_SPEED * 0.1)
    // Then reaches full speed
    turntable.step(focus, 1)
    const azimuth = turntable.azimuth
    const position = turntable.step(focus, 1)
    expect(turntable.azimuth - azimuth).toBeCloseTo(TURNTABLE_SPEED)
    expect(cameraAzimuth(position, focus)).toBeCloseTo(turntable.azimuth)
    const horizontal = Math.hypot(position.x - focus.center.x, position.z - focus.center.z)
    expect(Math.hypot(horizontal, position.y - focus.center.y)).toBeCloseTo(5)
  })

  test('transition moves camera and target until finished', () => {
    const transition = createTransition(
      new Vector3(0, 0, 0),
      new Vector3(10, 0, 0),
      new Vector3(0, 0, 0),
      new Vector3(0, 10, 0),
      1
    )
    const position = new Vector3()
    const target = new Vector3()
    expect(stepTransition(transition, 0.5, position, target)).toBe(false)
    // Eased out: more than half the way at half the duration
    expect(position.x).toBeGreaterThan(5)
    expect(target.y).toBeCloseTo(position.x)
    expect(stepTransition(transition, 0.6, position, target)).toBe(true)
    expect(position.x).toBe(10)
    expect(target.y).toBe(10)
  })

  test('transition without duration finishes immediately', () => {
    const transition = createTransition(
      new Vector3(),
      new Vector3(1, 1, 1),
      new Vector3(),
      new Vector3(),
      0
    )
    const position = new Vector3()
    expect(stepTransition(transition, 0, position, new Vector3())).toBe(true)
    expect(position.x).toBe(1)
  })

  test('move forward on horizontal plane', () => {
    const camera = new PerspectiveCamera(45)
    camera.position.set(0, 5, 10)
    const controls = { target: new Vector3(0, 0, 0) }
    moveForward(camera, controls, 100, 800)
    expect(camera.position.y).toBe(5)
    expect(camera.position.z).toBeLessThan(10)
    expect(controls.target.y).toBe(0)
    expect(controls.target.z).toBeCloseTo(camera.position.z - 10)
  })

  describe('keyboard navigator', () => {
    test('ignores other keys', () => {
      const navigator = new KeyboardNavigator()
      expect(navigator.keydown(key('a'))).toBe(false)
      expect(navigator.active).toBe(false)
    })

    test('pans left and right', () => {
      const navigator = new KeyboardNavigator()
      const controls = mockControls()
      const camera = new PerspectiveCamera()
      expect(navigator.keydown(key('ArrowLeft'))).toBe(true)
      navigator.step(0.1, camera, controls, 500)
      expect(controls.pan).toHaveBeenCalledWith(expect.any(Number), 0)
      expect(vi.mocked(controls.pan).mock.calls[0][0]).toBeGreaterThan(0)
      navigator.keyup(key('ArrowLeft'))
      navigator.keydown(key('ArrowRight'))
      navigator.step(0.1, camera, controls, 500)
      expect(vi.mocked(controls.pan).mock.calls[1][0]).toBeLessThan(0)
    })

    test('moves forward with up arrow, pans up with shift', () => {
      const navigator = new KeyboardNavigator()
      const controls = mockControls()
      const camera = new PerspectiveCamera()
      camera.position.set(1, 3, 6)
      navigator.keydown(key('ArrowUp'))
      navigator.step(0.1, camera, controls, 500)
      expect(controls.pan).not.toHaveBeenCalled()
      expect(camera.position.z).toBeLessThan(6)
      navigator.keydown(key('Shift', { shiftKey: true }))
      navigator.step(0.1, camera, controls, 500)
      expect(controls.pan).toHaveBeenCalledWith(0, expect.any(Number))
    })

    test('rotates with ctrl or meta', () => {
      const navigator = new KeyboardNavigator()
      const controls = mockControls()
      const camera = new PerspectiveCamera()
      navigator.keydown(key('ArrowLeft', { ctrlKey: true }))
      navigator.keydown(key('ArrowDown', { ctrlKey: true }))
      navigator.step(0.1, camera, controls, 500)
      expect(vi.mocked(controls.rotateLeft).mock.calls[0][0]).toBeCloseTo(KEY_ROTATE_SPEED * 0.1)
      // Rotation speed does not depend on viewport size
      navigator.step(0.1, camera, controls, 2000)
      expect(vi.mocked(controls.rotateLeft).mock.calls[1][0]).toBeCloseTo(KEY_ROTATE_SPEED * 0.1)
      expect(vi.mocked(controls.rotateUp).mock.calls[0][0]).toBeLessThan(0)
      expect(controls.pan).not.toHaveBeenCalled()
      navigator.clear()
      navigator.keydown(key('ArrowRight', { metaKey: true }))
      navigator.step(0.1, camera, controls, 500)
      expect(vi.mocked(controls.rotateLeft).mock.calls[2][0]).toBeLessThan(0)
    })

    test('moves faster with longer delta', () => {
      const navigator = new KeyboardNavigator()
      const controls = mockControls()
      const camera = new PerspectiveCamera()
      navigator.keydown(key('ArrowLeft'))
      navigator.step(0.1, camera, controls, 500)
      navigator.step(0.2, camera, controls, 500)
      const [first, second] = vi.mocked(controls.pan).mock.calls
      expect(second[0]).toBeCloseTo(first[0] * 2)
    })

    test('does nothing when controls are disabled or keys released', () => {
      const navigator = new KeyboardNavigator()
      const controls = mockControls()
      const camera = new PerspectiveCamera()
      navigator.keydown(key('ArrowLeft'))
      controls.enabled = false
      navigator.step(0.1, camera, controls, 500)
      controls.enabled = true
      navigator.clear()
      navigator.step(0.1, camera, controls, 500)
      expect(controls.pan).not.toHaveBeenCalled()
    })
  })
})
