import { describe, test, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KeyboardArrowKeys from '@/components/input/KeyboardArrowKeys.vue'

describe('KeyboardArrowKeys.vue', () => {
  test('lays out all arrow keys like keyboards', () => {
    const wrapper = mount(KeyboardArrowKeys)
    const grid = wrapper.get('[data-directions="all"]')
    expect(grid.classes()).toContain('grid-cols-3')
    const key = (name: string) => wrapper.get(`kbd[data-key="${name}"]`)
    // Up key alone on top row, above down key
    expect(key('up').classes()).toEqual(expect.arrayContaining(['col-start-2', 'row-start-1']))
    // Left, down and right keys on bottom row
    expect(key('left').classes()).toEqual(expect.arrayContaining(['col-start-1', 'row-start-2']))
    expect(key('down').classes()).toEqual(expect.arrayContaining(['col-start-2', 'row-start-2']))
    expect(key('right').classes()).toEqual(expect.arrayContaining(['col-start-3', 'row-start-2']))
    expect(wrapper.findAll('kbd').map((k) => k.text())).toStrictEqual([
      'Up',
      'Left',
      'Down',
      'Right'
    ])
  })

  test('lays out vertical arrow keys in a column', () => {
    const wrapper = mount(KeyboardArrowKeys, { props: { directions: 'vertical' } })
    expect(wrapper.get('[data-directions="vertical"]').classes()).toContain('grid-cols-1')
    expect(wrapper.findAll('kbd').map((k) => k.attributes('data-key'))).toStrictEqual([
      'up',
      'down'
    ])
    expect(wrapper.get('kbd[data-key="up"]').classes()).toContain('row-start-1')
    expect(wrapper.get('kbd[data-key="down"]').classes()).toContain('row-start-2')
  })
})
