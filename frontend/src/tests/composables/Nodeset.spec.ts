import { describe, expect, test } from 'vitest'
import { foldNodeset, expandNodeset } from '@/composables/Nodeset'

describe('Nodeset', () => {
  test('fold consecutive', () => {
    const folded = foldNodeset(['cn001', 'cn002'])
    expect(folded).toBe('cn[001-002]')
  })
  test('fold not consecutive', () => {
    const folded = foldNodeset(['cn001', 'cn002', 'cn004'])
    expect(folded).toBe('cn[001-002],cn004')
  })
  test('fold with suffix', () => {
    const folded = foldNodeset(['n1-cn', 'n2-cn'])
    expect(folded).toBe('n[1-2]-cn')
  })
  test('fold with multiple digits', () => {
    const folded = foldNodeset(['cn-0-01', 'cn-0-02', 'cn-1-03'])
    expect(folded).toBe('cn-0-[01-02],cn-1-03')
  })
  test('fold without digits', () => {
    const folded = foldNodeset(['compute', 'cn1', 'cn2', 'cn3', 'cn4', 'test'])
    expect(folded).toBe('cn[1-4],compute,test')
  })
  test('expand', () => {
    const expanded = expandNodeset('cn[1-2]')
    expect(expanded).toStrictEqual(['cn1', 'cn2'])
  })
  test('expand', () => {
    const expanded = expandNodeset('cn[1-2]')
    expect(expanded).toStrictEqual(['cn1', 'cn2'])
  })
  test('expand with padding', () => {
    const expanded = expandNodeset('cn[001-003]')
    expect(expanded).toStrictEqual(['cn001', 'cn002', 'cn003'])
  })
  test('expand not consecutive', () => {
    const expanded = expandNodeset('cn[001-002],cn010')
    expect(expanded).toStrictEqual(['cn001', 'cn002', 'cn010'])
  })
  test('expand with multiple digits', () => {
    const expanded = expandNodeset('cn-0-[02-04],cn-1-05')
    expect(expanded).toStrictEqual(['cn-0-02', 'cn-0-03', 'cn-0-04', 'cn-1-05'])
  })
  test('expand without digit', () => {
    const expanded = expandNodeset('compute,cn[1-4],test')
    expect(expanded).toStrictEqual(['compute', 'cn1', 'cn2', 'cn3', 'cn4', 'test'])
  })
})
