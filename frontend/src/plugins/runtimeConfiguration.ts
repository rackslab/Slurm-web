/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { App, Plugin } from 'vue'
import { inject } from 'vue'

export interface RuntimeConfiguration {
  api_server: string
  authentication: boolean
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

/**
 * Loads runtime configuration from static file (in /public folder).
 */
export const initRuntimeConfiguration = async (): Promise<RuntimeConfiguration> => {
  const resp = await fetch('/config.json')
  const value = await resp.json()

  return {
    api_server: value.API_SERVER,
    authentication: value.AUTHENTICATION
  } as RuntimeConfiguration
}

export const useRuntimeConfiguration = () => inject(injectionKey) as RuntimeConfiguration
