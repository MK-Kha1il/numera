package com.example.numera.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.scale
import androidx.compose.ui.semantics.Role
import com.example.numera.haptic.HapticManager
import com.example.numera.motion.MotionManager
import com.example.numera.sound.SoundManager
import com.example.numera.theme.AnimDuration
import com.example.numera.theme.Motion
import com.example.numera.theme.MotionEasing
import com.example.numera.theme.MotionTokens

/**
 * The unified tap-feedback layer.
 *
 * The audit found 139 `.clickable {}` call sites but only a handful with any press response —
 * the "dead button" problem. [pressable] is the one drop-in replacement: it gives EVERY tap a
 * consistent, premium response — a subtle scale dip, a bounded ripple, a click sound and a
 * haptic — all routed through the app's motion tokens and silenced automatically when the user
 * (or the OS) has asked to reduce motion.
 *
 * Usage is a 1:1 swap for `.clickable`:
 * ```
 *   Modifier.clip(shape).clickable { open() }          // dead
 *   Modifier.clip(shape).pressable { open() }           // alive, consistent
 *   Modifier.pressable(feedback = PressFeedback.Medium) { confirm() }  // weightier action
 * ```
 *
 * Two knobs, kept intentionally orthogonal:
 *  - [PressFeedback] controls *importance* (which sound + haptic fire).
 *  - `pressScale` controls *size* (how much a surface dips) — a big card barely flinches,
 *    a small icon dips more so the touch reads.
 */
enum class PressFeedback {
    /** Visual + ripple only — for high-frequency or already-noisy contexts (e.g. keyboards). */
    Silent,

    /** Default. A soft tick — list rows, cards, tiles, chips, nav. */
    Light,

    /** A firmer click — primary buttons, confirmations, mode launches. */
    Medium,

    /** A success-weight pulse — claims, commits, "do it" moments below celebration tier. */
    Strong;

    /** Fire the sound + haptic for this weight. No-op for [Silent]. */
    fun emit() {
        when (this) {
            Silent -> {}
            Light -> { SoundManager.playClick(); HapticManager.playSoft() }
            Medium -> { SoundManager.playClick(); HapticManager.playMedium() }
            Strong -> { SoundManager.playClick(); HapticManager.playSuccess() }
        }
    }
}

/**
 * Celebration hierarchy (Phase 9) — the single entry point for "something good happened", so
 * every feature celebrates at a consistent, *reserved* intensity instead of hand-rolling its own
 * sound+haptic combo. Reserve the loud tiers: [Epic] is for rank promotions / legendary unlocks /
 * season completion only. Pair with the matching visual at the call site (e.g. `Motion.rewardEnter`
 * + `VictoryParticles` for the big ones). Honours the audio/haptic toggles in their managers.
 */
enum class CelebrationTier {
    Tiny,    // a correct tap, a small positive
    Small,   // a claim, a minor reward
    Medium,  // level complete, mastery-up
    Large,   // a notable achievement
    Epic;    // rank promotion, legendary unlock, season complete

    fun fire() {
        when (this) {
            Tiny -> { SoundManager.playClick(); HapticManager.playSoft() }
            Small -> { SoundManager.playRewardClaim(); HapticManager.playSuccess() }
            Medium -> { SoundManager.playLevelUp(); HapticManager.playSuccess() }
            Large -> { SoundManager.playLevelUp(); HapticManager.playMajorReward() }
            Epic -> { SoundManager.playLevelUp(); HapticManager.playMajorReward() }
        }
    }
}

/**
 * Drop-in [androidx.compose.foundation.clickable] with the app's unified press response.
 *
 * @param enabled when false, no scale/sound/haptic and the click is inert (matches `clickable`).
 * @param feedback sound + haptic weight (see [PressFeedback]).
 * @param pressScale dip target while held; default suits cards/rows. Pass
 *        [MotionTokens.pressScaleMedium]/[MotionTokens.pressScaleSmall] for buttons/icons.
 * @param indication whether to draw the Material ripple (kept on by default; turn off for
 *        surfaces that supply their own strong pressed visual, like depth buttons).
 */
fun Modifier.pressable(
    enabled: Boolean = true,
    feedback: PressFeedback = PressFeedback.Light,
    pressScale: Float = MotionTokens.pressScaleLarge,
    indication: Boolean = true,
    role: Role? = Role.Button,
    onClickLabel: String? = null,
    onClick: () -> Unit,
): Modifier = composed {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val animate = !MotionManager.reduceMotion
    val target = if (pressed && enabled && animate) pressScale else 1f
    val scale by animateFloatAsState(
        targetValue = target,
        animationSpec = Motion.pressSpring(),
        label = "pressableScale",
    )
    this
        .scale(scale)
        .clickable(
            interactionSource = interaction,
            indication = if (indication) ripple() else null,
            enabled = enabled,
            role = role,
            onClickLabel = onClickLabel,
        ) {
            feedback.emit()
            onClick()
        }
}

/**
 * Press-scale only, for surfaces that already own their press state (e.g. answer tiles that
 * also track selected/correct). Apply where a full [pressable] would fight existing gesture
 * handling. Honours reduce-motion.
 */
fun Modifier.pressScale(
    pressed: Boolean,
    pressScale: Float = MotionTokens.pressScaleMedium,
): Modifier = composed {
    val animate = !MotionManager.reduceMotion
    val scale by animateFloatAsState(
        targetValue = if (pressed && animate) pressScale else 1f,
        animationSpec = Motion.pressSpring(),
        label = "pressScale",
    )
    this.scale(scale)
}

/**
 * A value that animates toward [target] for counter / tally reveals (scores, ratings, coins,
 * XP). Returns the in-flight integer to render. Counts instantly under reduce-motion.
 *
 * To make it actually *count* (rather than snap on first frame), seed the caller's target at
 * the old value and bump it after composition:
 * ```
 *   var shown by remember { mutableIntStateOf(oldRating) }
 *   LaunchedEffect(Unit) { shown = newRating }
 *   Text("${animatedInt(shown)}")
 * ```
 */
@Composable
fun animatedInt(target: Int, durationMillis: Int = AnimDuration.xslow): Int =
    animateIntAsState(
        targetValue = target,
        animationSpec = if (MotionManager.reduceMotion) snap() else tween(durationMillis, easing = MotionEasing.standard),
        label = "animatedInt",
    ).value
