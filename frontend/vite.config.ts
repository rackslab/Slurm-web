/*
 * Copyright (c) 2023-2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import tailwindcss from "@tailwindcss/vite";
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  /*
   * The base path is used as a prefix to serve the frontend application and
   * the runtime configuration. By default, it is set to /__SLURMWEB_BASE__
   * (placeholder replaced at runtime by the gateway) in production and / in
   * development.
   */
  const basePath = process.env.VITE_BASE_PATH || (mode === 'production' ? '/__SLURMWEB_BASE__' : '/')
  return {
    base: basePath,
    plugins: [
      vue(),
      tailwindcss(),
    ],
    define: {
      // disable hydration mismatch details in production build
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false'
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      target: 'esnext',  // required for top-level await used by runtimeConfiguration plugin
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['chart.js', 'luxon'],
          }
        }
      }
    }
  }
})
