import { describe, expect, test } from 'vitest'
import { getBytesHumanUnit, getMBHumanUnit } from '@/composables/gateway/slurm/sizes'

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

describe('getBytesHumanUnit', () => {
  test('zero', () => {
    expect(getBytesHumanUnit(0)).toStrictEqual('0')
  })
  test('B', () => {
    expect(getBytesHumanUnit(512)).toStrictEqual('512B')
  })
  test('KB', () => {
    expect(getBytesHumanUnit(1024)).toStrictEqual('1KB')
    expect(getBytesHumanUnit(1536)).toStrictEqual('1.5KB')
  })
  test('MB rounded', () => {
    expect(getBytesHumanUnit(542142464)).toStrictEqual('517.03MB')
  })
  test('GB', () => {
    expect(getBytesHumanUnit(4 * 1024 ** 3)).toStrictEqual('4GB')
    expect(getBytesHumanUnit(1.5 * 1024 ** 3)).toStrictEqual('1.5GB')
  })
  test('TB and PB', () => {
    expect(getBytesHumanUnit(2 * 1024 ** 4)).toStrictEqual('2TB')
    expect(getBytesHumanUnit(3 * 1024 ** 5)).toStrictEqual('3PB')
  })
  test('beyond PB', () => {
    expect(getBytesHumanUnit(2048 * 1024 ** 5)).toStrictEqual('2048PB')
  })
})
