package com.example.numera.ui.screens

import android.content.Context
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.AuthResponse
import com.example.numera.data.network.MfaLoginRequest
import com.example.numera.data.network.RetrofitClient
import com.example.numera.data.network.User
import com.example.numera.theme.ThemeManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Outcome of submitting credentials. The server returns either a session (Success) or, when the
 * account has MFA enabled, a short-lived challenge to exchange for one (NeedsMfa).
 */
sealed interface LoginResult {
    data class Success(val user: User) : LoginResult
    data class NeedsMfa(val challenge: String) : LoginResult
}

/**
 * Applies an [AuthResponse]: on a normal response it persists the token + theme and returns
 * Success; on an MFA-gated response it returns the challenge for the second-factor step. Throws
 * only on a genuinely malformed response (no token and not an MFA challenge).
 */
fun applyAuthResponse(context: Context, response: AuthResponse): LoginResult {
    if (response.mfaRequired == true && response.challenge != null) {
        return LoginResult.NeedsMfa(response.challenge)
    }
    val token = response.token ?: error("Malformed auth response: missing token")
    RetrofitClient.saveToken(context, token)
    ThemeManager.currentTheme = response.user?.theme ?: "duolingo"
    return LoginResult.Success(response.user ?: error("Malformed auth response: missing user"))
}

/**
 * Second-factor prompt shown after a password is accepted for an MFA-enabled account. Exchanges
 * the [challenge] + a TOTP (or one-time recovery) code for a session via /api/auth/mfa/login.
 */
@Composable
fun MfaChallengeDialog(
    challenge: String,
    onAuthenticated: () -> Unit,
    onCancel: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var code by remember { mutableStateOf("") }
    var useRecovery by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val submit = submit@{
        val entered = code.trim()
        if (entered.isBlank()) {
            errorMessage = "Enter your code."
            return@submit
        }
        isLoading = true
        errorMessage = null
        scope.launch(Dispatchers.IO) {
            try {
                val req = if (useRecovery) {
                    MfaLoginRequest(challenge = challenge, recoveryCode = entered)
                } else {
                    MfaLoginRequest(challenge = challenge, token = entered)
                }
                val response = RetrofitClient.apiService.mfaLogin(req)
                when (applyAuthResponse(context, response)) {
                    is LoginResult.Success -> withContext(Dispatchers.Main) {
                        isLoading = false
                        onAuthenticated()
                    }
                    // mfaLogin never re-challenges; treat as an error defensively.
                    is LoginResult.NeedsMfa -> withContext(Dispatchers.Main) {
                        isLoading = false
                        errorMessage = "Unexpected response. Please try again."
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    isLoading = false
                    errorMessage = authErrorMessage(
                        e,
                        if (useRecovery) "Invalid recovery code." else "Invalid authentication code.",
                    )
                }
            }
        }
    }

    AlertDialog(
        onDismissRequest = { if (!isLoading) onCancel() },
        title = {
            Text("Two-Factor Verification", fontWeight = FontWeight.ExtraBold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = if (useRecovery) {
                        "Enter one of your one-time recovery codes."
                    } else {
                        "Enter the 6-digit code from your authenticator app."
                    },
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                )
                OutlinedTextField(
                    value = code,
                    onValueChange = {
                        code = if (useRecovery) it else it.filter { c -> c.isDigit() }.take(6)
                    },
                    singleLine = true,
                    enabled = !isLoading,
                    label = { Text(if (useRecovery) "Recovery code" else "Authentication code") },
                    keyboardOptions = KeyboardOptions(
                        keyboardType = if (useRecovery) KeyboardType.Text else KeyboardType.Number,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
                errorMessage?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, fontSize = 12.sp, textAlign = TextAlign.Center)
                }
                TextButton(
                    onClick = {
                        useRecovery = !useRecovery
                        code = ""
                        errorMessage = null
                    },
                    enabled = !isLoading,
                ) {
                    Text(
                        if (useRecovery) "Use authenticator code instead" else "Use a recovery code instead",
                        fontSize = 12.sp,
                    )
                }
            }
        },
        confirmButton = {
            Button(onClick = { if (!isLoading) submit() }, enabled = !isLoading) {
                Text(if (isLoading) "Verifying…" else "Verify", fontWeight = FontWeight.Bold, color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = { if (!isLoading) onCancel() }) { Text("Cancel") }
        },
    )
}
