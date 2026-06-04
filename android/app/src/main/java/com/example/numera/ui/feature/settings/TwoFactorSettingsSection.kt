package com.example.numera.ui.feature.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.numera.data.network.MfaDisableRequest
import com.example.numera.data.network.MfaEnableRequest
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Self-contained Two-Factor Authentication control for the Settings security card. Reflects the
 * server flow: setup → confirm a TOTP code → enable + show one-time recovery codes; or disable
 * (password re-auth). Drops into the settings Column with no params.
 */
@Composable
fun TwoFactorSettingsSection() {
    val scope = rememberCoroutineScope()

    var enabled by remember { mutableStateOf<Boolean?>(null) } // null = loading
    var statusMsg by remember { mutableStateOf<String?>(null) }
    var isError by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }

    // Enrollment-in-progress state.
    var pendingSecret by remember { mutableStateOf<String?>(null) }
    var totpCode by remember { mutableStateOf("") }
    var recoveryCodes by remember { mutableStateOf<List<String>?>(null) }

    // Disable state.
    var showDisable by remember { mutableStateOf(false) }
    var disablePassword by remember { mutableStateOf("") }

    fun token() = RetrofitClient.authToken ?: ""

    LaunchedEffect(Unit) {
        try {
            val res = RetrofitClient.apiService.mfaStatus(token())
            enabled = res.enabled
        } catch (_: Exception) {
            enabled = false
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.weight(1f)) {
                Text("Two-Factor Authentication", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text(
                    text = when (enabled) {
                        true -> "Enabled — an authenticator code is required at login."
                        false -> "Add a second factor with an authenticator app."
                        null -> "Checking status…"
                    },
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                )
            }
            if (enabled == true) {
                Text("ON", color = CorrectGreen, fontWeight = FontWeight.ExtraBold, fontSize = 12.sp)
            }
        }

        statusMsg?.let { msg ->
            Spacer(Modifier.height(6.dp))
            Text(msg, color = if (isError) WrongRed else CorrectGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }

        // ----- DISABLED: offer enrollment -----
        if (enabled == false && recoveryCodes == null) {
            if (pendingSecret == null) {
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        isLoading = true
                        statusMsg = null
                        scope.launch(Dispatchers.IO) {
                            try {
                                val res = RetrofitClient.apiService.mfaSetup(token())
                                withContext(Dispatchers.Main) {
                                    isLoading = false
                                    pendingSecret = res.secret
                                }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) {
                                    isLoading = false; isError = true; statusMsg = "Couldn't start setup: ${e.message}"
                                }
                            }
                        }
                    },
                    enabled = !isLoading,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(CornerRadius.m),
                ) {
                    if (isLoading) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    else Text("Enable Two-Factor Auth", fontWeight = FontWeight.Bold, color = Color.White)
                }
            } else {
                // Secret issued — show the manual-entry key + confirm a code.
                Spacer(Modifier.height(10.dp))
                Text(
                    "1. Add this key to your authenticator app (Google Authenticator, Authy, …):",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
                )
                Spacer(Modifier.height(6.dp))
                Surface(
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shape = RoundedCornerShape(CornerRadius.m),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        pendingSecret!!.chunked(4).joinToString(" "),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(12.dp),
                    )
                }
                Spacer(Modifier.height(10.dp))
                Text("2. Enter the 6-digit code it shows:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f))
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(
                    value = totpCode,
                    onValueChange = { totpCode = it.filter { c -> c.isDigit() }.take(6) },
                    label = { Text("Authentication code") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(CornerRadius.m),
                )
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        if (totpCode.length != 6) { isError = true; statusMsg = "Enter the 6-digit code."; return@Button }
                        isLoading = true; statusMsg = null
                        scope.launch(Dispatchers.IO) {
                            try {
                                val res = RetrofitClient.apiService.mfaEnable(token(), MfaEnableRequest(totpCode))
                                withContext(Dispatchers.Main) {
                                    isLoading = false
                                    recoveryCodes = res.recoveryCodes
                                    pendingSecret = null
                                    totpCode = ""
                                    enabled = true
                                }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) {
                                    isLoading = false; isError = true
                                    statusMsg = "Invalid code — check your app's time sync and try again."
                                }
                            }
                        }
                    },
                    enabled = !isLoading,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(CornerRadius.m),
                ) {
                    if (isLoading) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    else Text("Verify & Enable", fontWeight = FontWeight.Bold, color = Color.White)
                }
                TextButton(onClick = { pendingSecret = null; totpCode = ""; statusMsg = null }, enabled = !isLoading) {
                    Text("Cancel", fontSize = 12.sp)
                }
            }
        }

        // ----- Recovery codes (shown once, right after enabling) -----
        recoveryCodes?.let { codes ->
            Spacer(Modifier.height(10.dp))
            Text("Save your recovery codes", fontWeight = FontWeight.ExtraBold, fontSize = 13.sp)
            Text(
                "Each can be used once if you lose your authenticator. Store them somewhere safe — they won't be shown again.",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
            )
            Spacer(Modifier.height(6.dp))
            Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = RoundedCornerShape(CornerRadius.m), modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    codes.forEach { Text(it, fontSize = 14.sp, fontWeight = FontWeight.Medium) }
                }
            }
            Spacer(Modifier.height(8.dp))
            Button(onClick = { recoveryCodes = null; statusMsg = "✅ Two-factor authentication is on."; isError = false }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(CornerRadius.m)) {
                Text("I've saved my codes", fontWeight = FontWeight.Bold, color = Color.White)
            }
        }

        // ----- ENABLED: offer disable -----
        if (enabled == true && recoveryCodes == null) {
            Spacer(Modifier.height(10.dp))
            if (!showDisable) {
                OutlinedButton(onClick = { showDisable = true; statusMsg = null }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(CornerRadius.m)) {
                    Text("Disable Two-Factor Auth")
                }
            } else {
                Text("Confirm your password to disable 2FA:", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f))
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(
                    value = disablePassword,
                    onValueChange = { disablePassword = it },
                    label = { Text("Password") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(CornerRadius.m),
                )
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        onClick = {
                            if (disablePassword.isBlank()) { isError = true; statusMsg = "Enter your password."; return@Button }
                            isLoading = true; statusMsg = null
                            scope.launch(Dispatchers.IO) {
                                try {
                                    RetrofitClient.apiService.mfaDisable(token(), MfaDisableRequest(disablePassword))
                                    withContext(Dispatchers.Main) {
                                        isLoading = false; enabled = false; showDisable = false; disablePassword = ""
                                        isError = false; statusMsg = "Two-factor authentication disabled."
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        isLoading = false; isError = true; statusMsg = "Couldn't disable — check your password."
                                    }
                                }
                            }
                        },
                        enabled = !isLoading,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(CornerRadius.m),
                    ) {
                        if (isLoading) CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                        else Text("Confirm Disable", fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    OutlinedButton(onClick = { showDisable = false; disablePassword = ""; statusMsg = null }, enabled = !isLoading, modifier = Modifier.weight(1f), shape = RoundedCornerShape(CornerRadius.m)) {
                        Text("Cancel")
                    }
                }
            }
        }
    }
}
