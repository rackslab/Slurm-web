/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

export interface CacheStatistics {
  hit: {
    keys: Record<string, number>
    total: number
  }
  miss: {
    keys: Record<string, number>
    total: number
  }
}
