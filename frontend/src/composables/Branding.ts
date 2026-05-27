/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { computed } from 'vue'
import {
  useRuntimeConfiguration,
  type HexColor
} from '@/plugins/runtimeConfiguration'

const DEFAULT_LOGOS = {
  login: '/logo/slurm-web_logo.png',
  login_dark: '/logo/slurm-web_logo_dark.png',
  horizontal: '/logo/slurm-web_horizontal.png',
  horizontal_dark: '/logo/slurm-web_horizontal_dark.png'
} as const

const DEFAULT_LOGO_ALT = 'Slurm-web'

/** Must match `--color-slurmweb` in `style.css`. */
const DEFAULT_BRAND_MAIN_RGB = { r: 117, g: 154, b: 184 }

function resolveAssetPath(path: string): string {
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '')
  if (path.startsWith('/')) {
    return `${basePath}${path}`
  }
  return path
}

function parseHexColorToRgb(color: HexColor): { r: number; g: number; b: number } {
  let hex = color.slice(1)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  }
}

export function useBranding() {
  const runtimeConfiguration = useRuntimeConfiguration()

  const logoAlt = computed(
    () => runtimeConfiguration.logo?.alt ?? DEFAULT_LOGO_ALT
  )

  const logoLogin = computed(() =>
    resolveAssetPath(runtimeConfiguration.logo?.login ?? DEFAULT_LOGOS.login)
  )
  const logoLoginDark = computed(() =>
    resolveAssetPath(runtimeConfiguration.logo?.login_dark ?? DEFAULT_LOGOS.login_dark)
  )
  const logoHorizontal = computed(() =>
    resolveAssetPath(runtimeConfiguration.logo?.horizontal ?? DEFAULT_LOGOS.horizontal)
  )
  const logoHorizontalDark = computed(() =>
    resolveAssetPath(
      runtimeConfiguration.logo?.horizontal_dark ?? DEFAULT_LOGOS.horizontal_dark
    )
  )

  const brandMainRgb = computed(() => {
    const color = runtimeConfiguration.colors?.main
    if (color === undefined) {
      return DEFAULT_BRAND_MAIN_RGB
    }
    return parseHexColorToRgb(color)
  })

  return {
    logoAlt,
    logoLogin,
    logoLoginDark,
    logoHorizontal,
    logoHorizontalDark,
    brandMainRgb
  }
}
