/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* eslint-env node */
/** @type {import('tailwindcss').Config} */

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slurmweb: {
          light: '#ccdbe6',
          DEFAULT: '#759ab8',
          darker: '#6185a3',
          dark: '#486a86',
          verydark: '#3b5163',
          'font-disabled': '#dbe9f4',
        },
      },
      animation: {
        'horizontal-shake': 'horizontal-shaking 0.35s infinite',
      },
      keyframes: {
        'horizontal-shaking': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%, 75%': { transform: 'translateX(5px)' },
          '50%': { transform: 'translateX(-5px)' },
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
