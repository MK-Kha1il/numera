package com.example.numera.data.network

import android.content.Context
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

    fun init(context: Context) {
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        authToken = prefs.getString("auth_token", null)
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
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("auth_token", authToken).apply()
    }

    fun clearToken(context: Context) {
        android.util.Log.d("RetrofitClient", "clearToken called")
        authToken = null
        val prefs = context.getSharedPreferences("numera_prefs", Context.MODE_PRIVATE)
        prefs.edit().remove("auth_token").apply()
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
