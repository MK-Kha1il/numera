package com.example.numera.data.network

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private var currentBaseUrl = "http://10.100.94.164:3000/"

    var authToken: String? = null
        set(value) {
            field = value?.let { if (it.startsWith("Bearer ")) it else "Bearer $it" }
        }

    val isUserLoggedIn: Boolean
        get() = authToken != null

    private val _profileRefreshFlow = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val profileRefreshFlow = _profileRefreshFlow.asSharedFlow()

    private val _logoutEventFlow = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val logoutEventFlow = _logoutEventFlow.asSharedFlow()

    fun triggerProfileRefresh() { _profileRefreshFlow.tryEmit(Unit) }
    fun triggerLogout()         { _logoutEventFlow.tryEmit(Unit) }

    lateinit var apiService: ApiService
        private set

    /**
     * Test seam: inject a fake/mock [ApiService] for JVM (Robolectric) UI tests so screens can be
     * rendered without a real network/server. Not for production use — `init`/`setBaseUrl` build
     * the real client.
     */
    internal fun setApiServiceForTest(service: ApiService) {
        apiService = service
    }

    // The bearer token is sensitive, so it lives in EncryptedSharedPreferences (AES-256-GCM,
    // key held in the Android Keystore) rather than the world-readable-on-root plaintext prefs
    // it used to share with non-sensitive settings. Falls back to plaintext only if the
    // Keystore-backed store can't be created (rare OEM/keystore failures), so login never breaks.
    private const val SECURE_PREFS = "numera_secure_prefs"
    private const val TOKEN_KEY = "auth_token"

    private fun securePrefs(context: Context): SharedPreferences {
        return try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                SECURE_PREFS,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        } catch (e: Exception) {
            android.util.Log.e("RetrofitClient", "EncryptedSharedPreferences unavailable; using fallback: ${e.message}")
            context.getSharedPreferences(SECURE_PREFS, Context.MODE_PRIVATE)
        }
    }

    fun init(context: Context) {
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        val secure = securePrefs(context)

        // One-time migration: an existing plaintext token is moved into encrypted storage and
        // scrubbed from the old prefs.
        val legacyToken = prefs.getString("auth_token", null)
        if (legacyToken != null && secure.getString(TOKEN_KEY, null) == null) {
            secure.edit().putString(TOKEN_KEY, legacyToken).apply()
            prefs.edit().remove("auth_token").apply()
        }

        authToken = secure.getString(TOKEN_KEY, null)
        var savedUrl = prefs.getString("server_base_url", "http://10.100.94.164:3000/")
            ?: "http://10.100.94.164:3000/"
        // Localhost/127.0.0.1 never works from a device/emulator; keep the LAN IP
        if (savedUrl.contains("127.0.0.1") || savedUrl.contains("localhost")) {
            savedUrl = "http://10.100.94.164:3000/"
        }
        setBaseUrl(context, savedUrl)
    }

    fun setBaseUrl(context: Context, newUrl: String) {
        var cleanUrl = newUrl.trim()
        if (cleanUrl.isNotBlank()) {
            if (!cleanUrl.endsWith("/")) cleanUrl += "/"
            currentBaseUrl = cleanUrl
        }
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("server_base_url", currentBaseUrl).apply()

        apiService = Retrofit.Builder()
            .baseUrl(currentBaseUrl)
            .client(buildOkHttpClient())
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(ApiService::class.java)

        SocketClient.updateUrl(currentBaseUrl.removeSuffix("/"))
    }

    fun getBaseUrl(): String = currentBaseUrl

    fun saveToken(context: Context, token: String) {
        authToken = token
        securePrefs(context).edit().putString(TOKEN_KEY, authToken).apply()
    }

    fun clearToken(context: Context) {
        android.util.Log.d("RetrofitClient", "clearToken called")
        authToken = null
        securePrefs(context).edit().remove(TOKEN_KEY).apply()
    }

    private fun buildOkHttpClient(): OkHttpClient {
        // Log headers only — never log request/response bodies (contains tokens & passwords)
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.HEADERS
        }

        return OkHttpClient.Builder()
            .addInterceptor(logging)
            // Inject Authorization header on every authenticated request
            .addInterceptor { chain ->
                val req = authToken?.let { token ->
                    chain.request().newBuilder()
                        .header("Authorization", token)
                        .build()
                } ?: chain.request()
                chain.proceed(req)
            }
            // Stamp an Idempotency-Key on POST requests so reward-granting calls
            // (purchase, claim, level-complete, …) are not double-applied if the
            // request is retried. This is an APPLICATION interceptor, so the key
            // is generated once per call and reused across OkHttp's automatic
            // connection-failure retries — the server replays the stored result
            // instead of granting twice. The server ignores the header on routes
            // without idempotency mounted, so stamping every POST is harmless.
            // A call site may set its own key; we only add one when absent.
            .addInterceptor { chain ->
                val original = chain.request()
                val req = if (original.method.equals("POST", ignoreCase = true) &&
                    original.header("Idempotency-Key") == null
                ) {
                    original.newBuilder()
                        .header("Idempotency-Key", java.util.UUID.randomUUID().toString())
                        .build()
                } else {
                    original
                }
                chain.proceed(req)
            }
            // Handle 401 → global logout signal
            .addInterceptor { chain ->
                val response = chain.proceed(chain.request())
                if (response.code == 401) {
                    android.util.Log.w("RetrofitClient", "401 Unauthorized — triggering logout")
                    triggerLogout()
                }
                response
            }
            .connectTimeout(10, TimeUnit.SECONDS)   // fail fast on unreachable host
            .readTimeout(30, TimeUnit.SECONDS)       // longer for heavy math payloads
            .writeTimeout(20, TimeUnit.SECONDS)
            .build()
    }
}
