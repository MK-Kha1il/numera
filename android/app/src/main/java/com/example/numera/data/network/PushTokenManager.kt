package com.example.numera.data.network

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Bridge between the FCM device token and the server. This is the one remaining hook for push:
 *
 *   1. Add the FCM SDK + `google-services.json` (com.google.firebase:firebase-messaging) and the
 *      `com.google.gms.google-services` Gradle plugin.
 *   2. Add a `FirebaseMessagingService` and, from its `onNewToken(token)` (and once after login),
 *      call [registerToken]. That POSTs the token to /api/notifications/push-token so the server's
 *      lifecycle funnel (services/pushSender.js) can deliver pushes to this device.
 *
 * Everything server-side is already wired and tested; only the device SDK registration above is
 * left, since it needs the project's Firebase credentials.
 */
object PushTokenManager {
    /** Register (or refresh) this device's FCM token with the server. Safe to call repeatedly. */
    fun registerToken(token: String) {
        val auth = RetrofitClient.authToken ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                RetrofitClient.apiService.registerPushToken(auth, PushTokenRequest(token))
            } catch (e: Exception) {
                android.util.Log.w("PushTokenManager", "Failed to register push token: ${e.message}")
            }
        }
    }
}
