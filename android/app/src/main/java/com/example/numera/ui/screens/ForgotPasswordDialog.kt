package com.example.numera.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.ForgotPasswordRequest
import com.example.numera.data.network.ResetPasswordRequest
import com.example.numera.data.network.RetrofitClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Self-contained password-reset dialog launched from the login screen. Two phases:
 *   1. Request — enter username; the server emails a single-use code (and always responds
 *      generically, so this never reveals whether the account/email exists).
 *   2. Reset — enter the emailed code + a new password.
 * On success it calls [onResetComplete] so the host can surface a "now log in" message.
 */
@Composable
fun ForgotPasswordDialog(
    onDismiss: () -> Unit,
    onResetComplete: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var phase by remember { mutableStateOf(1) } // 1 = request, 2 = reset
    var username by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var info by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    val requestCode = req@{
        if (username.isBlank()) { error = "Enter your username."; return@req }
        isLoading = true; error = null; info = null
        scope.launch(Dispatchers.IO) {
            try {
                val res = RetrofitClient.apiService.forgotPassword(ForgotPasswordRequest(username.trim()))
                withContext(Dispatchers.Main) {
                    isLoading = false
                    phase = 2
                    info = res.message ?: "If an account with a registered email exists, a reset code has been sent."
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    isLoading = false
                    error = authErrorMessage(e, "Couldn't send a reset code. Try again.")
                }
            }
        }
    }

    val doReset = reset@{
        if (code.isBlank() || newPassword.isBlank()) { error = "Enter the code and a new password."; return@reset }
        if (newPassword.length < 10) { error = "Password must be at least 10 characters."; return@reset }
        isLoading = true; error = null
        scope.launch(Dispatchers.IO) {
            try {
                RetrofitClient.apiService.resetPassword(
                    ResetPasswordRequest(username.trim(), code.trim(), newPassword)
                )
                withContext(Dispatchers.Main) {
                    isLoading = false
                    onResetComplete()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    isLoading = false
                    error = authErrorMessage(e, "Invalid or expired code.")
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!isLoading) onDismiss() },
        title = { Text(if (phase == 1) "Reset Password" else "Enter Reset Code", fontWeight = FontWeight.ExtraBold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (phase == 1) {
                    Text(
                        "Enter your username. If a verified email is on file, we'll send a reset code to it.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                    OutlinedTextField(
                        value = username,
                        onValueChange = { username = it },
                        label = { Text("Username") },
                        singleLine = true,
                        enabled = !isLoading,
                        modifier = Modifier.fillMaxWidth(),
                    )
                } else {
                    info?.let {
                        Text(it, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                    }
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it.uppercase().take(8) },
                        label = { Text("Reset code") },
                        singleLine = true,
                        enabled = !isLoading,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it },
                        label = { Text("New password") },
                        singleLine = true,
                        enabled = !isLoading,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    TextButton(onClick = { phase = 1; code = ""; error = null }, enabled = !isLoading) {
                        Text("Didn't get a code? Start over", fontSize = 12.sp)
                    }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp) }
            }
        },
        confirmButton = {
            Button(
                onClick = { if (!isLoading) { if (phase == 1) requestCode() else doReset() } },
                enabled = !isLoading,
            ) {
                Text(
                    when {
                        isLoading -> "Working…"
                        phase == 1 -> "Send Code"
                        else -> "Reset Password"
                    },
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) onDismiss() }) { Text("Cancel") }
        },
    )
}
