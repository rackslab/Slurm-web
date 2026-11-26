import {
  BoxGeometry,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial
} from 'three'
import type { Object3D } from 'three'
import type { GLTFNames } from '@/lib/resources3d/scene'

/*
 * Build a small scene mimicking 3D representations of infrastructures generated
 * by RacksDB: room → row → racks → equipment, with geometry in unnamed child
 * nodes with a part in their extras, and materials shared between equipment.
 */

export interface SceneFixture {
  root: Group
  gltf: GLTFNames
  equipment: Record<string, Object3D>
  bodyMaterial: MeshStandardMaterial
  edgesMaterial: LineBasicMaterial
}

const RACK_SIZE = [0.6, 2, 1.2]

function addEquipment(
  fixture: SceneFixture,
  rack: Object3D,
  name: string,
  category: string,
  options: { selected?: boolean; size?: number[]; y?: number; sanitized?: string } = {}
) {
  const size = options.size ?? [0.5, 0.0445, 1.1]
  const equipment = new Group()
  equipment.name = options.sanitized ?? name
  equipment.userData = {
    category,
    type: 'type',
    tags: [],
    rack: rack.name,
    selected: options.selected ?? true,
    colliding: false,
    size
  }
  equipment.position.set(0, options.y ?? 0, 0)
  const body = new Mesh(new BoxGeometry(1, 1, 1), fixture.bodyMaterial)
  body.userData = { part: 'body' }
  body.scale.set(size[0], size[1], size[2])
  const edges = new LineSegments(new BufferGeometry(), fixture.edgesMaterial)
  edges.userData = { part: 'edges' }
  edges.scale.set(size[0], size[1], size[2])
  equipment.add(body, edges)
  rack.add(equipment)
  fixture.equipment[name] = equipment
  if (options.sanitized) {
    // Simulate three.js sanitizing glTF nodes names.
    const nodes = fixture.gltf.parser.json.nodes as { name: string }[]
    nodes.push({ name })
    fixture.gltf.parser.associations.set(equipment, { nodes: nodes.length - 1 })
  }
  return equipment
}

function addRack(fixture: SceneFixture, row: Object3D, name: string, x: number, infra: boolean) {
  const rack = new Group()
  rack.name = name
  rack.userData = { category: 'rack', infrastructure: infra, size: RACK_SIZE }
  rack.position.set(x, 1, 0)
  const panel = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
  panel.userData = { part: 'left' }
  panel.scale.set(RACK_SIZE[0], RACK_SIZE[1], RACK_SIZE[2])
  rack.add(panel)
  row.add(rack)
  return rack
}

export function buildScene(): SceneFixture {
  const root = new Group()
  const fixture: SceneFixture = {
    root,
    gltf: { parser: { associations: new Map(), json: { asset: { version: '2.0' }, nodes: [] } } },
    equipment: {},
    bodyMaterial: new MeshStandardMaterial({ color: '#ffffff' }),
    edgesMaterial: new LineBasicMaterial({ color: '#333333' })
  }
  const room = new Group()
  room.name = 'room'
  room.userData = { category: 'room' }
  const row = new Group()
  row.name = 'R1'
  row.userData = { category: 'row' }
  room.add(row)
  root.add(room)
  const rack1 = addRack(fixture, row, 'R1-A01', 0, true)
  const rack2 = addRack(fixture, row, 'R1-A02', 0.6, true)
  // Rack outside of infrastructure, represented with other_racks parameter
  addRack(fixture, row, 'R1-A03', 10, false)
  addEquipment(fixture, rack1, 'cn1', 'node', { y: -0.5 })
  addEquipment(fixture, rack1, 'cn2', 'node', { y: -0.4 })
  // Tall node
  addEquipment(fixture, rack2, 'cn3', 'node', { size: [0.25, 0.178, 1.1], y: -0.5 })
  // Ghost node of another infrastructure
  addEquipment(fixture, rack2, 'ghost1', 'node', { selected: false, y: 0.2 })
  addEquipment(fixture, rack2, 'sw1.example.org', 'network', {
    y: 0.5,
    sanitized: 'sw1exampleorg'
  })
  return fixture
}
