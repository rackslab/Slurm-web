import { describe, test, expect } from 'vitest'
import { Mesh, MeshStandardMaterial, PlaneGeometry, Texture } from 'three'
import {
  computeFocus,
  findEquipment,
  indexEquipment,
  isVisible,
  originalName,
  setTexturesAnisotropy
} from '@/lib/resources3d/scene'
import { buildScene } from './fixtures'

describe('resources3d scene', () => {
  test('index equipment by original names', () => {
    const fixture = buildScene()
    const equipment = indexEquipment(fixture.gltf, fixture.root)
    expect([...equipment.keys()].sort()).toStrictEqual([
      'cn1',
      'cn2',
      'cn3',
      'ghost1',
      'sw1.example.org'
    ])
    expect(equipment.get('sw1.example.org')).toBe(fixture.equipment['sw1.example.org'])
  })

  test('original name fallbacks to object name', () => {
    const fixture = buildScene()
    expect(originalName(fixture.gltf, fixture.equipment['cn1'])).toBe('cn1')
    expect(originalName(fixture.gltf, fixture.equipment['sw1.example.org'])).toBe('sw1.example.org')
  })

  test('object is visible only if all its ancestors are visible', () => {
    const fixture = buildScene()
    const body = fixture.equipment['cn1'].children[0]
    expect(isVisible(body)).toBe(true)
    fixture.equipment['cn1'].visible = false
    expect(isVisible(body)).toBe(false)
    fixture.equipment['cn1'].visible = true
    body.visible = false
    expect(isVisible(body)).toBe(false)
  })

  test('find equipment of geometry', () => {
    const fixture = buildScene()
    const body = fixture.equipment['cn2'].children[0]
    expect(findEquipment(body)).toBe(fixture.equipment['cn2'])
    expect(findEquipment(fixture.equipment['cn2'])).toBe(fixture.equipment['cn2'])
    expect(findEquipment(fixture.root)).toBeNull()
    expect(findEquipment(null)).toBeNull()
  })

  test('focus on infrastructure racks only', () => {
    const fixture = buildScene()
    const focus = computeFocus(fixture.root)
    // Racks R1-A01 and R1-A02 side by side, R1-A03 out of infrastructure is
    // ignored.
    expect(focus.center.x).toBeCloseTo(0.3)
    expect(focus.center.y).toBeCloseTo(1)
    expect(focus.size.x).toBeCloseTo(1.2)
    expect(focus.size.y).toBeCloseTo(2)
    expect(focus.radius).toBeCloseTo(focus.size.length() / 2)
  })

  test('focus faces racks doors', () => {
    const fixture = buildScene()
    expect(computeFocus(fixture.root).azimuth).toBeCloseTo(0)
    // Reversed row: racks are rotated, their doors face -Z
    const row = fixture.root.children[0].children[0]
    row.rotation.y = Math.PI
    expect(Math.abs(computeFocus(fixture.root).azimuth)).toBeCloseTo(Math.PI)
  })

  test('focus on all racks without infrastructure racks', () => {
    const fixture = buildScene()
    fixture.root.traverse((object) => {
      if (object.userData.category === 'rack') object.userData.infrastructure = false
    })
    const focus = computeFocus(fixture.root)
    expect(focus.size.x).toBeCloseTo(10.6)
  })

  test('set anisotropy of all textures', () => {
    const fixture = buildScene()
    const map = new Texture()
    const floor = new Mesh(new PlaneGeometry(), new MeshStandardMaterial({ map }))
    floor.userData = { part: 'floor' }
    fixture.root.children[0].add(floor)
    setTexturesAnisotropy(fixture.root, 16)
    expect(map.anisotropy).toBe(16)
  })
})
