package com.example.numera.ui.dialogs

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.numera.data.network.ConvertRequest
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.DuoPrimary
import com.example.numera.theme.WrongRed
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.screens.applyAuthResponse
import com.example.numera.ui.screens.authErrorMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * Converts the current guest account into a full account in place (POST /api/auth/convert), so the
 * progress the learner already built as a guest is kept — not thrown away by signing up. Mirrors the
 * register form's fields/validation; on success it swaps in the fresh tokens and calls [onConverted].
 */
@Composable
fun SaveProgressDialog(
    onDismiss: () -> Unit,
    onConverted: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var username by remember { mutableStateOf("") }
    var birthDate by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    val hasMinLength = password.length >= 8
    val hasUppercase = password.any { it.isUpperCase() }
    val hasDigit = password.any { it.isDigit() }
    val isPasswordStrong = hasMinLength && hasUppercase && hasDigit

    Dialog(onDismissRequest = onDismiss) {
        DuoCard(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight()
                .padding(8.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Save your progress",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Create an account to keep your streak, XP, and everything you've unlocked. " +
                        "It takes a few seconds — nothing you've done is lost.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center
                )

                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = birthDate,
                    onValueChange = { birthDate = it },
                    label = { Text("Date of birth (YYYY-MM-DD)") },
                    placeholder = { Text("2008-04-15") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    supportingText = { Text("You must be at least 13 to use Numera.") },
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth()
                )

                if (password.isNotEmpty()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = if (hasMinLength) "✓ At least 8 characters" else "✗ Must be 8+ characters",
                            color = if (hasMinLength) DuoPrimary else WrongRed,
                            fontSize = 12.sp
                        )
                        Text(
                            text = if (hasUppercase) "✓ At least 1 uppercase letter" else "✗ Must have 1 uppercase letter",
                            color = if (hasUppercase) DuoPrimary else WrongRed,
                            fontSize = 12.sp
                        )
                        Text(
                            text = if (hasDigit) "✓ At least 1 digit" else "✗ Must have 1 digit",
                            color = if (hasDigit) DuoPrimary else WrongRed,
                            fontSize = 12.sp
                        )
                    }
                }

                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = { Text("Confirm Password") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth()
                )

                if (errorMessage != null) {
                    Text(
                        text = errorMessage!!,
                        color = WrongRed,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center
                    )
                }

                if (isLoading) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                } else {
                    DuoButton(
                        text = "Create account",
                        onClick = {
                            if (username.isBlank() || password.isBlank()) {
                                errorMessage = "Please enter all details"; return@DuoButton
                            }
                            if (!isPasswordStrong) {
                                errorMessage = "Password must meet all safety requirements"; return@DuoButton
                            }
                            if (password != confirmPassword) {
                                errorMessage = "Passwords do not match"; return@DuoButton
                            }
                            isLoading = true
                            errorMessage = null
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    val response = RetrofitClient.apiService.convertGuest(
                                        token,
                                        ConvertRequest(username.trim(), password, null, birthDate.trim())
                                    )
                                    applyAuthResponse(context, response)
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        onConverted()
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        errorMessage = authErrorMessage(e, "Couldn't create your account. Please try again.")
                                    }
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.primary
                    )
                    TextButton(onClick = onDismiss) {
                        Text(
                            text = "Not now",
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}
