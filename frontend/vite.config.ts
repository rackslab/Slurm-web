/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
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
    target: 'esnext'  // required for top-level await used by runtimeConfiguration plugin
  }
})
