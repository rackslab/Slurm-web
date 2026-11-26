import { describe, test, expect } from 'vitest'
import { Color } from 'three'
import type { LineBasicMaterial, LineLoop, Mesh, MeshStandardMaterial, Object3D } from 'three'
import {
  CORES_BAR_OFFSET,
  CORES_OUTLINE_OFFSET,
  CORES_BODY_COLOR,
  ScenePainter
} from '@/lib/resources3d/paint'
import { indexEquipment } from '@/lib/resources3d/scene'
import { CORES_BAR_BACKGROUND_COLOR, FILTERED_NODE_COLOR } from '@/lib/resources/colors'
import type { SlurmNode } from '@/composables/gateway/slurm/types'
import { buildScene } from './fixtures'

function slurmNode(name: string, state: string[], alloc_cpus = 0, cpus = 32): SlurmNode {
  return { name, state, alloc_cpus, cpus } as unknown as SlurmNode
}

function body(equipment: Object3D): MeshStandardMaterial {
  return (equipment.children.find((child) => child.userData.part === 'body') as Mesh)
    .material as MeshStandardMaterial
}

function edges(equipment: Object3D): LineBasicMaterial {
  return (equipment.children.find((child) => child.userData.part === 'edges') as Mesh)
    .material as LineBasicMaterial
}

function bar(
  equipment: Object3D
): { group: Object3D; fill: Mesh; track: Mesh; outline: LineLoop } | undefined {
  const group = equipment.children.find((child) => child.userData.part === 'cores')
  if (!group) return undefined
  return {
    group,
    fill: group.children[0] as Mesh,
    track: group.children[1] as Mesh,
    outline: group.children[2] as LineLoop
  }
}

function hex(material: MeshStandardMaterial | LineBasicMaterial): string {
  return `#${material.color.getHexString()}`
}

function setup() {
  const fixture = buildScene()
  const painter = new ScenePainter(indexEquipment(fixture.gltf, fixture.root))
  return { fixture, painter, equipment: fixture.equipment }
}

