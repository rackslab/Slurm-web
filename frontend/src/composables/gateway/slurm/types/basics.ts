/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

export interface SlurmOptionalNumber {
  infinite: boolean
  number: number
  set: boolean
}

export interface SlurmPreciseTime {
  seconds: number
  microseconds: number
}

export interface SlurmTRES {
  count: number
  id: number
  name: string
  type: string
}
