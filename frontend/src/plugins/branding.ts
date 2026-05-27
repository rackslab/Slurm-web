/*
 * Copyright (c) 2026 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import type { App, Plugin } from 'vue'
import type {
  ColorConfiguration,
  RuntimeConfiguration
} from '@/plugins/runtimeConfiguration'

const COLOR_CSS_VARIABLES: Record<keyof ColorConfiguration, string> = {
  light: '--color-slurmweb-light',
  main: '--color-slurmweb',
  darker: '--color-slurmweb-darker',
  dark: '--color-slurmweb-dark',
  verydark: '--color-slurmweb-verydark',
  font_disabled: '--color-slurmweb-font-disabled'
}

export const brandingPlugin: Plugin = {
  install(app: App) {
    const colors = (app.config.globalProperties.$rc as RuntimeConfiguration | undefined)
      ?.colors
    if (!colors) {
      return
    }
    const root = document.documentElement
    for (const [key, cssVariable] of Object.entries(COLOR_CSS_VARIABLES)) {
      const value = colors[key as keyof ColorConfiguration]
      if (value !== undefined) {
        root.style.setProperty(cssVariable, value)
      }
    }
  }
}
