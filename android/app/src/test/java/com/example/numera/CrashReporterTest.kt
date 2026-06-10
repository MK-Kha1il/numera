package com.example.numera

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import com.example.numera.data.network.ApiService
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.SimpleResponse
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File
import java.io.IOException

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CrashReporterTest {
    private val context: Context = ApplicationProvider.getApplicationContext()
    private fun pendingFile() = File(context.filesDir, "pending_crash.txt")

    /** Phase 1: an uncaught exception is persisted locally (truncated), nothing else. */
    @Test
    fun writePendingPersistsTruncatedStack() {
        pendingFile().delete()
        CrashReporter.writePending(context, RuntimeException("boom-" + "x".repeat(20_000)))
        assertTrue(pendingFile().exists())
        val text = pendingFile().readText()
        assertTrue(text.contains("RuntimeException"))
        assertTrue("stack must be truncated", text.length <= 8000)
    }

    /** Phase 2: the next launch uploads the pending crash and clears the file. */
    @Test
    fun flushPendingUploadsAndDeletes() {
        pendingFile().writeText("java.lang.IllegalStateException: kaboom\n\tat numera.Test(Test.kt:1)")
        val fakeApi = mockk<ApiService>()
        coEvery { fakeApi.reportCrash(any()) } returns SimpleResponse(true, "ok")
        RetrofitClient.setApiServiceForTest(fakeApi)

        CrashReporter.flushPending(context)

        coVerify(timeout = 5000) {
            fakeApi.reportCrash(match { it.stack.contains("kaboom") && it.sdkInt > 0 })
        }
        awaitGone(pendingFile())
        assertFalse("uploaded crash file must be deleted", pendingFile().exists())
    }

    /** Upload failure (offline at boot is common) keeps the file for the next launch. */
    @Test
    fun flushPendingKeepsFileOnFailure() {
        pendingFile().writeText("java.lang.IllegalStateException: transient\n\tat numera.Test(Test.kt:1)")
        val fakeApi = mockk<ApiService>()
        coEvery { fakeApi.reportCrash(any()) } throws IOException("network down")
        RetrofitClient.setApiServiceForTest(fakeApi)

        CrashReporter.flushPending(context)

        coVerify(timeout = 5000) { fakeApi.reportCrash(any()) }
        Thread.sleep(200) // give a (wrong) delete a chance to happen before asserting it didn't
        assertTrue("failed upload must keep the file for retry", pendingFile().exists())
    }

    private fun awaitGone(file: File, timeoutMs: Long = 5000) {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (file.exists() && System.currentTimeMillis() < deadline) Thread.sleep(50)
    }
}
