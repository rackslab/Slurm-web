/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmTRES } from '@/composables/gateway/slurm/types'

export function extractSlurmTRESResources(tres: SlurmTRES[]): {
  node: number
  cpu: number
  memory: number
} {
  const node_tres = tres.find((_tres) => _tres.type == 'node')
  let node
  if (node_tres) node = node_tres.count
  else node = -1
  const cpu_tres = tres.find((_tres) => _tres.type == 'cpu')
  let cpu
  if (cpu_tres) cpu = cpu_tres.count
  else cpu = -1
  const memory_tres = tres.find((_tres) => _tres.type == 'mem')
  let memory
  if (memory_tres) memory = memory_tres.count
  else memory = -1
  return { node: node, cpu: cpu, memory: memory }
}

function sortSlurmTRES(a: SlurmTRES, b: SlurmTRES): number {
  const allTRES = ['node', 'cpu', 'mem']
  return allTRES.indexOf(a.type) - allTRES.indexOf(b.type)
}

export function renderSlurmTRES(tres: SlurmTRES[]): string {
  if (tres.length == 0) {
    return '-'
  }
  return tres
    .sort((a, b) => sortSlurmTRES(a, b))
    .map((_tres) => _tres.type + '=' + _tres.count)
    .join()
}

export function renderSlurmTRESHuman(tres: SlurmTRES[]): string {
  if (tres.length == 0) {
    return '-'
  }

  function renderComponent(type: string, count: number): string {
    switch (type) {
      case 'node':
        return `${count} ${type}${count > 1 ? 's' : ''}`
      case 'cpu':
        return `${count} CPU${count > 1 ? 's' : ''}`
      case 'mem':
        return `${count} MB of memory`
      default:
        return `${count} ${type}${count > 1 ? 's' : ''}`
    }
  }

  return tres
    .sort((a, b) => sortSlurmTRES(a, b))
    .map((_tres) => renderComponent(_tres.type, _tres.count))
    .join(', ')
    .replace(/, ([^,]*)$/, ' and $1')
}
