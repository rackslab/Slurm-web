/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initRuntimeConfiguration, runtimeConfiguration } from '@/plugins/runtimeConfiguration'
import { httpPlugin } from '@/plugins/http'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(runtimeConfiguration, await initRuntimeConfiguration())
app.use(httpPlugin)
app.mount('#app')
