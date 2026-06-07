package com.example.numera.ui.feature.settings

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Canvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.scale
import android.content.Context
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import com.example.numera.data.network.*
import com.example.numera.sound.SoundManager
import com.example.numera.theme.*
import com.example.numera.ui.components.NumeraIcon
import com.example.numera.ui.components.NumeraIconType
import com.example.numera.ui.components.LocalToast
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    user: User?,
    onLogout: () -> Unit,
    onRefreshProfile: () -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val toast = LocalToast.current
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("numera_prefs", android.content.Context.MODE_PRIVATE) }

    // State variables
    var searchQuery by remember { mutableStateOf("") }

    // Dialog states
    var showUsernameDialog by remember { mutableStateOf(false) }
    var showEmailDialog by remember { mutableStateOf(false) }
    var showSessionsDialog by remember { mutableStateOf(false) }
    var showLogsDialog by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    // Placeholders modal states
    var showFaqDialog by remember { mutableStateOf(false) }
    var showContactDialog by remember { mutableStateOf(false) }
    var showBugDialog by remember { mutableStateOf(false) }
    var showFeatureDialog by remember { mutableStateOf(false) }
    var showGuidelinesDialog by remember { mutableStateOf(false) }
    var showPolicyDialog by remember { mutableStateOf(false) }
    var showTermsDialog by remember { mutableStateOf(false) }
    var showCreditsDialog by remember { mutableStateOf(false) }

    // Tooltips
    var showHapticsTooltip by remember { mutableStateOf(!prefs.getBoolean("tooltip_haptics_dismissed", false)) }
    var showMotionTooltip by remember { mutableStateOf(!prefs.getBoolean("tooltip_motion_dismissed", false)) }

    // Settings preferences
    var isDarkMode by remember { mutableStateOf(ThemeManager.isDarkMode) }
    var isHapticEnabled by remember { mutableStateOf(com.example.numera.haptic.HapticManager.isEnabled) }
    var isSoundMuted by remember { mutableStateOf(SoundManager.isMuted) }
    var soundVolume by remember { mutableStateOf(SoundManager.volume) }

    var timerEnabled by remember { mutableStateOf(prefs.getBoolean("timer_enabled", true)) }
    var autoClearWhiteboard by remember { mutableStateOf(prefs.getBoolean("auto_clear_whiteboard", true)) }
    var animationIntensity by remember { mutableStateOf(prefs.getFloat("animation_intensity", 1.0f)) }
    var fontSizeScale by remember { mutableStateOf(prefs.getFloat("font_size_scale", 1.0f)) }
    var reducedMotion by remember { mutableStateOf(prefs.getBoolean("reduced_motion", false)) }

    // Granular notification alerts
    var notifDaily by remember { mutableStateOf(prefs.getBoolean("notif_daily_puzzle", true)) }
    var notifStreak by remember { mutableStateOf(prefs.getBoolean("notif_streak", true)) }
    var notifFriends by remember { mutableStateOf(prefs.getBoolean("notif_friends", true)) }
    var notifAchievements by remember { mutableStateOf(prefs.getBoolean("notif_achievements", true)) }
    var notifRanked by remember { mutableStateOf(prefs.getBoolean("notif_ranked", true)) }
    var notifEvents by remember { mutableStateOf(prefs.getBoolean("notif_events", true)) }
    var notifSeasonal by remember { mutableStateOf(prefs.getBoolean("notif_seasonal", true)) }

    // Server-backed lifecycle email reminders (streak / win-back / weekly recap). Loaded below.
    var emailReminders by remember { mutableStateOf(true) }

    // Privacy & Security backend state
    var profilePrivate by remember { mutableStateOf((user?.profile_private ?: 0) == 1) }
    var telemetryEnabled by remember { mutableStateOf((user?.telemetry_enabled ?: 1) == 1) }

    LaunchedEffect(user) {
        if (user != null) {
            profilePrivate = (user.profile_private ?: 0) == 1
            telemetryEnabled = (user.telemetry_enabled ?: 1) == 1
        }
    }

    // Load server notification prefs once, and report the device timezone offset so lifecycle
    // reminders land at a sensible local time (the funnel uses tz_offset_minutes for quiet hours).
    LaunchedEffect(Unit) {
        try {
            val token = RetrofitClient.authToken ?: ""
            if (token.isNotEmpty()) {
                val p = withContext(Dispatchers.IO) { RetrofitClient.apiService.getNotificationPreferences(token) }
                emailReminders = p.email_lifecycle == 1
                val tz = java.util.TimeZone.getDefault().getOffset(System.currentTimeMillis()) / 60000
                withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.updateNotificationPreferences(
                        token, NotificationPreferencesUpdateRequest(tz_offset_minutes = tz)
                    )
                }
            }
        } catch (e: Exception) {
            Log.e("Settings", "Failed loading notification prefs: ${e.message}")
        }
    }

    val saveToggle = { key: String, value: Boolean ->
        prefs.edit().putBoolean(key, value).apply()
    }

    // Structures to hold settings items to allow clean real-time search filtering
    data class SearchableSettingItem(
        val title: String,
        val description: String,
        val tags: String,
        val content: @Composable () -> Unit
    )

    val allSettingsList = remember(isDarkMode, isHapticEnabled, isSoundMuted, soundVolume, timerEnabled, autoClearWhiteboard, animationIntensity, fontSizeScale, reducedMotion, notifDaily, notifStreak, notifFriends, notifAchievements, notifRanked, notifEvents, notifSeasonal, profilePrivate, telemetryEnabled, user) {
        listOf(
            SearchableSettingItem("Dark Mode", "Switch to obsidian dark aesthetic", "theme appearance night mode colors black") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Dark Mode", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Switch to obsidian dark aesthetic", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = ThemeManager.isDarkMode,
                        onCheckedChange = {
                            ThemeManager.isDarkMode = it
                            isDarkMode = it
                            ThemeManager.saveSettings(context)
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Haptic Feedback", "Tactile sensations on taps and events", "vibration physical touch feelings haptics feedback") {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Haptic Feedback", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                if (showHapticsTooltip) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), RoundedCornerShape(Spacing.xs))
                                            .clickable {
                                                prefs.edit().putBoolean("tooltip_haptics_dismissed", true).apply()
                                                showHapticsTooltip = false
                                            }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text("Info ?", fontSize = 9.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                            Text("Tactile sensations on taps and events", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Switch(
                            checked = com.example.numera.haptic.HapticManager.isEnabled,
                            onCheckedChange = {
                                com.example.numera.haptic.HapticManager.isEnabled = it
                                isHapticEnabled = it
                                com.example.numera.haptic.HapticManager.saveSettings(context)
                                if (it) com.example.numera.haptic.HapticManager.playSoft()
                            }
                        )
                    }
                    if (showHapticsTooltip) {
                        Spacer(modifier = Modifier.height(Spacing.xs))
                        Text(
                            text = "💡 Tactical vibration confirms correct actions, achievements, and clicks. Tap 'Info ?' to dismiss.",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = Spacing.xs)
                        )
                    }
                }
            },
            SearchableSettingItem("Sound Effects", "Toggle audio feedback for correctness and buttons", "volume audio sound correct click mute") {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Sound Effects", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Toggle audio feedback", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Switch(
                            checked = !isSoundMuted,
                            onCheckedChange = { checked ->
                                isSoundMuted = !checked
                                SoundManager.isMuted = !checked
                                SoundManager.saveSettings(context)
                                com.example.numera.haptic.HapticManager.playSoft()
                            }
                        )
                    }
                    if (!isSoundMuted) {
                        Spacer(modifier = Modifier.height(Spacing.s))
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.xs),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Vol: ${(soundVolume * 100).toInt()}%", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), modifier = Modifier.width(55.dp))
                            Slider(
                                value = soundVolume,
                                onValueChange = {
                                    soundVolume = it
                                    SoundManager.volume = it
                                },
                                onValueChangeFinished = {
                                    SoundManager.saveSettings(context)
                                },
                                valueRange = 0f..1f,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            },
            SearchableSettingItem("Timer Preferences", "Toggle game round countdown timers", "time countdown limit speed gameplay") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Level Countdown Timer", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Add time constraints to your math problems", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = timerEnabled,
                        onCheckedChange = {
                            timerEnabled = it
                            saveToggle("timer_enabled", it)
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Whiteboard Clear", "Automatically clear the whiteboard after submitting answers", "scratchpad board clean drawing canvas gameplay") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Auto-clear Whiteboard", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Reset drawing pad when answer is evaluated", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = autoClearWhiteboard,
                        onCheckedChange = {
                            autoClearWhiteboard = it
                            saveToggle("auto_clear_whiteboard", it)
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Reduced Motion", "Reduce visual animation intensities and transit speeds", "motion animations performance speed graphics") {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("Reduced Motion", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                if (showMotionTooltip) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), RoundedCornerShape(Spacing.xs))
                                            .clickable {
                                                prefs.edit().putBoolean("tooltip_motion_dismissed", true).apply()
                                                showMotionTooltip = false
                                            }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text("Info ?", fontSize = 9.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                            Text("Disable high intensity layout animations", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Switch(
                            checked = reducedMotion,
                            onCheckedChange = {
                                reducedMotion = it
                                saveToggle("reduced_motion", it)
                                com.example.numera.haptic.HapticManager.playSoft()
                            }
                        )
                    }
                    if (showMotionTooltip) {
                        Spacer(modifier = Modifier.height(Spacing.xs))
                        Text(
                            text = "💡 Reduced motion simplifies tab transition fades and eliminates particle bursts. Tap 'Info ?' to dismiss.",
                            fontSize = 10.sp,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier.padding(horizontal = Spacing.xs)
                        )
                    }
                }
            },
            SearchableSettingItem("Animation Intensity", "Adjust graphics scale and particle density", "graphics detail effects quality animations speed") {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Animation Intensity", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Control graphics rendering scales: ${(animationIntensity * 100).toInt()}%", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(6.dp))
                    Slider(
                        value = animationIntensity,
                        onValueChange = {
                            animationIntensity = it
                        },
                        onValueChangeFinished = {
                            prefs.edit().putFloat("animation_intensity", animationIntensity).apply()
                        },
                        valueRange = 0f..1.2f,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            SearchableSettingItem("Text Font Size", "Scale screen typography readability sizes", "accessibility read display letters typography") {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Font Readability Size", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    val fontLabel = when {
                        fontSizeScale <= 0.85f -> "Small (Accessibility)"
                        fontSizeScale <= 1.05f -> "Normal (Default)"
                        fontSizeScale <= 1.25f -> "Large (Readability)"
                        else -> "Extra Large"
                    }
                    Text("Scale: $fontLabel", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(6.dp))
                    Slider(
                        value = fontSizeScale,
                        onValueChange = {
                            fontSizeScale = it
                        },
                        onValueChangeFinished = {
                            prefs.edit().putFloat("font_size_scale", fontSizeScale).apply()
                        },
                        valueRange = 0.8f..1.4f,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            SearchableSettingItem("Change Username", "Change your game display name", "profile account edit name tags details") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showUsernameDialog = true }.padding(vertical = Spacing.xs),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Change Username", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Current: ${user?.username ?: "Not set"}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            },
            SearchableSettingItem("Email Management", "Configure registered recovery email address", "account recovery security email details") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showEmailDialog = true }.padding(vertical = Spacing.xs),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Email Management", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Linked: ${if (user?.email.isNullOrBlank()) "None" else user?.email}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            },
            SearchableSettingItem("Active Sessions", "Audit devices connected to your credentials", "security logs logins active sessions device list") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showSessionsDialog = true }.padding(vertical = Spacing.xs),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Active Sessions", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Audit and revoke connected devices", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            },
            SearchableSettingItem("Security Activity Log", "Review login logs and credential events", "audit telemetry logins history security list") {
                Row(
                    modifier = Modifier.fillMaxWidth().clickable { showLogsDialog = true }.padding(vertical = Spacing.xs),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Security Activity Log", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Glance audit list of account actions", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
            },
            SearchableSettingItem("Private Profile Settings", "Toggle statistics privacy filters", "privacy visibility friends public search rankings") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Private Profile", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Hide ELO ratings and Relics from others", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = profilePrivate,
                        onCheckedChange = { checked ->
                            profilePrivate = checked
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.updatePrivacy(token, PrivacyUpdateRequest(telemetryEnabled, checked))
                                    withContext(Dispatchers.Main) { onRefreshProfile() }
                                } catch(e: Exception) {
                                    Log.e("Settings", "Failed updating privacy: ${e.message}")
                                }
                            }
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Telemetry Preferences", "Control anonymous diagnostic reporting updates", "privacy logs telemetry data diagnostics server tracking") {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Telemetry Diagnostics", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Share anonymous crashes for app stability", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(
                        checked = telemetryEnabled,
                        onCheckedChange = { checked ->
                            telemetryEnabled = checked
                            scope.launch(Dispatchers.IO) {
                                try {
                                    val token = RetrofitClient.authToken ?: ""
                                    RetrofitClient.apiService.updatePrivacy(token, PrivacyUpdateRequest(checked, profilePrivate))
                                    withContext(Dispatchers.Main) { onRefreshProfile() }
                                } catch(e: Exception) {
                                    Log.e("Settings", "Failed updating telemetry: ${e.message}")
                                }
                            }
                            com.example.numera.haptic.HapticManager.playSoft()
                        }
                    )
                }
            },
            SearchableSettingItem("Daily Puzzle Reminders", "Get notified when daily challenge is ready", "alerts daily quest schedule timers notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Daily Puzzle Reminders", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Never miss your daily math challenges", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifDaily, onCheckedChange = { notifDaily = it; saveToggle("notif_daily_puzzle", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Streak Danger Reminders", "Alerts when streak is close to resetting", "alerts streaks fire consistency notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Streak Reminders", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Alerts when your consistency streak is in danger", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifStreak, onCheckedChange = { notifStreak = it; saveToggle("notif_streak", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Social & Friend Alerts", "Notify on friend duels and status connections", "alerts social request duel notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Friend Activity", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Duels invitations and connection alerts", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifFriends, onCheckedChange = { notifFriends = it; saveToggle("notif_friends", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Achievement Completed Alerts", "Trigger badge unlock confirmations", "alerts badges accomplishments notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Achievement Alerts", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Trigger banner on badge unlocks", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifAchievements, onCheckedChange = { notifAchievements = it; saveToggle("notif_achievements", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Ranked Rating Changes", "Alerts when ELO placement status shifts", "alerts ranked rating arena matches notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Ranked Activity", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Rating ELO adjustments and league promotions", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifRanked, onCheckedChange = { notifRanked = it; saveToggle("notif_ranked", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Live Quests Event Notifications", "Alerts when seasonal global events begin", "alerts quests events seasons notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Event Notifications", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Live updates for global quests challenges", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifEvents, onCheckedChange = { notifEvents = it; saveToggle("notif_events", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            },
            SearchableSettingItem("Seasonal Content Alerts", "Notify on shop content inventory additions", "alerts calendar themes shop updates notifications") {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Seasonal Updates", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                        Text("Shop inventory catalog adjustments", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    Switch(checked = notifSeasonal, onCheckedChange = { notifSeasonal = it; saveToggle("notif_seasonal", it); com.example.numera.haptic.HapticManager.playSoft() })
                }
            }
        )
    }

    // Filter items based on search query
    val filteredSettings = remember(searchQuery, allSettingsList) {
        if (searchQuery.isBlank()) {
            emptyList()
        } else {
            val q = searchQuery.lowercase()
            allSettingsList.filter { it.title.lowercase().contains(q) || it.description.lowercase().contains(q) || it.tags.contains(q) }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = Spacing.xxl)
    ) {
        // Toolbar Bar Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = Spacing.s, bottom = Spacing.m, start = Spacing.m, end = Spacing.l),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = {
                com.example.numera.haptic.HapticManager.playSoft()
                onBack()
            }) {
                com.example.numera.ui.components.NumeraIcon(
                    type = com.example.numera.ui.components.NumeraIconType.Back,
                    tint = MaterialTheme.colorScheme.onBackground
                )
            }
            Spacer(modifier = Modifier.width(Spacing.xs))
            Text(
                text = "Settings",
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        // Real-Time Search Bar TextField
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = Spacing.l, vertical = 6.dp)
        ) {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Search settings (e.g. haptics, privacy)...", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)) },
                leadingIcon = {
                    com.example.numera.ui.components.NumeraIcon(
                        type = com.example.numera.ui.components.NumeraIconType.Search,
                        tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        modifier = Modifier.size(20.dp)
                    )
                },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = ""; com.example.numera.haptic.HapticManager.playSoft() }) {
                            com.example.numera.ui.components.NumeraIcon(
                                type = com.example.numera.ui.components.NumeraIconType.Close,
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                modifier = Modifier.size(IconSize.s)
                            )
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.5f),
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                ),
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (searchQuery.isNotBlank()) {
            // Search Results Mode
            Text(
                text = "Search Results (${filteredSettings.size})",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(horizontal = Spacing.xl, vertical = Spacing.s)
            )
            if (filteredSettings.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(Spacing.xxl),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No settings matched your search query.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 13.sp)
                }
            } else {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.l, vertical = 6.dp),
                    shape = RoundedCornerShape(CornerRadius.l),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier.padding(Spacing.l),
                        verticalArrangement = Arrangement.spacedBy(Spacing.l)
                    ) {
                        filteredSettings.forEachIndexed { index, item ->
                            item.content()
                            if (index < filteredSettings.size - 1) {
                                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                            }
                        }
                    }
                }
            }
        } else {
            // Grouped Category Mode

            // 1. QUICK PREFERENCES ROW (At the top)
            Column(modifier = Modifier.padding(horizontal = Spacing.l, vertical = 6.dp)) {
                Text(
                    text = "Quick Preferences",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    modifier = Modifier.padding(start = Spacing.s, bottom = 6.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.s)
                ) {
                    // Dark Mode compact
                    Card(
                        modifier = Modifier.weight(1f).height(65.dp),
                        shape = RoundedCornerShape(CornerRadius.m),
                        onClick = {
                            ThemeManager.isDarkMode = !ThemeManager.isDarkMode
                            ThemeManager.saveSettings(context)
                            com.example.numera.haptic.HapticManager.playSoft()
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = if (ThemeManager.isDarkMode) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(6.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = androidx.compose.material.icons.Icons.Default.Brightness4,
                                contentDescription = "Dark Mode Icon",
                                tint = if (ThemeManager.isDarkMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Text("Dark Mode", fontWeight = FontWeight.Bold, fontSize = 10.sp)
                        }
                    }

                    // Haptics compact — use isHapticEnabled (Compose state) for colors/tint so
                    // the card recomposes immediately on click without needing another button press.
                    Card(
                        modifier = Modifier.weight(1f).height(65.dp),
                        shape = RoundedCornerShape(CornerRadius.m),
                        onClick = {
                            val nextVal = !com.example.numera.haptic.HapticManager.isEnabled
                            com.example.numera.haptic.HapticManager.isEnabled = nextVal
                            isHapticEnabled = nextVal           // ← trigger recompose
                            com.example.numera.haptic.HapticManager.saveSettings(context)
                            if (nextVal) com.example.numera.haptic.HapticManager.playSoft()
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isHapticEnabled) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(6.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = androidx.compose.material.icons.Icons.Default.Vibration,
                                contentDescription = "Haptics Icon",
                                tint = if (isHapticEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Text("Haptic Feed", fontWeight = FontWeight.Bold, fontSize = 10.sp)
                        }
                    }

                    // Quick Mute compact
                    Card(
                        modifier = Modifier.weight(1f).height(65.dp),
                        shape = RoundedCornerShape(CornerRadius.m),
                        onClick = {
                            val nextMute = !isSoundMuted
                            isSoundMuted = nextMute
                            SoundManager.isMuted = nextMute
                            SoundManager.saveSettings(context)
                            com.example.numera.haptic.HapticManager.playSoft()
                        },
                        colors = CardDefaults.cardColors(
                            containerColor = if (!isSoundMuted) MaterialTheme.colorScheme.primary.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant
                        )
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(6.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            androidx.compose.material3.Icon(
                                imageVector = if (isSoundMuted) androidx.compose.material.icons.Icons.Default.VolumeOff else androidx.compose.material.icons.Icons.Default.VolumeUp,
                                contentDescription = "Mute Icon",
                                tint = if (!isSoundMuted) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(20.dp)
                            )
                            Text("App Audio", fontWeight = FontWeight.Bold, fontSize = 10.sp)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(Spacing.m))

            // 2. ACCOUNT SECTION CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.l, vertical = 6.dp),
                shape = RoundedCornerShape(CornerRadius.l),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Profile,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(Spacing.s))
                        Text("Account settings", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))
                    
                    // Username Change Row
                    allSettingsList.first { it.title == "Change Username" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Email Row
                    allSettingsList.first { it.title == "Email Management" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Password Changing block
                    var showPasswordSection by remember { mutableStateOf(false) }
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showPasswordSection = !showPasswordSection }.padding(vertical = Spacing.xs),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Password Management", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Update your account credentials", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(
                            imageVector = if (showPasswordSection) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                    AnimatedVisibility(visible = showPasswordSection) {
                        var oldPassword by remember { mutableStateOf("") }
                        var newPassword by remember { mutableStateOf("") }
                        var confirmPassword by remember { mutableStateOf("") }
                        var pwStatusMsg by remember { mutableStateOf<String?>(null) }
                        var pwIsError by remember { mutableStateOf(false) }
                        var pwIsLoading by remember { mutableStateOf(false) }

                        Column(modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) {
                            OutlinedTextField(
                                value = oldPassword,
                                onValueChange = { oldPassword = it },
                                label = { Text("Current Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(CornerRadius.m)
                            )
                            Spacer(modifier = Modifier.height(Spacing.s))
                            OutlinedTextField(
                                value = newPassword,
                                onValueChange = { newPassword = it },
                                label = { Text("New Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(CornerRadius.m)
                            )
                            Spacer(modifier = Modifier.height(Spacing.s))
                            OutlinedTextField(
                                value = confirmPassword,
                                onValueChange = { confirmPassword = it },
                                label = { Text("Confirm New Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(CornerRadius.m)
                            )
                            pwStatusMsg?.let { msg ->
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = msg,
                                    color = if (pwIsError) WrongRed else CorrectGreen,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Button(
                                onClick = {
                                    if (oldPassword.isBlank() || newPassword.isBlank()) {
                                        pwStatusMsg = "Please fill in all fields"
                                        pwIsError = true
                                        return@Button
                                    }
                                    if (newPassword != confirmPassword) {
                                        pwStatusMsg = "Passwords do not match"
                                        pwIsError = true
                                        return@Button
                                    }
                                    if (newPassword.length < 10) {
                                        pwStatusMsg = "Password must be at least 10 characters"
                                        pwIsError = true
                                        return@Button
                                    }
                                    pwIsLoading = true
                                    pwStatusMsg = null
                                    scope.launch(Dispatchers.IO) {
                                        try {
                                            val token = RetrofitClient.authToken ?: ""
                                            val res = RetrofitClient.apiService.changePassword(
                                                token, PasswordChangeRequest(oldPassword, newPassword)
                                            )
                                            withContext(Dispatchers.Main) {
                                                pwIsLoading = false
                                                if (res.success) {
                                                    pwStatusMsg = "✅ Password updated successfully!"
                                                    pwIsError = false
                                                    oldPassword = ""
                                                    newPassword = ""
                                                    confirmPassword = ""
                                                } else {
                                                    pwStatusMsg = res.message
                                                    pwIsError = true
                                                }
                                            }
                                        } catch (e: Exception) {
                                            withContext(Dispatchers.Main) {
                                                pwIsLoading = false
                                                pwStatusMsg = "Failed: ${e.message}"
                                                pwIsError = true
                                            }
                                        }
                                    }
                                },
                                enabled = !pwIsLoading,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(CornerRadius.m)
                            ) {
                                if (pwIsLoading) {
                                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                                } else {
                                    Text("Update Password", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Two-Factor Authentication (TOTP) enrollment / management
                    TwoFactorSettingsSection()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Connected active sessions device lists
                    allSettingsList.first { it.title == "Active Sessions" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Audit Security Logs Row
                    allSettingsList.first { it.title == "Security Activity Log" }.content()
                }
            }

            Spacer(modifier = Modifier.height(Spacing.m))

            // 3. GAMEPLAY SECTION CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.l, vertical = 6.dp),
                shape = RoundedCornerShape(CornerRadius.l),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Arena,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(Spacing.s))
                        Text("Gameplay options", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Sound Toggle inside card
                    allSettingsList.first { it.title == "Sound Effects" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Countdown timer
                    allSettingsList.first { it.title == "Timer Preferences" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Auto clear whiteboard
                    allSettingsList.first { it.title == "Whiteboard Clear" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Accessibility scale sizes
                    allSettingsList.first { it.title == "Text Font Size" }.content()
                }
            }

            Spacer(modifier = Modifier.height(Spacing.m))

            // 4. APPEARANCE SECTION CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.l, vertical = 6.dp),
                shape = RoundedCornerShape(CornerRadius.l),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Settings,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp),
                            animate = false
                        )
                        Spacer(modifier = Modifier.width(Spacing.s))
                        Text("Appearance & themes", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Accent theme equip blocks
                    Text("🎨 Equipped Theme Accent", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text("Unlock and choose your math identity", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(Spacing.xs))
                    
                    val themesList = listOf(
                        "duolingo" to "Duo",
                        "neon_eclipse" to "Eclipse",
                        "emerald_abyss" to "Emerald",
                        "crimson_nebula" to "Crimson",
                        "cyberpunk" to "Cyber",
                        "aurora" to "Aurora",
                        "ocean" to "Ocean",
                        "sunset" to "Sunset",
                        "midnight" to "Midnight"
                    )
                    val chunked = themesList.chunked(5)
                    chunked.forEach { rowItems ->
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
                        ) {
                            rowItems.forEach { (themeKey, themeLabel) ->
                                val isActive = user?.theme == themeKey || (user?.theme == null && themeKey == "duolingo")
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(CornerRadius.s))
                                        .background(if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant)
                                        .clickable {
                                            scope.launch(Dispatchers.IO) {
                                                try {
                                                    val token = RetrofitClient.authToken ?: ""
                                                    val res = RetrofitClient.apiService.equipItem(token, EquipRequest("theme", themeKey))
                                                    if (res.success) {
                                                        withContext(Dispatchers.Main) {
                                                            ThemeManager.currentTheme = themeKey
                                                            ThemeManager.saveSettings(context)
                                                            toast.success("Theme applied")
                                                            onRefreshProfile()
                                                        }
                                                    }
                                                } catch (e: Exception) {
                                                    Log.e("Settings", "Theme equip err: ${e.message}")
                                                }
                                            }
                                        }
                                        .padding(vertical = Spacing.s),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = themeLabel,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isActive) Color.White else MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                            repeat(5 - rowItems.size) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Dark Mode Toggle
                    allSettingsList.first { it.title == "Dark Mode" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Reduced motion accessibilities
                    allSettingsList.first { it.title == "Reduced Motion" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Animation Intensity
                    allSettingsList.first { it.title == "Animation Intensity" }.content()
                }
            }

            Spacer(modifier = Modifier.height(Spacing.m))

            // 5. NOTIFICATIONS CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.l, vertical = 6.dp),
                shape = RoundedCornerShape(CornerRadius.l),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Notification,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(Spacing.s))
                        Text("Granular notification control", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Server-backed email reminders (streak / win-back / weekly recap). Unlike the
                    // local toggles below, this syncs to the account so reminders honor it everywhere.
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Email Reminders", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Streak, win-back & weekly recap emails (synced to your account)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Switch(
                            checked = emailReminders,
                            onCheckedChange = { checked ->
                                emailReminders = checked
                                scope.launch(Dispatchers.IO) {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        RetrofitClient.apiService.updateNotificationPreferences(
                                            token, NotificationPreferencesUpdateRequest(email_lifecycle = if (checked) 1 else 0)
                                        )
                                    } catch (e: Exception) {
                                        Log.e("Settings", "Failed updating email reminders: ${e.message}")
                                    }
                                }
                                com.example.numera.haptic.HapticManager.playSoft()
                            }
                        )
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Daily Puzzle Reminders" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Streak Danger Reminders" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Social & Friend Alerts" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Achievement Completed Alerts" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Ranked Rating Changes" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Live Quests Event Notifications" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Seasonal Content Alerts" }.content()
                }
            }

            Spacer(modifier = Modifier.height(Spacing.m))

            // 6. PRIVACY & SECURITY CARD
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.l, vertical = 6.dp),
                shape = RoundedCornerShape(CornerRadius.l),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Lock,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(Spacing.s))
                        Text("Privacy & Security controls", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Private Profile Settings" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    allSettingsList.first { it.title == "Telemetry Preferences" }.content()
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Data Export Button
                    var exportLoading by remember { mutableStateOf(false) }
                    var exportFinished by remember { mutableStateOf(false) }
                    var exportFilePath by remember { mutableStateOf("") }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Export Account Data", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Download GDPR-compliant JSON profile history", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Button(
                            onClick = {
                                exportLoading = true
                                exportFinished = false
                                scope.launch(Dispatchers.IO) {
                                    try {
                                        val token = RetrofitClient.authToken ?: ""
                                        val responseBody = RetrofitClient.apiService.exportData(token)
                                        val jsonString = responseBody.string()
                                        
                                        // Save to app external storage folder for maximum safety
                                        val file = java.io.File(context.getExternalFilesDir(null), "numera_user_data.json")
                                        file.writeText(jsonString)
                                        
                                        withContext(Dispatchers.Main) {
                                            exportLoading = false
                                            exportFinished = true
                                            exportFilePath = file.absolutePath
                                            com.example.numera.haptic.HapticManager.playSuccess()
                                        }
                                    } catch(e: Exception) {
                                        Log.e("Settings", "Failed data export: ${e.message}")
                                        withContext(Dispatchers.Main) { exportLoading = false }
                                    }
                                }
                            },
                            enabled = !exportLoading,
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            if (exportLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(IconSize.s), color = Color.White, strokeWidth = 2.dp)
                            } else {
                                Text("Export", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                    if (exportFinished) {
                        Spacer(modifier = Modifier.height(Spacing.xs))
                        Text(
                            text = "✅ File exported to: $exportFilePath",
                            fontSize = 10.sp,
                            color = CorrectGreen,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Account deletion card row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Delete Account", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.error)
                            Text("Permanently wipe profile data (Irreversible)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Button(
                            onClick = { showDeleteDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text("Delete", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(Spacing.m))

            // 7. HELP & SUPPORT CARD (Visual Placeholders)
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.l, vertical = 6.dp),
                shape = RoundedCornerShape(CornerRadius.l),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            ) {
                Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Warning,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(Spacing.s))
                        Text("Help & Support", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // FAQ row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showFaqDialog = true }.padding(vertical = Spacing.xs),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Frequently Asked Questions", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Find answers to common problem queries", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Contact row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showContactDialog = true }.padding(vertical = Spacing.xs),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Contact Customer Support", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Submit feedback direct to creators", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Report bug row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showBugDialog = true }.padding(vertical = Spacing.xs),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Report a System Bug", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Log mathematical template formatting errors", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Feature Request row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showFeatureDialog = true }.padding(vertical = Spacing.xs),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Request New Feature", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Suggest topics, avatars, or banner options", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.15f))

                    // Community Guidelines row
                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showGuidelinesDialog = true }.padding(vertical = Spacing.xs),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Community Guidelines", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("Code of conduct for duels and social chats", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        }
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(Spacing.m))

            // 8. ABOUT CARD (At the bottom, low visual priority)
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = Spacing.l, vertical = 6.dp),
                shape = RoundedCornerShape(CornerRadius.l),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
            ) {
                Column(modifier = Modifier.padding(Spacing.l), verticalArrangement = Arrangement.spacedBy(Spacing.m)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.example.numera.ui.components.NumeraIcon(
                            type = com.example.numera.ui.components.NumeraIconType.Learn,
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(Spacing.s))
                        Text("About Numera", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Client Version", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        Text("v1.2.0 (Build 3020)", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showPolicyDialog = true },
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Privacy Policy", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(IconSize.s), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showTermsDialog = true },
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Terms of Service", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(IconSize.s), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.1f))

                    Row(
                        modifier = Modifier.fillMaxWidth().clickable { showCreditsDialog = true },
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Credits & Contributors", fontSize = 12.sp, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
                        Icon(imageVector = Icons.Default.KeyboardArrowRight, contentDescription = null, modifier = Modifier.size(IconSize.s), tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                }
            }

            Spacer(modifier = Modifier.height(Spacing.l))

            // Logout Button
            Button(
                onClick = onLogout,
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                shape = RoundedCornerShape(CornerRadius.m),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = Spacing.l)
                    .height(50.dp)
            ) {
                Text("Log Out Account", color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }

    // ==========================================
    // DIALOGS & POPUPS DEFINITIONS
    // ==========================================

    // 1. Username Dialog
    if (showUsernameDialog) {
        var newUsername by remember { mutableStateOf(user?.username ?: "") }
        var statusMsg by remember { mutableStateOf<String?>(null) }
        var isError by remember { mutableStateOf(false) }
        var isLoading by remember { mutableStateOf(false) }

        AlertDialog(
            onDismissRequest = { if (!isLoading) showUsernameDialog = false },
            title = { Text("Change Username", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                    Text("Your username is how friends identify you in duels.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    OutlinedTextField(
                        value = newUsername,
                        onValueChange = { newUsername = it },
                        label = { Text("New Username") },
                        singleLine = true,
                        shape = RoundedCornerShape(CornerRadius.m),
                        modifier = Modifier.fillMaxWidth()
                    )
                    statusMsg?.let { msg ->
                        Text(msg, color = if (isError) WrongRed else CorrectGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newUsername.trim().length < 3) {
                            statusMsg = "Username must be at least 3 characters"
                            isError = true
                            return@Button
                        }
                        isLoading = true
                        statusMsg = null
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                val res = RetrofitClient.apiService.changeUsername(token, ChangeUsernameRequest(newUsername))
                                withContext(Dispatchers.Main) {
                                    isLoading = false
                                    if (res.success) {
                                        statusMsg = "Username updated!"
                                        isError = false
                                        onRefreshProfile()
                                        scope.launch {
                                            kotlinx.coroutines.delay(800)
                                            showUsernameDialog = false
                                        }
                                    } else {
                                        statusMsg = res.message
                                        isError = true
                                    }
                                }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) {
                                    isLoading = false
                                    statusMsg = "Failed: ${e.message}"
                                    isError = true
                                }
                            }
                        }
                    },
                    enabled = !isLoading,
                    shape = RoundedCornerShape(CornerRadius.m)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Save")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showUsernameDialog = false }, enabled = !isLoading) {
                    Text("Cancel")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 2. Email Management Dialog
    if (showEmailDialog) {
        var showVerifyInput by remember { mutableStateOf(false) }
        var emailText by remember { mutableStateOf(user?.email ?: "") }
        var codeText by remember { mutableStateOf("") }
        var statusMsg by remember { mutableStateOf<String?>(null) }
        var isError by remember { mutableStateOf(false) }
        var isLoading by remember { mutableStateOf(false) }
        var sentCode by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { if (!isLoading) showEmailDialog = false },
            title = { Text("Email Management", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                    if (!showVerifyInput) {
                        Text("Link your email address to recover your account.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        OutlinedTextField(
                            value = emailText,
                            onValueChange = { emailText = it },
                            label = { Text("Email Address") },
                            singleLine = true,
                            shape = RoundedCornerShape(CornerRadius.m),
                            modifier = Modifier.fillMaxWidth()
                        )
                    } else {
                        Text("Enter the 6-digit verification code sent to $emailText.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        if (sentCode.isNotEmpty()) {
                            Text("Local Sandbox Code: $sentCode", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.primary)
                        }
                        OutlinedTextField(
                            value = codeText,
                            onValueChange = { codeText = it },
                            label = { Text("Verification Code") },
                            singleLine = true,
                            shape = RoundedCornerShape(CornerRadius.m),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    statusMsg?.let { msg ->
                        Text(msg, color = if (isError) WrongRed else CorrectGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isLoading = true
                        statusMsg = null
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                if (!showVerifyInput) {
                                    val res = RetrofitClient.apiService.requestEmailChange(token, RequestEmailChangePayload(emailText))
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        if (res.success) {
                                            statusMsg = "Code sent! Check console / display below."
                                            isError = false
                                            sentCode = res.code ?: ""
                                            showVerifyInput = true
                                        } else {
                                            statusMsg = res.message
                                            isError = true
                                        }
                                    }
                                } else {
                                    val res = RetrofitClient.apiService.verifyEmailChange(token, VerifyEmailChangePayload(codeText))
                                    withContext(Dispatchers.Main) {
                                        isLoading = false
                                        if (res.success) {
                                            statusMsg = "Email address linked!"
                                            isError = false
                                            onRefreshProfile()
                                            scope.launch {
                                                kotlinx.coroutines.delay(800)
                                                showEmailDialog = false
                                            }
                                        } else {
                                            statusMsg = res.message
                                            isError = true
                                        }
                                    }
                                }
                            } catch (e: Exception) {
                                withContext(Dispatchers.Main) {
                                    isLoading = false
                                    statusMsg = "Failed: ${e.message}"
                                    isError = true
                                }
                            }
                        }
                    },
                    enabled = !isLoading,
                    shape = RoundedCornerShape(CornerRadius.m)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text(if (showVerifyInput) "Verify" else "Request Code")
                    }
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        if (showVerifyInput) {
                            showVerifyInput = false
                            statusMsg = null
                        } else {
                            showEmailDialog = false
                        }
                    },
                    enabled = !isLoading
                ) {
                    Text("Cancel")
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 3. Sessions Dialog
    if (showSessionsDialog) {
        var sessionsList by remember { mutableStateOf<List<UserSessionDto>>(emptyList()) }
        var loadingSessions by remember { mutableStateOf(false) }

        val fetchSessions = {
            loadingSessions = true
            scope.launch(Dispatchers.IO) {
                try {
                    val token = RetrofitClient.authToken ?: ""
                    val list = RetrofitClient.apiService.getSessions(token)
                    withContext(Dispatchers.Main) {
                        sessionsList = list
                        loadingSessions = false
                    }
                } catch(e: Exception) {
                    Log.e("Settings", "Failed fetching sessions: ${e.message}")
                    withContext(Dispatchers.Main) { loadingSessions = false }
                }
            }
        }

        LaunchedEffect(Unit) {
            fetchSessions()
        }

        AlertDialog(
            onDismissRequest = { showSessionsDialog = false },
            title = { Text("Active Connected Devices", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth().height(260.dp),
                    verticalArrangement = Arrangement.spacedBy(Spacing.s)
                ) {
                    Text("Revoking a session will immediately force that device to log out.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(Spacing.xs))
                    if (loadingSessions) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(Spacing.s)
                        ) {
                            sessionsList.forEach { session ->
                                val deviceName = if (session.user_agent.contains("Mozilla")) "Web Browser" else "Mobile App"
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text(deviceName, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                                if (session.is_current) {
                                                    Spacer(modifier = Modifier.width(6.dp))
                                                    Box(
                                                        modifier = Modifier
                                                            .background(CorrectGreen, RoundedCornerShape(Spacing.xs))
                                                            .padding(horizontal = Spacing.xs, vertical = 2.dp)
                                                    ) {
                                                        Text("CURRENT", color = Color.White, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                                    }
                                                }
                                            }
                                            Text("IP: ${session.ip_address}", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                            val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.US)
                                                .format(java.util.Date(session.created_at * 1000))
                                            Text("Connected: $dateStr", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        }
                                        if (!session.is_current) {
                                            Button(
                                                onClick = {
                                                    scope.launch(Dispatchers.IO) {
                                                        try {
                                                            val token = RetrofitClient.authToken ?: ""
                                                            val res = RetrofitClient.apiService.revokeSession(token, RevokeSessionRequest(session.id))
                                                            if (res.success) {
                                                                fetchSessions()
                                                            }
                                                        } catch(e: Exception) {
                                                            Log.e("Settings", "Failed revoke: ${e.message}")
                                                        }
                                                    }
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                                shape = RoundedCornerShape(CornerRadius.s),
                                                modifier = Modifier.height(28.dp).padding(horizontal = 2.dp)
                                            ) {
                                                Text("Revoke", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showSessionsDialog = false }) { Text("Close") }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 4. Security Log Dialog
    if (showLogsDialog) {
        var logsList by remember { mutableStateOf<List<SecurityLogDto>>(emptyList()) }
        var loadingLogs by remember { mutableStateOf(false) }

        LaunchedEffect(Unit) {
            loadingLogs = true
            scope.launch(Dispatchers.IO) {
                try {
                    val token = RetrofitClient.authToken ?: ""
                    val list = RetrofitClient.apiService.getSecurityLogs(token)
                    withContext(Dispatchers.Main) {
                        logsList = list
                        loadingLogs = false
                    }
                } catch(e: Exception) {
                    Log.e("Settings", "Failed security logs: ${e.message}")
                    withContext(Dispatchers.Main) { loadingLogs = false }
                }
            }
        }

        AlertDialog(
            onDismissRequest = { showLogsDialog = false },
            title = { Text("Security Activity Log", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.primary) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth().height(280.dp),
                    verticalArrangement = Arrangement.spacedBy(Spacing.s)
                ) {
                    Text("A transparent record of security events related to your profile credentials.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(Spacing.xs))
                    if (loadingLogs) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else {
                        Column(
                            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(Spacing.s)
                        ) {
                            if (logsList.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text("No security events logged yet.", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), fontSize = 12.sp)
                                }
                            } else {
                                logsList.forEach { log ->
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.8f))
                                    ) {
                                        Column(modifier = Modifier.padding(10.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                val eventLabel = log.event_type.replace("_", " ").uppercase()
                                                Text(eventLabel, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                                                val logDate = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.US)
                                                    .format(java.util.Date(log.timestamp * 1000))
                                                Text(logDate, fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                            }
                                            Spacer(modifier = Modifier.height(Spacing.xs))
                                            Text(log.details, fontSize = 11.sp)
                                            Text("Origin IP: ${log.ip_address}", fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLogsDialog = false }) { Text("Close") }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 5. Delete Account Dialog
    if (showDeleteDialog) {
        var deleteIsLoading by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { if (!deleteIsLoading) showDeleteDialog = false },
            title = { Text("Permanently Delete Account?", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.error) },
            text = {
                Text(
                    text = "This action is irreversible. All your level progression, rating ELO, relics, coin balance, and custom banners will be permanently wiped.",
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        deleteIsLoading = true
                        scope.launch(Dispatchers.IO) {
                            try {
                                val token = RetrofitClient.authToken ?: ""
                                val res = RetrofitClient.apiService.deleteAccount(token)
                                withContext(Dispatchers.Main) {
                                    deleteIsLoading = false
                                    if (res.success) {
                                        showDeleteDialog = false
                                        onLogout()
                                    }
                                }
                            } catch(e: Exception) {
                                Log.e("Settings", "Failed deletion: ${e.message}")
                                withContext(Dispatchers.Main) { deleteIsLoading = false }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    enabled = !deleteIsLoading,
                    shape = RoundedCornerShape(CornerRadius.m)
                ) {
                    if (deleteIsLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text("Delete Everything", color = Color.White)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }, enabled = !deleteIsLoading) { Text("Keep Account") }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // 6. FAQ dialog (Placeholders)
    if (showFaqDialog) {
        AlertDialog(
            onDismissRequest = { showFaqDialog = false },
            title = { Text("Frequently Asked Questions", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Column {
                        Text("How do I gain rank ELO?", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Gain ELO rating by winning ranked duels against other players or bots in the Arena tab.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    HorizontalDivider()
                    Column {
                        Text("What are Streak Shields?", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Streak Shields automatically protect your daily consistency streak if you fail to log in and complete a level. Purchase them in the Shop.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                    HorizontalDivider()
                    Column {
                        Text("How are Relics unlocked?", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        Text("Milestone Relics are unlocked automatically in your Profile when you maintain active daily consistency paths for 3, 7, 30, and 100 days.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showFaqDialog = false }) { Text("Dismiss") }
            }
        )
    }

    // 7. Contact Support dialog (Placeholders)
    if (showContactDialog) {
        var subject by remember { mutableStateOf("") }
        var bodyMsg by remember { mutableStateOf("") }
        var submitted by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { showContactDialog = false },
            title = { Text("Contact Support", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                    if (!submitted) {
                        Text("Submit a ticket directly to our development team.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        OutlinedTextField(
                            value = subject,
                            onValueChange = { subject = it },
                            label = { Text("Subject") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = bodyMsg,
                            onValueChange = { bodyMsg = it },
                            label = { Text("Message details") },
                            modifier = Modifier.fillMaxWidth().height(100.dp)
                        )
                    } else {
                        Text("Thank you! Your support ticket has been logged. We will review your query.", fontSize = 13.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (submitted) {
                        showContactDialog = false
                    } else {
                        submitted = true
                        com.example.numera.haptic.HapticManager.playSuccess()
                    }
                }) {
                    Text(if (submitted) "Close" else "Submit ticket")
                }
            },
            dismissButton = {
                if (!submitted) {
                    TextButton(onClick = { showContactDialog = false }) { Text("Cancel") }
                }
            }
        )
    }

    // 8. Report Bug dialog (Placeholders)
    if (showBugDialog) {
        var bugTitle by remember { mutableStateOf("") }
        var bugDesc by remember { mutableStateOf("") }
        var submitted by remember { mutableStateOf(false) }
        AlertDialog(
            onDismissRequest = { showBugDialog = false },
            title = { Text("Report a Bug", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(Spacing.s)) {
                    if (!submitted) {
                        Text("Let us know about errors in math generation, UI glitches, or freezes.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        OutlinedTextField(
                            value = bugTitle,
                            onValueChange = { bugTitle = it },
                            label = { Text("Bug Title") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = bugDesc,
                            onValueChange = { bugDesc = it },
                            label = { Text("Steps to Reproduce") },
                            modifier = Modifier.fillMaxWidth().height(100.dp)
                        )
                    } else {
                        Text("Bug report submitted! Thank you for helping us improve Numera.", fontSize = 13.sp, color = CorrectGreen, fontWeight = FontWeight.Bold)
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (submitted) {
                        showBugDialog = false
                    } else {
                        submitted = true
                        com.example.numera.haptic.HapticManager.playSuccess()
                    }
                }) {
                    Text(if (submitted) "Close" else "Submit report")
                }
            },
            dismissButton = {
                if (!submitted) {
                    TextButton(onClick = { showBugDialog = false }) { Text("Cancel") }
                }
            }
        )
    }

    // 9. Feature Request (Placeholders)
    if (showFeatureDialog) {
        AlertDialog(
            onDismissRequest = { showFeatureDialog = false },
            title = { Text("Request Feature", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Vote for features or suggest new ones. Comming soon!", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("📐 LaTeX Math Canvas Renderer", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("▲ 85 Votes", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(modifier = Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("🛡️ SRS Decay Alert Notification", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            Text("▲ 42 Votes", fontSize = 11.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showFeatureDialog = false }) { Text("Close") }
            }
        )
    }

    // 10. Guidelines (Placeholders)
    if (showGuidelinesDialog) {
        AlertDialog(
            onDismissRequest = { showGuidelinesDialog = false },
            title = { Text("Community Guidelines", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(Spacing.s)
                ) {
                    Text("1. Academic Honesty: Use scratchpads for solving, do not use external equation solvers during ranked Arena matches.", fontSize = 12.sp)
                    Text("2. Respectful Behavior: Maintain clean profiles. Verbal toxicity in lobbies will result in chat bans.", fontSize = 12.sp)
                    Text("3. Growth Mindset: Support learning friends and celebrate their relic milestones.", fontSize = 12.sp)
                }
            },
            confirmButton = {
                TextButton(onClick = { showGuidelinesDialog = false }) { Text("Close") }
            }
        )
    }

    // 11. Privacy Policy
    if (showPolicyDialog) {
        AlertDialog(
            onDismissRequest = { showPolicyDialog = false },
            title = { Text("Privacy Policy", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    text = "Numera is built to foster math learning. We value user privacy. Profile ratings, solved stats, and connections are stored in the local sandbox database. Telemetry parameters track performance metrics anonymously. No credentials are sold or shared with external analytics brokers.",
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                TextButton(onClick = { showPolicyDialog = false }) { Text("Close") }
            }
        )
    }

    // 12. Terms of Service
    if (showTermsDialog) {
        AlertDialog(
            onDismissRequest = { showTermsDialog = false },
            title = { Text("Terms of Service", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    text = "By accessing Numera Quest, you agree to engage in fair academic play. Cheating, bot usage, or manipulation of coins balance is strictly forbidden. The game client and server assets are owned by the Advanced Agentic Coding team, provided for peer learning, sandbox exploration, and mathematical progression.",
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                TextButton(onClick = { showTermsDialog = false }) { Text("Close") }
            }
        )
    }

    // 13. Credits
    if (showCreditsDialog) {
        AlertDialog(
            onDismissRequest = { showCreditsDialog = false },
            title = { Text("Credits & Contributors", fontWeight = FontWeight.Bold) },
            text = {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Numera Quest Math Client", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Text("Developed by Antigravity and the AAC AI Coding Team.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Special Thanks:", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text("• Duolingo, for layout gamification inspiration.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Text("• Jetpack Compose & Material 3, enabling sleek layouts.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                    Text("• Our dedicated Beta Testers, pointing out bugs.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
            },
            confirmButton = {
                TextButton(onClick = { showCreditsDialog = false }) { Text("Dismiss") }
            }
        )
    }
}
