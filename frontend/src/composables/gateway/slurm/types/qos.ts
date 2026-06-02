/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { SlurmOptionalNumber, SlurmTRES } from './basics'

export interface SlurmQos {
  description: string
  flags: string[]
  limits: {
    factor: SlurmOptionalNumber
    grace_time: number
    max: {
      accruing: {
        per: {
          account: SlurmOptionalNumber
          user: SlurmOptionalNumber
        }
      }
      active_jobs: {
        accruing: SlurmOptionalNumber
        count: SlurmOptionalNumber
      }
      jobs: {
        active_jobs: {
          per: {
            account: SlurmOptionalNumber
            user: SlurmOptionalNumber
          }
        }
        count: SlurmOptionalNumber
        per: {
          account: SlurmOptionalNumber
          user: SlurmOptionalNumber
        }
      }
      tres: {
        minutes: {
          per: {
            account: SlurmTRES[]
            job: SlurmTRES[]
            qos: SlurmTRES[]
            user: SlurmTRES[]
          }
          total: SlurmTRES[]
        }
        per: {
          account: SlurmTRES[]
          job: SlurmTRES[]
          node: SlurmTRES[]
          user: SlurmTRES[]
        }
        total: SlurmTRES[]
      }
      wall_clock: {
        per: {
          job: SlurmOptionalNumber
          qos: SlurmOptionalNumber
        }
      }
    }
    min: {
      priority_threshold: SlurmOptionalNumber
      tres: {
        per: {
          job: SlurmTRES[]
        }
      }
    }
  }
  name: string
  priority: SlurmOptionalNumber
}
