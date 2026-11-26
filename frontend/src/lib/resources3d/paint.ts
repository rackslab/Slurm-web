/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

/*
 * Paint compute nodes of the 3D scene with the colors of their Slurm states, as
 * in 2D resources diagrams.
 */

import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry
} from 'three'
import type { LineSegments, Object3D } from 'three'
import type { SlurmNode } from '@/composables/gateway/slurm/types'
import type { ResourcesRepresentation } from '@/stores/runtime/resources'
import {
  CORES_BAR_BACKGROUND_COLOR,
  FILTERED_NODE_COLOR,
  getNodeCoresUsage,
  getNodeFillColor,
  getNodeStrokeColor,
  progressBarColor
} from '@/lib/resources/colors'

/* Color of nodes body in cores mode, when their state is not highlighted */
export const CORES_BODY_COLOR = '#9ca3af' // gray-400
/* Offset of cores allocation bars in front of nodes front face in meters, to
 * avoid z-fighting. */
export const CORES_BAR_OFFSET = 0.001
/* Offset of nodes front face outline in front of cores allocation bars in
 * meters. */
export const CORES_OUTLINE_OFFSET = 0.0005
const HIGHLIGHT_INTENSITY = 0.35

/* Part of a painted node: its material and its original color. */
interface PaintedPart<M extends MeshStandardMaterial | LineBasicMaterial> {
  material: M
  original: string
}

interface PaintedNode {
  object: Object3D
  body: PaintedPart<MeshStandardMaterial> | null
  edges: PaintedPart<LineBasicMaterial> | null
  bar: { group: Group; fill: Mesh; track: Mesh; outline: LineLoop } | null
}

/* Return geometry of the outline of a unit square centered on origin in XY plane. */
function squareOutlineGeometry(): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)
  )
  return geometry
}

function findPart(equipment: Object3D, part: string): Object3D | undefined {
  return equipment.children.find((child) => child.userData?.part === part)
}

/* Return true if equipment of the scene is a compute node that can be painted:
 * equipment of category node, not ghosted. */
export function isPaintable(equipment: Object3D): boolean {
  return equipment.userData?.category === 'node' && equipment.userData?.selected !== false
}

export class ScenePainter {
  private nodes = new Map<string, PaintedNode>()
  private barGeometry = new PlaneGeometry(1, 1)
  private outlineGeometry = squareOutlineGeometry()
  // Material of bars outlines of nodes without edges
  private outlineMaterial = new LineBasicMaterial({ color: '#000000' })
  private highlighted: string | null = null

  /* Equipment is the map of equipment of the scene indexed by their names. */
  constructor(equipment: Map<string, Object3D>) {
    for (const [name, object] of equipment) {
      if (!isPaintable(object)) continue
      this.nodes.set(name, {
        object,
        body: this.ownMaterial<MeshStandardMaterial>(findPart(object, 'body') as Mesh),
        edges: this.ownMaterial<LineBasicMaterial>(findPart(object, 'edges') as LineSegments),
        bar: null
      })
    }
  }

  /* Materials are shared between equipment in RacksDB scenes, give a copy to the
   * given part so it can be painted independently. */
  private ownMaterial<M extends MeshStandardMaterial | LineBasicMaterial>(
    part: Mesh | LineSegments | undefined
  ): PaintedPart<M> | null {
    if (!part || !part.material || Array.isArray(part.material)) return null
    const material = (part.material as M).clone() as M
    part.material = material
    return { material, original: `#${material.color.getHexString()}` }
  }

  /* Return true if the equipment with the given name is a node painted with
   * Slurm states. */
  has(name: string): boolean {
    return this.nodes.has(name)
  }

  /* Paint the nodes of the scene with the given Slurm nodes and representation.
   * Painted nodes of the scene missing in the given Slurm nodes (ex: not selected
   * by filters) are grayed. */
  paint(slurmNodes: SlurmNode[], mode: ResourcesRepresentation) {
    const slurmNodesByName = new Map(slurmNodes.map((node) => [node.name, node]))
    for (const [name, painted] of this.nodes) {
      const node = slurmNodesByName.get(name)
      if (mode === 'cores') {
        this.paintCores(painted, node)
      } else {
        this.paintNodes(painted, node)
      }
    }
    if (this.highlighted) this.setHighlight(this.highlighted, true)
  }

  private paintNodes(painted: PaintedNode, node: SlurmNode | undefined) {
    this.hideBar(painted)
    if (!node) {
      this.setColors(painted, FILTERED_NODE_COLOR, painted.edges?.original)
      return
    }
    this.setColors(
      painted,
      getNodeFillColor(node.state),
      getNodeStrokeColor(node.state) ?? painted.edges?.original
    )
  }

