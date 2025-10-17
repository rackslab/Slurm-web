/*
 * Copyright (c) 2023-2024 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import './style.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { initRuntimeConfiguration, runtimeConfiguration } from '@/plugins/runtimeConfiguration'
import { httpPlugin } from '@/plugins/http'

const runtimeConfigurationOptions = await initRuntimeConfiguration()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(runtimeConfiguration, runtimeConfigurationOptions)
app.use(httpPlugin)
app.mount('#app')
