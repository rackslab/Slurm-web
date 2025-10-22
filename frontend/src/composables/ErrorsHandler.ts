/*
 * Copyright (c) 2025 Rackslab
 *
 * This file is part of Slurm-web.
 *
 * SPDX-License-Identifier: MIT
 */

import { useRouter } from 'vue-router'
import { useRuntimeStore } from '@/stores/runtime'
import { useAuthStore } from '@/stores/auth'
import { AuthenticationError, PermissionError } from '@/composables/HTTPErrors'

/**
 * Composable for handling various types of errors consistently across the application.
 * Provides standardized ways to report errors and handle appropriate responses
 * (like redirects) based on error types.
 */
export function useErrorsHandler() {
  const router = useRouter()
  const runtime = useRuntimeStore()
  const authStore = useAuthStore()

  /**
   * Handles authentication errors by:
   * 1. Reporting the error to the runtime store
   * 2. Setting the current route as returnUrl for post-login redirection
   * 3. Redirecting to the signout page
   *
   * @param error - The AuthenticationError instance
   */
  function reportAuthenticationError(error: AuthenticationError) {
    runtime.reportError(`Authentication error: ${error.message}`)
    // Set returnUrl to current route before redirecting to signout
    authStore.returnUrl = router.currentRoute.value.fullPath
    router.push({ name: 'signout' })
  }

  /**
   * Handles permission errors by reporting the error to the runtime store
   *
   * @param error - The PermissionError instance
   */
  function reportPermissionError(error: PermissionError) {
    runtime.reportError(`Permission error: ${error.message}`)
  }

  /**
   * Handles general server errors by reporting the error to the runtime store
   *
   * @param error - The Error instance
   */
  function reportServerError(error: Error) {
    runtime.reportError(`Server error: ${error.message}`)
  }

  return {
    reportAuthenticationError,
    reportPermissionError,
    reportServerError
  }
}
