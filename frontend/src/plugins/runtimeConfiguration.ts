/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { App, Plugin } from 'vue'
import { inject } from 'vue'

export type AuthenticationMethod = 'ldap' | 'oidc'

/** CSS hexadecimal color (#RGB or #RRGGBB). */
export type HexColor = `#${string}`

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

function parseHexColor(value: unknown): HexColor | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (!HEX_COLOR_RE.test(trimmed)) {
    return undefined
  }
  return trimmed as HexColor
}

export interface ColorConfiguration {
  light?: HexColor
  main?: HexColor
  darker?: HexColor
  dark?: HexColor
  verydark?: HexColor
  font_disabled?: HexColor
}

export interface LogoConfiguration {
  login?: string
  login_dark?: string
  horizontal?: string
  horizontal_dark?: string
  alt?: string
}

export interface RuntimeConfiguration {
  api_server: string
  authentication: boolean
  authentication_method: AuthenticationMethod | null
  racksdb_rows_labels: boolean
  racksdb_racks_labels: boolean
  version: string
  colors?: ColorConfiguration
  logo?: LogoConfiguration
}

const injectionKey = Symbol('rc')

export const runtimeConfiguration: Plugin = {
  install: (app: App, configuration: RuntimeConfiguration) => {
    app.provide(injectionKey, configuration)
    /* The runtime configuration is also registered in globalProperties so it
    can be consumed by other plugins during their installation. */
    app.config.globalProperties.$rc = configuration
  }
}

function parseColors(value: Record<string, unknown>): ColorConfiguration | undefined {
  const colors: ColorConfiguration = {}
  const light = parseHexColor(value.COLOR_LIGHT)
  if (light !== undefined) {
    colors.light = light
  }
  const main = parseHexColor(value.COLOR_MAIN)
  if (main !== undefined) {
    colors.main = main
  }
  const darker = parseHexColor(value.COLOR_DARKER)
  if (darker !== undefined) {
    colors.darker = darker
  }
  const dark = parseHexColor(value.COLOR_DARK)
  if (dark !== undefined) {
    colors.dark = dark
  }
  const verydark = parseHexColor(value.COLOR_VERYDARK)
  if (verydark !== undefined) {
    colors.verydark = verydark
  }
  const fontDisabled = parseHexColor(value.COLOR_FONT_DISABLED)
  if (fontDisabled !== undefined) {
    colors.font_disabled = fontDisabled
  }
  return Object.keys(colors).length > 0 ? colors : undefined
}

function parseLogo(value: Record<string, unknown>): LogoConfiguration | undefined {
  const logo: LogoConfiguration = {}
  if (typeof value.LOGO_LOGIN === 'string') {
    logo.login = value.LOGO_LOGIN
  }
  if (typeof value.LOGO_LOGIN_DARK === 'string') {
    logo.login_dark = value.LOGO_LOGIN_DARK
  }
  if (typeof value.LOGO_HORIZONTAL === 'string') {
    logo.horizontal = value.LOGO_HORIZONTAL
  }
  if (typeof value.LOGO_HORIZONTAL_DARK === 'string') {
    logo.horizontal_dark = value.LOGO_HORIZONTAL_DARK
  }
  if (typeof value.LOGO_ALT === 'string') {
    logo.alt = value.LOGO_ALT
  }
  return Object.keys(logo).length > 0 ? logo : undefined
}

/**
 * Loads runtime configuration from static file (in /public folder).
 */
export const initRuntimeConfiguration = async (): Promise<RuntimeConfiguration> => {
  // remove trailing slash from base path
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '')
  const resp = await fetch(`${basePath}/config.json`)
  const value = await resp.json()

  return {
    api_server: value.API_SERVER,
    authentication: value.AUTHENTICATION,
    authentication_method: value.AUTHENTICATION_METHOD ?? null,
    racksdb_rows_labels: value.RACKSDB_ROWS_LABELS,
    racksdb_racks_labels: value.RACKSDB_RACKS_LABELS,
    version: value.VERSION,
    colors: parseColors(value),
    logo: parseLogo(value)
  } as RuntimeConfiguration
}

export const useRuntimeConfiguration = () => inject(injectionKey) as RuntimeConfiguration
