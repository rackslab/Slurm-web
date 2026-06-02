/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmOptionalNumber, SlurmTRES } from './basics'

/** SlurmAcctJob fields exposed by GET /jobs/past */
export interface SlurmAcctJobState {
  current: string[]
  reason: string
}

export interface SlurmAcctJobTime {
  end?: number | SlurmOptionalNumber
  start?: number | SlurmOptionalNumber
  elapsed?: number
  submission?: number
}

export interface SlurmAcctJob {
  account: string
  job_id: number
  nodes: string
  partition: string
  priority: SlurmOptionalNumber
  qos: string
  state: SlurmAcctJobState
  time: SlurmAcctJobTime
  tres: { allocated: SlurmTRES[]; requested: SlurmTRES[] }
  user: string
}