describe('resources3d ScenePainter', () => {
  test('gives own materials to painted nodes only', () => {
    const { fixture, painter, equipment } = setup()
    expect(painter.has('cn1')).toBe(true)
    expect(painter.has('cn3')).toBe(true)
    // Ghost and non-node equipment are not painted
    expect(painter.has('ghost1')).toBe(false)
    expect(painter.has('sw1.example.org')).toBe(false)
    expect(body(equipment['cn1'])).not.toBe(fixture.bodyMaterial)
    expect(body(equipment['cn1'])).not.toBe(body(equipment['cn2']))
    expect(edges(equipment['cn1'])).not.toBe(fixture.edgesMaterial)
    expect(body(equipment['ghost1'])).toBe(fixture.bodyMaterial)
    expect(body(equipment['sw1.example.org'])).toBe(fixture.bodyMaterial)
  })

  test('paints nodes with states colors', () => {
    const { painter, equipment } = setup()
    painter.paint([slurmNode('cn1', ['IDLE']), slurmNode('cn2', ['ALLOCATED', 'DRAIN'])], 'nodes')
    expect(hex(body(equipment['cn1']))).toBe('#70e079')
    // Original edges color is kept without highlighted state
    expect(hex(edges(equipment['cn1']))).toBe('#333333')
    expect(hex(body(equipment['cn2']))).toBe('#e17100')
    expect(hex(edges(equipment['cn2']))).toBe('#b654d6')
    // Node missing in Slurm nodes (ex: filtered) is grayed
    expect(hex(body(equipment['cn3']))).toBe(FILTERED_NODE_COLOR)
    expect(bar(equipment['cn1'])).toBeUndefined()
  })

  test('paints cores allocation bars on wide nodes', () => {
    const { painter, equipment } = setup()
    painter.paint([slurmNode('cn1', ['MIXED'], 8, 32)], 'cores')
    expect(hex(body(equipment['cn1']))).toBe(CORES_BODY_COLOR)
    const cn1 = bar(equipment['cn1'])!
    expect(cn1.group.visible).toBe(true)
    expect(cn1.group.position.z).toBeCloseTo(1.1 / 2 + CORES_BAR_OFFSET)
    // Filled from left to right: 25% of node width
    expect(cn1.fill.visible).toBe(true)
    expect(cn1.fill.scale.x).toBeCloseTo(0.125)
    expect(cn1.fill.scale.y).toBeCloseTo(0.0445)
    expect(cn1.fill.position.x).toBeCloseTo(-0.25 + 0.0625)
    expect(cn1.track.scale.x).toBeCloseTo(0.375)
    expect(cn1.track.position.x).toBeCloseTo(0.25 - 0.1875)
    // Front face outline is drawn in front of the bar with node edges material
    expect(cn1.outline.scale.x).toBeCloseTo(0.5)
    expect(cn1.outline.scale.y).toBeCloseTo(0.0445)
    expect(cn1.outline.position.z).toBe(CORES_OUTLINE_OFFSET)
    expect(cn1.outline.material).toBe(edges(equipment['cn1']))
    expect(hex(cn1.fill.material as MeshStandardMaterial)).toBe('#7ccf00')
    expect(hex(cn1.track.material as MeshStandardMaterial)).toBe(CORES_BAR_BACKGROUND_COLOR)
    // Filtered node has no bar
    expect(hex(body(equipment['cn2']))).toBe(FILTERED_NODE_COLOR)
    expect(bar(equipment['cn2'])).toBeUndefined()
  })

  test('paints cores allocation bars on tall nodes', () => {
    const { painter, equipment } = setup()
    painter.paint([slurmNode('cn3', ['ALLOCATED', 'DOWN'], 32, 32)], 'cores')
    const cn3 = bar(equipment['cn3'])!
    // Filled from bottom to top, fully allocated: no track
    expect(cn3.fill.scale.x).toBeCloseTo(0.25)
    expect(cn3.fill.scale.y).toBeCloseTo(0.178)
    expect(cn3.fill.position.y).toBeCloseTo(0)
    expect(cn3.track.visible).toBe(false)
    expect(hex(cn3.fill.material as MeshStandardMaterial)).toBe('#f54900')
    // Body, edges and outline painted with highlighted state color
    expect(hex(body(equipment['cn3']))).toBe('#c10007')
    expect(hex(edges(equipment['cn3']))).toBe('#c10007')
    expect(hex(cn3.outline.material as LineBasicMaterial)).toBe('#c10007')
  })

  test('keeps hidden empty bar segments within node front face', () => {
    const { painter, equipment } = setup()
    // Fully allocated tall node: empty track. Idle wide node: empty fill.
    painter.paint(
      [slurmNode('cn3', ['ALLOCATED'], 32, 32), slurmNode('cn1', ['IDLE'], 0, 32)],
      'cores'
    )
    const cn3 = bar(equipment['cn3'])!
    expect(cn3.track.visible).toBe(false)
    expect(cn3.track.scale.x).toBeCloseTo(0.25)
    expect(cn3.track.scale.y).toBeCloseTo(0.178)
    expect(cn3.track.position.y).toBe(0)
    const cn1 = bar(equipment['cn1'])!
    expect(cn1.fill.visible).toBe(false)
    expect(cn1.fill.scale.x).toBeCloseTo(0.5)
    expect(cn1.fill.scale.y).toBeCloseTo(0.0445)
    expect(cn1.fill.position.x).toBe(0)
  })

  test('hides cores bars back in nodes mode', () => {
    const { painter, equipment } = setup()
    const nodes = [slurmNode('cn1', ['IDLE'], 0, 32)]
    painter.paint(nodes, 'cores')
    expect(bar(equipment['cn1'])!.fill.visible).toBe(false)
    painter.paint(nodes, 'nodes')
    expect(bar(equipment['cn1'])!.group.visible).toBe(false)
    expect(hex(body(equipment['cn1']))).toBe('#70e079')
  })

  test('highlights hovered node and keeps highlight on repaint', () => {
    const { painter, equipment } = setup()
    const nodes = [slurmNode('cn1', ['IDLE']), slurmNode('cn2', ['IDLE'])]
    painter.paint(nodes, 'nodes')
    painter.highlight('cn1')
    expect(body(equipment['cn1']).emissiveIntensity).toBeGreaterThan(0)
    expect(body(equipment['cn1']).emissive.equals(new Color('#70e079'))).toBe(true)
    painter.paint([slurmNode('cn1', ['ALLOCATED']), nodes[1]], 'nodes')
    expect(body(equipment['cn1']).emissive.equals(new Color('#e17100'))).toBe(true)
    painter.highlight('cn2')
    expect(body(equipment['cn1']).emissiveIntensity).toBe(0)
    expect(body(equipment['cn2']).emissiveIntensity).toBeGreaterThan(0)
    // Unknown equipment cannot be highlighted
    painter.highlight('sw1.example.org')
    expect(body(equipment['cn2']).emissiveIntensity).toBe(0)
    expect(body(equipment['sw1.example.org']).emissive.getHex()).toBe(0)
  })

  test('dispose removes cores bars', () => {
    const { painter, equipment } = setup()
    painter.paint([slurmNode('cn1', ['IDLE'], 4, 8)], 'cores')
    painter.dispose()
    expect(bar(equipment['cn1'])).toBeUndefined()
    expect(painter.has('cn1')).toBe(false)
  })
})
