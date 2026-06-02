package com.example.numera.ui.components

import android.util.Log

/**
 * Optimistic-update helper.
 *
 * The 4-step contract: (1) update the UI immediately, (2) assume success, (3) sync with the backend,
 * (4) recover gracefully on failure. Callers do the UI mutation in [apply]/[revert] (on the main
 * thread) and the network call in [call]; on failure the UI is reverted and [onError] runs.
 *
 * Example:
 * ```
 * scope.launch {
 *     runOptimistic(
 *         apply  = { isFavorite = true },
 *         revert = { isFavorite = false },
 *         call   = { api.toggleFavorite(token, req) },
 *         onError = { toast.error("Couldn't save — try again") }
 *     )
 * }
 * ```
 */
suspend fun runOptimistic(
    apply: () -> Unit,
    revert: () -> Unit,
    call: suspend () -> Unit,
    onError: (Throwable) -> Unit = {}
) {
    apply()
    try {
        call()
    } catch (e: Throwable) {
        Log.e("Optimistic", "Optimistic action failed, reverting: ${e.message}")
        revert()
        onError(e)
    }
}
