/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmOptionalNumber } from './basics'

export type SlurmNodeMainState =
  | 'down'
  | 'error'
  | 'drain'
  | 'draining'
  | 'fail'
  | 'failing'
  | 'future'
  | 'up'

export type SlurmNodeAllocatedState = 'allocated' | 'mixed' | 'unavailable' | 'planned' | 'idle'

export interface SlurmNode {
  alloc_cpus: number
  alloc_idle_cpus: number
  cores: number
  cpus: number
  gres: string
  gres_used: string
  name: string
  partitions: Array<string>
  real_memory: number
  sockets: number
  state: Array<string>
  reason: string
}

export interface SlurmNodeDetail extends SlurmNode {
  architecture: string
  operating_system: string
  boot_time: SlurmOptionalNumber
  last_busy: SlurmOptionalNumber
  threads: number
  alloc_memory: number
}

export interface SlurmNodeGPU {
  model: string
  count: number
}
