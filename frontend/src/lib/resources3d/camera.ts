/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

/*
 * Camera of the resources 3D view. It is controlled in two modes:
 *
 * - free: the user orbits, pans and zooms with the mouse (OrbitControls) and moves
 *   with the keyboard arrows (forward/backward, left/right, up/down with Shift,
 *   rotation with Ctrl/Cmd).
 * - turntable: the camera orbits automatically around the racks, the mouse wheel
 *   changes the orbit radius.
 *
 * The camera moves from one mode to the other with eased transitions.
 */

import { MathUtils, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import type { Focus } from '@/lib/resources3d/scene'

export type CameraMode = 'free' | 'turntable'

export const CAMERA_FOV = 45
/* Turntable rotation speed in radians per second */
export const TURNTABLE_SPEED = 0.25
/* Duration of camera transitions in seconds */
export const TRANSITION_DURATION = 0.9
/* Minimal distance between camera and its target in meters */
export const MIN_DISTANCE = 0.4
/* Polar angles limits, to keep the camera above the floor without looking
 * straight down. */
export const MIN_POLAR_ANGLE = 0.12
export const MAX_POLAR_ANGLE = Math.PI / 2 - 0.08
/* Elevation angle of camera initial and turntable positions */
const ELEVATION = MathUtils.degToRad(25)
/* Factor applied to turntable radius for each mouse wheel step */
const TURNTABLE_ZOOM_FACTOR = 1.1

/* Subset of OrbitControls used to setup controls and to move camera with the
 * keyboard. */
export interface CameraControls {
  target: Vector3
  enabled: boolean
  enablePan: boolean
  screenSpacePanning: boolean
  minDistance: number
  maxDistance: number
  minPolarAngle: number
  maxPolarAngle: number
  pan(deltaX: number, deltaY: number): void
  rotateLeft(angle: number): void
  rotateUp(angle: number): void
  update(delta?: number | null): boolean
}

/* Return near and far planes of camera. The near plane is not too close to the
 * camera to keep enough depth buffer precision far from the camera, where floor
 * tiles are very close to each other. */
export function cameraDepthRange(focus: Focus): { near: number; far: number } {
  return { near: 0.05, far: Math.max(1000, focus.radius * 20) }
}

/* Return minimal and maximal distances between camera and its target. */
export function distanceLimits(focus: Focus): { min: number; max: number } {
  return { min: MIN_DISTANCE, max: Math.max(focus.radius * 6, 5) }
}

/* Return distance between camera and focus center to view the whole focus area
 * with the given vertical field of view in degrees. */
export function fitDistance(focus: Focus, fov: number = CAMERA_FOV): number {
  return (focus.radius / Math.sin(MathUtils.degToRad(fov) / 2)) * 1.05
}

/* Return camera position at the given distance of focus center, with the given
 * azimuth in radians around the vertical axis of the focus area (0 being the
 * front, at +Z, where racks doors are) and elevation. */
export function orbitPosition(
  focus: Focus,
  azimuth: number,
  distance: number,
  elevation: number = ELEVATION
): Vector3 {
  const horizontal = distance * Math.cos(elevation)
  return new Vector3(
    focus.center.x + horizontal * Math.sin(azimuth),
    focus.center.y + distance * Math.sin(elevation),
    focus.center.z + horizontal * Math.cos(azimuth)
  )
}

/* Return initial camera position, in front of the racks doors viewing them all. */
export function initialPosition(focus: Focus, fov: number = CAMERA_FOV): Vector3 {
  return orbitPosition(focus, focus.azimuth, fitDistance(focus, fov))
}

/* Return the azimuth in radians of the given position around the vertical axis
 * of the focus area. */
export function cameraAzimuth(position: Vector3, focus: Focus): number {
  return Math.atan2(position.x - focus.center.x, position.z - focus.center.z)
}

/* Return the default distance of turntable camera to the focus center. */
export function defaultTurntableDistance(focus: Focus, fov: number = CAMERA_FOV): number {
  return clampDistance(fitDistance(focus, fov), focus)
}

/* Return the turntable distance changed by a mouse wheel step in the given
 * direction (positive to move away), within distance limits. */
export function zoomTurntableDistance(distance: number, direction: number, focus: Focus): number {
  if (direction === 0) return distance
  const factor = direction > 0 ? TURNTABLE_ZOOM_FACTOR : 1 / TURNTABLE_ZOOM_FACTOR
  return clampDistance(distance * factor, focus)
}

export function clampDistance(distance: number, focus: Focus): number {
  const { min, max } = distanceLimits(focus)
  return MathUtils.clamp(distance, min, max)
}

/* Setup controls limits for free mode. */
export function setupControls(controls: CameraControls, focus: Focus) {
  const { min, max } = distanceLimits(focus)
  controls.minDistance = min
  controls.maxDistance = max
  controls.minPolarAngle = MIN_POLAR_ANGLE
  controls.maxPolarAngle = MAX_POLAR_ANGLE
  controls.enablePan = true
  controls.screenSpacePanning = true
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
}

/* Eased transition of camera position and target. */
export interface CameraTransition {
  fromPosition: Vector3
  toPosition: Vector3
  fromTarget: Vector3
  toTarget: Vector3
  elapsed: number
  duration: number
}

export function createTransition(
  fromPosition: Vector3,
  toPosition: Vector3,
  fromTarget: Vector3,
  toTarget: Vector3,
  duration: number = TRANSITION_DURATION
): CameraTransition {
  return {
    fromPosition: fromPosition.clone(),
    toPosition: toPosition.clone(),
    fromTarget: fromTarget.clone(),
    toTarget: toTarget.clone(),
    elapsed: 0,
    duration
  }
}

/* Advance transition by delta seconds and write the resulting camera position and
 * target in the given vectors. Return true when the transition is finished. */
export function stepTransition(
  transition: CameraTransition,
  delta: number,
  position: Vector3,
  target: Vector3
): boolean {
  transition.elapsed += delta
  const progress =
    transition.duration > 0 ? Math.min(transition.elapsed / transition.duration, 1) : 1
  const eased = easeOutCubic(progress)
  position.lerpVectors(transition.fromPosition, transition.toPosition, eased)
  target.lerpVectors(transition.fromTarget, transition.toTarget, eased)
  return progress >= 1
}

/* Turntable camera state */
export class Turntable {
  azimuth = 0
  distance = 0
  // Time since rotation started, to ease in rotation speed.
  private time = 0

  /* Start turntable with the given initial azimuth and distance. */
  start(azimuth: number, distance: number) {
    this.azimuth = azimuth
    this.distance = distance
    this.time = 0
  }

  /* Advance rotation by delta seconds and return new camera position. */
  step(focus: Focus, delta: number): Vector3 {
    this.time += delta
    this.azimuth += TURNTABLE_SPEED * easeInOutCubic(Math.min(this.time, 1)) * delta
    return this.position(focus)
  }

  position(focus: Focus): Vector3 {
    return orbitPosition(focus, this.azimuth, this.distance)
  }
}

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
/* Number of keyboard pan steps per second while a key is held. Each step is 4%
 * of the viewport height, the camera crosses about half of the view each second. */
const KEY_PAN_STEPS_PER_SECOND = 12
const KEY_PAN_STEP_RATIO = 0.04
/* Keyboard rotation speed in radians per second while a key is held. */
export const KEY_ROTATE_SPEED = 0.6

/* Move camera with keyboard arrows while they are held:
 *
 * - ←/→: pan left/right
 * - ↑/↓: move forward/backward on the horizontal plane
 * - Shift + ↑/↓: pan up/down
 * - Ctrl/Cmd + arrows: rotate around target
 *
 * Moves are applied in step() on every frame, proportionally to the elapsed
 * time, so that speed does not depend on frame rate. */
export class KeyboardNavigator {
  private held = new Set<string>()
  private rotate = false
  private shift = false

  get active(): boolean {
    return this.held.size > 0
  }

  /* Handle keydown event, return true if the event is handled by the navigator
   * (and its default action should be prevented). */
  keydown(event: KeyboardEvent): boolean {
    this.syncModifiers(event)
    if (!ARROW_KEYS.has(event.key)) return false
    this.held.add(event.key)
    return true
  }

  keyup(event: KeyboardEvent) {
    this.held.delete(event.key)
    this.syncModifiers(event)
  }

  clear() {
    this.held.clear()
    this.rotate = false
    this.shift = false
  }

  private syncModifiers(event: KeyboardEvent) {
    this.rotate = event.ctrlKey || event.metaKey
    this.shift = event.shiftKey
  }

  /* Direction of held keys on the given axis: +1, -1 or 0. */
  private axis(positive: string, negative: string): number {
    return (this.held.has(positive) ? 1 : 0) - (this.held.has(negative) ? 1 : 0)
  }

  step(delta: number, camera: PerspectiveCamera, controls: CameraControls, viewportHeight: number) {
    if (!this.active || delta <= 0 || !controls.enabled) return
    const height = Math.max(viewportHeight, 1)
    const horizontal = this.axis('ArrowLeft', 'ArrowRight')
    const vertical = this.axis('ArrowUp', 'ArrowDown')

    if (this.rotate) {
      const angle = KEY_ROTATE_SPEED * delta
      if (horizontal) controls.rotateLeft(horizontal * angle)
      if (vertical) controls.rotateUp(vertical * angle)
      return
    }

    const pixels = Math.max(1, height * KEY_PAN_STEP_RATIO) * KEY_PAN_STEPS_PER_SECOND * delta
    if (horizontal && controls.enablePan) controls.pan(horizontal * pixels, 0)
    if (!vertical) return
    if (this.shift) {
      if (controls.enablePan) controls.pan(0, vertical * pixels)
    } else {
      moveForward(camera, controls, vertical * pixels, height)
    }
  }
}

/* Move camera and its target on the horizontal plane, in the direction the camera
 * is looking at, by the distance corresponding to the given number of pixels at
 * the target depth. */
export function moveForward(
  camera: PerspectiveCamera,
  controls: Pick<CameraControls, 'target'>,
  pixels: number,
  viewportHeight: number
) {
  const distance = camera.position.distanceTo(controls.target)
  const halfFov = MathUtils.degToRad(camera.fov / 2)
  const step = (2 * pixels * distance * Math.tan(halfFov)) / Math.max(viewportHeight, 1)
  const direction = new Vector3().subVectors(controls.target, camera.position)
  direction.y = 0
  if (direction.lengthSq() < 1e-8) {
    camera.getWorldDirection(direction)
    direction.y = 0
  }
  if (direction.lengthSq() < 1e-8) return
  direction.normalize().multiplyScalar(step)
  camera.position.add(direction)
  controls.target.add(direction)
}
