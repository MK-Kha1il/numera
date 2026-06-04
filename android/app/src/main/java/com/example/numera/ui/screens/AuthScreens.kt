package com.example.numera.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.platform.LocalContext
import com.example.numera.data.network.LoginRequest
import com.example.numera.data.network.RegisterRequest
import com.example.numera.data.network.RetrofitClient
import com.example.numera.theme.*
import com.example.numera.ui.components.DuoButton
import com.example.numera.ui.components.DuoCard
import com.example.numera.ui.components.GlassCard
import com.example.numera.ui.components.NeonButton
import com.example.numera.ui.components.NeonText
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.drawText
import kotlin.math.cos
import kotlin.math.sin

val AVATAR_MAP = mapOf(
    "avatar_owl" to "🦉 Owl",
    "avatar_fox" to "🦊 Fox",
    "avatar_koala" to "🐨 Koala",
    "avatar_panda" to "🐼 Panda"
)

/**
 * Maps an auth network/HTTP exception to an accurate, human message. A network failure must NOT
 * be reported as "wrong credentials" / "username taken" (it previously was) — that misleads the
 * user into changing inputs that were fine. When the server DID respond with an error, surface its
 * own message (e.g. "Username already exists", "Invalid username or password"); otherwise fall back.
 */
private fun authErrorMessage(e: Throwable, fallback: String): String = when (e) {
    is java.io.IOException ->
        "Can't reach the server. Check your connection and try again."
    is retrofit2.HttpException -> {
        val body = try { e.response()?.errorBody()?.string() } catch (_: Exception) { null }
        val serverMsg = body?.let {
            Regex("\"error\"\\s*:\\s*\"([^\"]+)\"").find(it)?.groupValues?.getOrNull(1)
        }
        serverMsg?.takeIf { it.isNotBlank() } ?: fallback
    }
    else -> fallback
}