  private paintCores(painted: PaintedNode, node: SlurmNode | undefined) {
    if (!node) {
      this.hideBar(painted)
      this.setColors(painted, FILTERED_NODE_COLOR, painted.edges?.original)
      return
    }
    // Nodes in highlighted states have their body painted with the state color,
    // visible on the sides of the node, around the allocation bar.
    const stroke = getNodeStrokeColor(node.state)
    this.setColors(painted, stroke ?? CORES_BODY_COLOR, stroke ?? painted.edges?.original)
    this.showBar(painted, getNodeCoresUsage(node).percentage)
  }

  private setColors(painted: PaintedNode, body: string, edges: string | undefined) {
    painted.body?.material.color.set(body)
    if (edges) painted.edges?.material.color.set(edges)
  }

  /* Show cores allocation progress bar on the front face of the node, filled from
   * left to right on wide nodes and from bottom to top on tall nodes, like in 2D
   * diagrams. The bar is made of a fill and a track planes side by side, covering
   * the front face. The bar hides the edges of the node front face, they are
   * drawn again in front of the bar to delimit nodes like in nodes mode. */
  private showBar(painted: PaintedNode, percentage: number) {
    const bar = painted.bar ?? this.createBar(painted)
    bar.group.visible = true
    const [width, height] = painted.object.userData.size as number[]
    bar.outline.scale.set(width, height, 1)
    const ratio = Math.min(Math.max(percentage / 100, 0), 1)
    const horizontal = width > height
    const length = horizontal ? width : height
    const fillLength = length * ratio
    const trackLength = length - fillLength
    const segments: [Mesh, number, number][] = [
      [bar.fill, fillLength, -length / 2 + fillLength / 2],
      [bar.track, trackLength, length / 2 - trackLength / 2]
    ]
    for (const [mesh, size, center] of segments) {
      mesh.visible = size > 0
      if (!mesh.visible) {
        // Empty segment is hidden. Keep it within the node front face with a
        // non-degenerate scale, as hidden objects can still be raycasted.
        mesh.scale.set(width, height, 1)
        mesh.position.set(0, 0, 0)
      } else if (horizontal) {
        mesh.scale.set(size, height, 1)
        mesh.position.set(center, 0, 0)
      } else {
        mesh.scale.set(width, size, 1)
        mesh.position.set(0, center, 0)
      }
    }
    ;(bar.fill.material as MeshStandardMaterial).color.set(progressBarColor(percentage))
  }

  private createBar(painted: PaintedNode): NonNullable<PaintedNode['bar']> {
    const [, , depth] = painted.object.userData.size as number[]
    const group = new Group()
    group.userData = { part: 'cores' }
    // Equipment front face is at +Z, in front of racks doors.
    group.position.z = depth / 2 + CORES_BAR_OFFSET
    const fill = new Mesh(this.barGeometry, new MeshStandardMaterial({ roughness: 1 }))
    const track = new Mesh(
      this.barGeometry,
      new MeshStandardMaterial({ color: CORES_BAR_BACKGROUND_COLOR, roughness: 1 })
    )
    // Outline shares the material of node edges, to get the same color.
    const outline = new LineLoop(
      this.outlineGeometry,
      painted.edges?.material ?? this.outlineMaterial
    )
    outline.position.z = CORES_OUTLINE_OFFSET
    group.add(fill, track, outline)
    painted.object.add(group)
    painted.bar = { group, fill, track, outline }
    return painted.bar
  }

  private hideBar(painted: PaintedNode) {
    if (painted.bar) painted.bar.group.visible = false
  }

  private materials(painted: PaintedNode): MeshStandardMaterial[] {
    const result: MeshStandardMaterial[] = []
    if (painted.body) result.push(painted.body.material)
    if (painted.bar) {
      result.push(painted.bar.fill.material as MeshStandardMaterial)
      result.push(painted.bar.track.material as MeshStandardMaterial)
    }
    return result
  }

  private setHighlight(name: string, enabled: boolean) {
    const painted = this.nodes.get(name)
    if (!painted) return
    for (const material of this.materials(painted)) {
      material.emissive.copy(material.color)
      material.emissiveIntensity = enabled ? HIGHLIGHT_INTENSITY : 0
    }
  }

  /* Highlight the node with the given name, or remove highlight if null. */
  highlight(name: string | null) {
    if (name === this.highlighted) return
    if (this.highlighted) this.setHighlight(this.highlighted, false)
    this.highlighted = name && this.nodes.has(name) ? name : null
    if (this.highlighted) this.setHighlight(this.highlighted, true)
  }

  dispose() {
    for (const painted of this.nodes.values()) {
      painted.body?.material.dispose()
      painted.edges?.material.dispose()
      if (painted.bar) {
        ;(painted.bar.fill.material as MeshStandardMaterial).dispose()
        ;(painted.bar.track.material as MeshStandardMaterial).dispose()
        painted.bar.group.removeFromParent()
      }
    }
    this.barGeometry.dispose()
    this.outlineGeometry.dispose()
    this.outlineMaterial.dispose()
    this.nodes.clear()
  }
}
