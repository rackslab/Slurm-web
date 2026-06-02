/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

export interface UserDescription {
  login: string
  fullname: string
}

export interface AccountDescription {
  name: string
}

export interface LoginIdents {
  user: string
  password: string
}

export interface GatewayLoginResponse extends UserDescription {
  token: string
  groups: string[]
}

export interface GatewayAnonymousLoginResponse {
  token: string
}
