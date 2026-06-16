package com.example.numera.analytics

import com.example.numera.data.network.AnalyticsEventRequest
import com.example.numera.data.network.RetrofitClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Privacy-first product analytics client (ultra review #39). Fire-and-forget: never blocks the UI
 * and never throws into a caller. The server stores only aggregate per-day counts for an allowlisted
 * set of event keys — no user/device/session is ever attached, here or there. Event keys must match
 * the server allowlist in routes/analytics.js (anything else is silently dropped server-side).
 */
object Analytics {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun log(event: String) {
        val token = RetrofitClient.authToken ?: return
        scope.launch {
            runCatching { RetrofitClient.apiService.logAnalyticsEvent(token, AnalyticsEventRequest(event)) }
        }
    }
}
