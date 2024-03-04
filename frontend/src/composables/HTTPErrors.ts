/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class PermissionError extends Error {
  constructor(message: string) {
    super(message)
  }
}

export class APIServerError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export class RequestError extends Error {
  constructor(message: string) {
    super(message)
  }
}
