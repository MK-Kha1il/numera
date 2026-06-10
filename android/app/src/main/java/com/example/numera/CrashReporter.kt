package com.example.numera

import android.content.Context
import android.os.Build
import android.util.Log
import com.example.numera.data.network.CrashReportRequest
import com.example.numera.data.network.RetrofitClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter

/**
 * Self-hosted, privacy-first crash reporting. No third-party SDK (the app's no-tracking
 * posture is a feature): an uncaught exception is written to a local file, and on the NEXT
 * launch it is posted anonymously to our own /api/crash — a stack trace + app version +
 * Android API level, never a user or device identifier.
 *
 * Two-phase by design: nothing network-bound happens inside the crashing process — the
 * handler only writes a file and then lets the default handler crash the app normally.
 */
object CrashReporter {
    private const val TAG = "CrashReporter"
    private const val PENDING_FILE = "pending_crash.txt"
    private const val MAX_STACK_CHARS = 8000

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun install(context: Context) {
        val appContext = context.applicationContext
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                writePending(appContext, throwable)
            } catch (_: Throwable) {
                // Never let the reporter itself interfere with the crash path.
            }
            previous?.uncaughtException(thread, throwable)
        }
    }

    /** Posts a crash recorded by a previous run (if any), deleting the file on success. */
    fun flushPending(context: Context) {
        val appContext = context.applicationContext
        scope.launch {
            val file = File(appContext.filesDir, PENDING_FILE)
            if (!file.exists()) return@launch
            val stack = runCatching { file.readText() }.getOrNull() ?: return@launch
            if (stack.isBlank()) {
                file.delete()
                return@launch
            }
            runCatching {
                RetrofitClient.apiService.reportCrash(
                    CrashReportRequest(
                        stack = stack,
                        appVersion = versionName(appContext),
                        sdkInt = Build.VERSION.SDK_INT,
                    )
                )
            }.onSuccess {
                file.delete()
            }.onFailure {
                // Keep the file; we'll retry on the next launch. (Offline at boot is common.)
                Log.w(TAG, "Crash upload failed, will retry next launch: ${it.message}")
            }
        }
    }

    internal fun writePending(context: Context, throwable: Throwable) {
        val sw = StringWriter()
        throwable.printStackTrace(PrintWriter(sw))
        File(context.filesDir, PENDING_FILE).writeText(sw.toString().take(MAX_STACK_CHARS))
    }

    private fun versionName(context: Context): String = runCatching {
        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "unknown"
    }.getOrDefault("unknown")
}
