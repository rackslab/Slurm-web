<!--
  Copyright (c) 2025 Rackslab

  This file is part of Slurm-web.

  SPDX-License-Identifier: MIT
-->

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
    <section class="bg-slurmweb-light flex h-screen items-center justify-center dark:bg-gray-900">
      <div class="mx-auto max-w-md text-center">
        <div class="mb-8">
          <h1 class="text-9xl font-bold text-gray-400 dark:text-gray-600" aria-label="404">404</h1>
        </div>
        <div class="mb-8">
          <h2 class="mb-4 text-2xl font-semibold text-gray-900 dark:text-white">Page not found</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <div>
          <RouterLink
            :to="{ name: 'clusters' }"
            class="bg-slurmweb hover:bg-slurmweb-dark focus:ring-slurmweb-light dark:bg-slurmweb-dark dark:hover:bg-slurmweb dark:focus:ring-slurmweb-verydark inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium text-white focus:ring-4 focus:outline-hidden"
          >
            Go to clusters
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
