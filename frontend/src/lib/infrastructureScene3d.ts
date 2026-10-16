/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { Mesh, Object3D, PerspectiveCamera } from 'three'
import { Box3, Vector3 } from 'three'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type RackFocus = {
  center: Vector3
  size: Vector3
  radius: number
}

const MIN_ORBIT_DISTANCE = 0.4
const MIN_POLAR_ANGLE = 0.12
const MAX_POLAR_ANGLE = Math.PI / 2 - 0.08
export const TURNTABLE_SPEED = 0.25

export const CAMERA_MODE_TRANSITION_DURATION_S = 0.9

export type CameraTransition = {
  fromPosition: Vector3
  toPosition: Vector3
  fromTarget: Vector3
  toTarget: Vector3
  elapsed: number
  duration: number
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export function turntableCameraPosition(
  focus: RackFocus,
  angle: number,
  radius: number,
  height: number
): Vector3 {
  return new Vector3(
    focus.center.x + Math.sin(angle) * radius,
    height,
    focus.center.z + Math.cos(angle) * radius
  )
}

export function computeRackFocusBox(root: Object3D): RackFocus {
  const rackFocusBox = new Box3()
  let hasRack = false

  root.updateMatrixWorld(true)
  root.traverse((child) => {
    if (child.userData?.category !== 'rack') {
      return
    }
    for (const rackChild of child.children) {
      const mesh = rackChild as Mesh
      if (!mesh.isMesh) {
        continue
      }
      const box = new Box3().setFromObject(mesh)
      if (!box.isEmpty()) {
        rackFocusBox.union(box)
        hasRack = true
      }
    }
  })

  if (!hasRack) {
    rackFocusBox.setFromObject(root)
  }

  const center = new Vector3()
  const size = new Vector3()
  rackFocusBox.getCenter(center)
  rackFocusBox.getSize(size)
  const radius = Math.max(size.x, size.y, size.z) / 2

  return {
    center,
    size,
    radius: Math.max(radius, 0.5)
  }
}

export function applyFreeCameraDefaults(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  focus: RackFocus
): { minDistance: number; maxDistance: number } {
  const minDistance = MIN_ORBIT_DISTANCE
  const maxDistance = Math.max(focus.radius * 6, 5)

  controls.target.copy(focus.center)
  controls.minDistance = minDistance
  controls.maxDistance = maxDistance
  controls.minPolarAngle = MIN_POLAR_ANGLE
  controls.maxPolarAngle = MAX_POLAR_ANGLE
  controls.enablePan = true
  controls.screenSpacePanning = true

  camera.position.set(
    focus.center.x,
    focus.center.y + focus.size.y * 0.35 + 0.3,
    focus.center.z + focus.radius + 1.2
  )
  camera.lookAt(focus.center)
  controls.update()

  return { minDistance, maxDistance }
}

export function defaultTurntableRadius(focus: RackFocus, maxDistance: number): number {
  return Math.min(Math.max(focus.radius * 2.5, MIN_ORBIT_DISTANCE + 0.5), maxDistance)
}

export function defaultTurntableHeight(focus: RackFocus): number {
  return focus.center.y + focus.size.y * 0.35
}

export function updateTurntableCamera(
  camera: PerspectiveCamera,
  focus: RackFocus,
  angle: number,
  radius: number,
  height: number
): void {
  camera.position.copy(turntableCameraPosition(focus, angle, radius, height))
  camera.lookAt(focus.center)
}

export function createTurntableEntryTransition(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  focus: RackFocus,
  turntableAngle: number,
  turntableRadius: number,
  turntableHeight: number,
  duration = CAMERA_MODE_TRANSITION_DURATION_S
): CameraTransition {
  return {
    fromPosition: camera.position.clone(),
    toPosition: turntableCameraPosition(focus, turntableAngle, turntableRadius, turntableHeight),
    fromTarget: controls.target.clone(),
    toTarget: focus.center.clone(),
    elapsed: 0,
    duration
  }
}

export function stepCameraTransition(
  camera: PerspectiveCamera,
  transition: CameraTransition,
  delta: number
): boolean {
  transition.elapsed += delta
  const linear = Math.min(1, transition.elapsed / transition.duration)
  const eased = easeOutCubic(linear)
  const lookTarget = new Vector3().lerpVectors(transition.fromTarget, transition.toTarget, eased)
  camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased)
  camera.lookAt(lookTarget)
  return linear >= 1
}

export function clampTurntableRadius(
  radius: number,
  minDistance: number,
  maxDistance: number
): number {
  return Math.min(Math.max(radius, minDistance), maxDistance)
}
