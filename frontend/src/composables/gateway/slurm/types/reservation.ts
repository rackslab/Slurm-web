/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmOptionalNumber } from './basics'

export interface SlurmReservation {
  accounts: string
  end_time: SlurmOptionalNumber
  flags: string[]
  name: string
  node_count: number
  node_list: string
  start_time: SlurmOptionalNumber
  users: string
}
