/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

/* Convert a number of megabytes into a string with simplified unit (eg. GB, TB)
 * when possible. Round value with up to 2 decimals. */
export function getMBHumanUnit(megabytes: number): string {
  if (!megabytes) return '0'
  let value = megabytes
  let divides = 0
  const units = ['MB', 'GB', 'TB']
  while (value > 1024) {
    value /= 1024
    divides += 1
  }
  return `${Math.round(value * 100) / 100}${units[divides]}`
}
