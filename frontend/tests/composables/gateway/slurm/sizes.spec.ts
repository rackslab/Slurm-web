import { describe, expect, test } from 'vitest'
import { getMBHumanUnit } from '@/composables/gateway/slurm/sizes'

describe('getMBHumanUnit', () => {
  test('MB', () => {
    expect(getMBHumanUnit(128)).toStrictEqual('128MB')
  })
  test('MB rounded', () => {
    expect(getMBHumanUnit(128.5)).toStrictEqual('128.5MB')
    expect(getMBHumanUnit(128.32)).toStrictEqual('128.32MB')
    expect(getMBHumanUnit(128.128)).toStrictEqual('128.13MB')
  })
  test('GB', () => {
    expect(getMBHumanUnit(64 * 1024)).toStrictEqual('64GB')
  })
  test('GB rounded', () => {
    expect(getMBHumanUnit(64.4 * 1024)).toStrictEqual('64.4GB')
    expect(getMBHumanUnit(64.46 * 1024)).toStrictEqual('64.46GB')
    expect(getMBHumanUnit(64.462 * 1024)).toStrictEqual('64.46GB')
  })
  test('TB', () => {
    expect(getMBHumanUnit(4 * 1024 ** 2)).toStrictEqual('4TB')
  })
  test('TB rounded', () => {
    expect(getMBHumanUnit(4.3004 * 1024 ** 2)).toStrictEqual('4.3TB')
    expect(getMBHumanUnit(4.01 * 1024 ** 2)).toStrictEqual('4.01TB')
    expect(getMBHumanUnit(4.016 * 1024 ** 2)).toStrictEqual('4.02TB')
  })
})