@Composable
fun CinematicMathBackground() {
    val infiniteTransition = rememberInfiniteTransition(label = "mathBg")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 30000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase"
    )
    val drift by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 20000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "drift"
    )

    val symbols = remember {
        listOf(
            "π", "∞", "∑", "∫", "√", "Δ", "θ", "λ", "φ", "Ω",
            "∂", "∇", "ℝ", "ℂ", "ℕ", "e", "i", "∈", "⊂", "⊕",
            "≈", "≡", "∝", "∀", "∃", "¬", "∧", "∨"
        )
    }
    val positions = remember {
        List(28) { Triple(
            (Math.random() * 1.0).toFloat(),
            (Math.random() * 1.0).toFloat(),
            (Math.random() * 0.6 + 0.3).toFloat()
        )}
    }
    
    val textMeasurer = rememberTextMeasurer()

    Canvas(modifier = Modifier.fillMaxSize()) {
        val w = size.width
        val h = size.height
        val rad = phase * (Math.PI.toFloat() / 180f)

        // Draw subtle grid lines
        val gridAlpha = 0.04f
        val gridSpacing = 60f
        for (i in 0..(w / gridSpacing).toInt()) {
            val x = i * gridSpacing
            drawLine(
                color = Color.White.copy(alpha = gridAlpha),
                start = Offset(x, 0f),
                end = Offset(x, h),
                strokeWidth = 0.5f
            )
        }
        for (j in 0..(h / gridSpacing).toInt()) {
            val y = j * gridSpacing
            drawLine(
                color = Color.White.copy(alpha = gridAlpha),
                start = Offset(0f, y),
                end = Offset(w, y),
                strokeWidth = 0.5f
            )
        }

        // Draw floating math symbols with rotation
        positions.forEachIndexed { idx, (baseX, baseY, scale) ->
            val speed = (idx + 1) * 0.3f
            val offsetX = sin((rad * speed + idx * 0.5f).toDouble()).toFloat() * 40f * scale
            val offsetY = cos((rad * speed * 0.7f + idx * 0.3f).toDouble()).toFloat() * 30f * scale
            val cx = baseX * w + offsetX
            val cy = ((baseY + drift * 0.15f * (idx % 3 + 1)) % 1.1f) * h + offsetY
            val alpha = (0.06f + scale * 0.15f).coerceAtMost(0.25f)
            val symbolText = symbols[idx % symbols.size]
            val symbolColor = when (idx % 4) {
                0 -> Color(0xFF7C4DFF)
                1 -> Color(0xFF00BCD4)
                2 -> Color(0xFFFF6090)
                else -> Color(0xFFFFD54F)
            }

            val style = TextStyle(
                fontSize = (14f + scale * 18f).sp,
                fontWeight = FontWeight.Bold
            )
            val measuredText = textMeasurer.measure(
                text = symbolText,
                style = style
            )
            val textWidth = measuredText.size.width
            val textHeight = measuredText.size.height

            val symbolRotation = phase * (if (idx % 2 == 0) 1f else -1f) + idx * 45f

            withTransform({
                rotate(degrees = symbolRotation, pivot = Offset(cx + textWidth / 2f, cy + textHeight / 2f))
            }) {
                drawText(
                    textMeasurer = textMeasurer,
                    text = symbolText,
                    topLeft = Offset(cx, cy),
                    style = style.copy(color = symbolColor.copy(alpha = alpha))
                )
            }
        }

        // Orbital ring decorations
        for (ring in 0..2) {
            val ringRadius = 120f + ring * 90f
            val ringCx = w * 0.5f + sin((rad * 0.2f + ring).toDouble()).toFloat() * 50f
            val ringCy = h * 0.25f + cos((rad * 0.15f + ring).toDouble()).toFloat() * 40f
            drawCircle(
                color = Color(0xFF7C4DFF).copy(alpha = 0.06f - ring * 0.015f),
                radius = ringRadius,
                center = Offset(ringCx, ringCy),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 1.2f)
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onNavigateToRegister: () -> Unit,
    onLoginSuccess: () -> Unit
) {
    val context = LocalContext.current
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    var showGoogleDialog by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.surfaceVariant
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        CinematicMathBackground()



        DuoCard(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .wrapContentHeight()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header Brand
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "∑",
                        fontSize = 36.sp,
                        fontWeight = FontWeight.Black,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Numera",
                        style = TextStyle(
                            fontSize = 32.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = MaterialTheme.colorScheme.primary
                        )
                    )
                }

                Text(
                    text = "Unlock your math potential",
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(4.dp))

                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = MaterialTheme.colorScheme.primary,
                        unfocusedBorderColor = MaterialTheme.colorScheme.outline
                    ),
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth()
                )

                if (errorMessage != null) {
                    Text(
                        text = errorMessage!!,
                        color = WrongRed,
                        fontSize = 13.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                if (isLoading) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                } else {
                    DuoButton(
                        text = "Log In",
                        onClick = {
                            if (username.isBlank() || password.isBlank()) {
                                errorMessage = "Please enter all details"
                                return@DuoButton
                            }
                            isLoading = true
                            errorMessage = null
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val response = RetrofitClient.apiService.login(
                                        LoginRequest(username, password)
                                    )
                                    RetrofitClient.saveToken(context, response.token)
                                    ThemeManager.currentTheme = response.user.theme ?: "duolingo"
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        onLoginSuccess()
                                    }
                                } catch (e: Exception) {
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        errorMessage = authErrorMessage(e, "Incorrect username or password.")
                                    }
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.primary
                    )

                    // Continue with Google Button
                    DuoButton(
                        text = "Continue with Google",
                        onClick = { showGoogleDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.secondary
                    )

                    TextButton(onClick = onNavigateToRegister) {
                        Text(
                            text = "New User? Create Account",
                            color = MaterialTheme.colorScheme.secondary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }

    if (showGoogleDialog) {
        GoogleAuthMockDialog(
            onDismiss = { showGoogleDialog = false },
            onSuccess = { gUsername, gAvatar ->
                showGoogleDialog = false
                isLoading = true
                errorMessage = null
                scope.launch(Dispatchers.IO) {
                    try {
                        // Attempt to register google user with a default strong password
                        val response = RetrofitClient.apiService.register(
                            RegisterRequest(gUsername, "GoogleUser123!", gAvatar)
                        )
                        RetrofitClient.saveToken(context, response.token)
                        ThemeManager.currentTheme = response.user.theme ?: "duolingo"
                        withContext(Dispatchers.Main) {
                            isLoading = false
                            onLoginSuccess()
                        }
                    } catch (e: Exception) {
                        // If user already exists, try logging in
                        try {
                            val response = RetrofitClient.apiService.login(
                                LoginRequest(gUsername, "GoogleUser123!")
                            )
                            RetrofitClient.saveToken(context, response.token)
                            ThemeManager.currentTheme = response.user.theme ?: "duolingo"
                            withContext(Dispatchers.Main) {
                                isLoading = false
                                onLoginSuccess()
                            }
                        } catch (err: Exception) {
                            withContext(Dispatchers.Main) {
                                isLoading = false
                                errorMessage = "Google authentication failed"
                            }
                        }
                    }
                }
            }
        )
    }


}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    onNavigateToLogin: () -> Unit,
    onRegisterSuccess: () -> Unit
) {
    val context = LocalContext.current
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var selectedAvatar by remember { mutableStateOf("avatar_owl") }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    
    var showGoogleDialog by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()

    // Realtime Password Checking
    val hasMinLength = password.length >= 8
    val hasUppercase = password.any { it.isUpperCase() }
    val hasDigit = password.any { it.isDigit() }
    val isPasswordStrong = hasMinLength && hasUppercase && hasDigit

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.surfaceVariant
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        CinematicMathBackground()
        DuoCard(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .wrapContentHeight()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Create Profile",
                    style = TextStyle(
                        fontSize = 26.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                )

                // Avatar Grid/Row Picker
                Text(
                    text = "Pick your Avatar",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    AVATAR_MAP.forEach { (avatarKey, avatarLabel) ->
                        val isSelected = selectedAvatar == avatarKey
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else Color.Transparent)
                                .border(
                                    2.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                    CircleShape
                                )
                                .clickable { selectedAvatar = avatarKey },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = avatarLabel.split(" ")[0],
                                fontSize = 28.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
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

                // Password Strengths Indicators
                if (password.isNotEmpty()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = if (hasMinLength) "✓ At least 8 characters" else "✗ Must be 8+ characters",
                            color = if (hasMinLength) DuoPrimary else WrongRed,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = if (hasUppercase) "✓ At least 1 uppercase letter" else "✗ Must have 1 uppercase letter",
                            color = if (hasUppercase) DuoPrimary else WrongRed,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                        Text(
                            text = if (hasDigit) "✓ At least 1 digit" else "✗ Must have 1 digit",
                            color = if (hasDigit) DuoPrimary else WrongRed,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
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
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                if (isLoading) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.secondary)
                } else {
                    DuoButton(
                        text = "Sign Up",
                        onClick = {
                            if (username.isBlank() || password.isBlank()) {
                                errorMessage = "Please enter all details"
                                return@DuoButton
                            }
                            if (!isPasswordStrong) {
                                errorMessage = "Password must meet all safety requirements"
                                return@DuoButton
                            }
                            if (password != confirmPassword) {
                                errorMessage = "Passwords do not match"
                                return@DuoButton
                            }
                            isLoading = true
                            errorMessage = null
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val response = RetrofitClient.apiService.register(
                                        RegisterRequest(username, password, selectedAvatar)
                                    )
                                    RetrofitClient.saveToken(context, response.token)
                                    ThemeManager.currentTheme = response.user.theme ?: "duolingo"
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        onRegisterSuccess()
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

                    DuoButton(
                        text = "Continue with Google",
                        onClick = { showGoogleDialog = true },
                        modifier = Modifier.fillMaxWidth(),
                        color = MaterialTheme.colorScheme.secondary
                    )

                    TextButton(onClick = onNavigateToLogin) {
                        Text(
                            text = "Already registered? Login",
                            color = MaterialTheme.colorScheme.secondary,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }

    if (showGoogleDialog) {
        GoogleAuthMockDialog(
            onDismiss = { showGoogleDialog = false },
            onSuccess = { gUsername, gAvatar ->
                showGoogleDialog = false
                isLoading = true
                errorMessage = null
                scope.launch(Dispatchers.IO) {
                    try {
                        val response = RetrofitClient.apiService.register(
                            RegisterRequest(gUsername, "GoogleUser123!", gAvatar)
                        )
                        RetrofitClient.saveToken(context, response.token)
                        ThemeManager.currentTheme = response.user.theme ?: "duolingo"
                        withContext(Dispatchers.Main) {
                            isLoading = false
                            onRegisterSuccess()
                        }
                    } catch (e: Exception) {
                        try {
                            val response = RetrofitClient.apiService.login(
                                LoginRequest(gUsername, "GoogleUser123!")
                            )
                            RetrofitClient.saveToken(context, response.token)
                            ThemeManager.currentTheme = response.user.theme ?: "duolingo"
                            withContext(Dispatchers.Main) {
                                isLoading = false
                                onRegisterSuccess()
                            }
                        } catch (err: Exception) {
                            withContext(Dispatchers.Main) {
                                isLoading = false
                                errorMessage = "Google authentication failed"
                            }
                        }
                    }
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GoogleAuthMockDialog(
    onDismiss: () -> Unit,
    onSuccess: (String, String) -> Unit
) {
    var emailOrName by remember { mutableStateOf("") }
    var selectedAvatar by remember { mutableStateOf("avatar_owl") }

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
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Sign in with Google",
                    style = TextStyle(
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold
                    ),
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                Text(
                    text = "Numera wants to use google.com to sign in.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    textAlign = TextAlign.Center
                )

                OutlinedTextField(
                    value = emailOrName,
                    onValueChange = { emailOrName = it },
                    label = { Text("Google Name or Email") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                Text(
                    text = "Select Avatar",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    AVATAR_MAP.forEach { (avatarKey, avatarLabel) ->
                        val isSelected = selectedAvatar == avatarKey
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else Color.Transparent)
                                .border(
                                    2.dp,
                                    if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outline,
                                    CircleShape
                                )
                                .clickable { selectedAvatar = avatarKey },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = avatarLabel.split(" ")[0],
                                fontSize = 24.sp
                            )
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    DuoButton(
                        text = "Continue",
                        onClick = {
                            if (emailOrName.isNotBlank()) {
                                // Extract alphanumeric username from email or name
                                val cleanedName = emailOrName.split("@")[0].filter { it.isLetterOrDigit() }
                                val googleUser = if (cleanedName.length < 3) "GoogleUser_${System.currentTimeMillis() % 1000}" else cleanedName
                                onSuccess(googleUser, selectedAvatar)
                            }
                        },
                        modifier = Modifier.width(120.dp),
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}
