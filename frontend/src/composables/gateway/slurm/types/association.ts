/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmOptionalNumber, SlurmTRES } from './basics'

export interface SlurmAssociation {
  account: string
  max: {
    jobs: {
      accruing: SlurmOptionalNumber
      active: SlurmOptionalNumber
      per: {
        accruing: SlurmOptionalNumber
        count: SlurmOptionalNumber
        submitted: SlurmOptionalNumber
        wall_clock: SlurmOptionalNumber
      }
      total: SlurmOptionalNumber
    }
    per: {
      account: {
        wall_clock: SlurmOptionalNumber
      }
    }
    tres: {
      group: {
        active: SlurmTRES[]
        minutes: SlurmTRES[]
      }
      minutes: {
        per: {
          job: SlurmTRES[]
        }
        total: SlurmTRES[]
      }
      per: {
        job: SlurmTRES[]
        node: SlurmTRES[]
      }
      total: SlurmTRES[]
    }
  }
  parent_account: string
  qos: string[]
  user: string
}

export interface SlurmAccountTreeNode {
  children: SlurmAccountTreeNode[]
  level: number
  account: string
  max: SlurmAssociation['max']
  parent_account: string
  qos: string[]
  users: string[]
}
