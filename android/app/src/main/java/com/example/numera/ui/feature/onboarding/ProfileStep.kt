package com.example.numera.ui.feature.onboarding

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import com.example.numera.data.network.OnboardingAvatarItem
import com.example.numera.data.network.OnboardingCatalogItem
import com.example.numera.sound.SoundManager
import com.example.numera.theme.CornerRadius
import com.example.numera.theme.Spacing

// Fallback so the avatar picker is never empty even if the catalog fetch is still in flight.
private val DEFAULT_AVATARS = listOf(
    OnboardingAvatarItem("avatar_owl", "🦉"),
    OnboardingAvatarItem("avatar_fox", "🦊"),
    OnboardingAvatarItem("avatar_koala", "🐨"),
    OnboardingAvatarItem("avatar_panda", "🐼"),
)

/**
 * Phase 3 — learner profile (display name, avatar, style, interests). Creates ownership: the space
 * should feel personal *before* the first exercise. All fields are optional.
 */
@Composable
fun ProfileStep(
    stepIndex: Int,
    totalSteps: Int,
    initialName: String,
    avatars: List<OnboardingAvatarItem>,
    styles: List<OnboardingCatalogItem>,
    interests: List<OnboardingCatalogItem>,
    onBack: () -> Unit,
    onContinue: (displayName: String, avatar: String?, style: String?, interests: List<String>) -> Unit,
) {
    var name by remember { mutableStateOf(initialName) }
    val avatarList = avatars.ifEmpty { DEFAULT_AVATARS }
    var avatar by remember { mutableStateOf(avatarList.first().key) }
    var style by remember { mutableStateOf<String?>(null) }
    val pickedInterests = remember { mutableStateListOf<String>() }

    OnboardingScaffold(
        stepIndex = stepIndex,
        totalSteps = totalSteps,
        title = "Make it yours",
        subtitle = "A few touches so this feels like your learning space.",
        primaryLabel = "Continue",
        nextPreview = "A quick, smart placement",
        onBack = onBack,
        onPrimary = { onContinue(name.trim().ifBlank { initialName }, avatar, style, pickedInterests.toList()) },
    ) {
        OutlinedTextField(
            value = name,
            onValueChange = { name = it.take(30) },
            label = { Text("Display name") },
            singleLine = true,
            shape = RoundedCornerShape(CornerRadius.m),
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(Spacing.l))
        SectionLabel("Choose an avatar")
        SelectGrid(items = avatarList, columns = 4) { item, cellMod ->
            SelectableCard(
                selected = avatar == item.key,
                onClick = { SoundManager.playClick(); avatar = item.key },
                modifier = cellMod,
            ) {
                Text(text = item.emoji, style = MaterialTheme.typography.headlineMedium)
            }
        }

        if (styles.isNotEmpty()) {
            Spacer(Modifier.height(Spacing.l))
            SectionLabel("Your style")
            SelectGrid(items = styles, columns = 1) { item, cellMod ->
                SelectableCard(
                    selected = style == item.key,
                    onClick = { SoundManager.playClick(); style = if (style == item.key) null else item.key },
                    modifier = cellMod,
                ) {
                    Text(text = "${item.emoji}  ${item.label}", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    item.blurb?.let {
                        Text(text = it, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }

        if (interests.isNotEmpty()) {
            Spacer(Modifier.height(Spacing.l))
            SectionLabel("Interests (optional)")
            SelectGrid(items = interests, columns = 2) { item, cellMod ->
                val isSel = pickedInterests.contains(item.key)
                SelectableCard(
                    selected = isSel,
                    onClick = {
                        SoundManager.playClick()
                        if (isSel) pickedInterests.remove(item.key) else pickedInterests.add(item.key)
                    },
                    modifier = cellMod,
                ) {
                    Text(text = "${item.emoji}  ${item.label}", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
                }
            }
        }
    }
}

@Composable
internal fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onBackground,
    )
    Spacer(Modifier.height(Spacing.s))
}
