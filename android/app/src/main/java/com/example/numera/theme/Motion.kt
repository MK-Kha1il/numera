package com.example.numera.theme

import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.SpringSpec
import androidx.compose.animation.core.TweenSpec
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke

/**
 * Motion system — the app-wide animation language.
 *
 * Durations live in [AnimDuration]; this file adds the *shape* of movement (easing) and
 * canned specs/transitions so screens stop hand-rolling `tween(300)` with default easing.
 * The rules:
 *  - **Entrances decelerate** ([MotionEasing.enter]) — content arrives fast and settles.
 *  - **Exits accelerate** ([MotionEasing.exit]) — content leaves quickly, without ceremony.
 *  - **On-screen moves use standard** ([MotionEasing.standard]) — selection, resize, reflow.
 *  - **Rewards overshoot** ([Motion.rewardSpring]) — celebration pops get a springy
 *    overshoot; everything informational stays calm.
 */
object MotionEasing {
    /** On-screen moves and shared-state changes (Material emphasized-standard curve). */
    val standard = CubicBezierEasing(0.2f, 0f, 0f, 1f)

    /** Entrances — decelerate into place. */
    val enter = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1f)

    /** Exits — accelerate away. */
    val exit = CubicBezierEasing(0.3f, 0f, 0.8f, 0.15f)
}

/**
 * Numeric motion constants — the *amounts* that go with [MotionEasing]'s shapes and
 * [AnimDuration]'s timings. Centralising these stops every press handler from inventing its
 * own scale (0.95 here, 0.97 there) and every entrance from picking a different slide distance.
 *
 * Press-scale is keyed to element SIZE, not importance: a big card barely flinches; a small
 * icon dips more so the touch reads. Haptic/sound weight (importance) lives separately in
 * `PressFeedback` — the two are intentionally orthogonal.
 */
object MotionTokens {
    /** Cards, list rows, large tiles — barely perceptible dip. */
    const val pressScaleLarge  = 0.98f
    /** Standard buttons, chips, action tiles. */
    const val pressScaleMedium = 0.96f
    /** Icon buttons & compact controls — needs a bigger dip to register on a small target. */
    const val pressScaleSmall  = 0.92f

    /** Disabled-press: no movement (used when `enabled == false`). */
    const val pressScaleNone   = 1.0f

    /** Entrance slide distance as a fraction of the element's own size (used as `it / N`). */
    const val slideDivisor = 12

    /** Reward/celebration overshoot peak (e.g. a pop that briefly grows past 1f). */
    const val rewardOvershoot = 1.08f
}

object Motion {
    /** Spec for on-screen moves: selection highlights, progress, reflow. */
    fun <T> standard(durationMillis: Int = AnimDuration.normal, delayMillis: Int = 0): TweenSpec<T> =
        tween(durationMillis, delayMillis, MotionEasing.standard)

    /** Spec for content arriving. */
    fun <T> enter(durationMillis: Int = AnimDuration.normal, delayMillis: Int = 0): TweenSpec<T> =
        tween(durationMillis, delayMillis, MotionEasing.enter)

    /** Spec for content leaving. */
    fun <T> exit(durationMillis: Int = AnimDuration.fast, delayMillis: Int = 0): TweenSpec<T> =
        tween(durationMillis, delayMillis, MotionEasing.exit)

    /** Springy overshoot for reward / celebration pops (unlocks, claims, level-ups). */
    fun <T> rewardSpring(): SpringSpec<T> =
        spring(dampingRatio = 0.55f, stiffness = Spring.StiffnessMediumLow)

    /**
     * Press-feedback spring — the single source of truth for tap-scale settle. Responsive
     * (snaps back fast) with just enough life to feel physical, not bouncy. Every tappable
     * surface in the app routes its press-scale through here via `Modifier.pressable`.
     */
    fun <T> pressSpring(): SpringSpec<T> =
        spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMediumLow)

    // ── Canned AnimatedVisibility transitions ────────────────────────────────

    /** Default content entrance: fade + small upward settle. */
    fun contentEnter(): EnterTransition =
        fadeIn(enter(AnimDuration.normal)) +
            slideInVertically(enter(AnimDuration.normal)) { it / 12 }

    /** Default content exit: quick fade, no movement. */
    fun contentExit(): ExitTransition = fadeOut(exit())

    /** Reward entrance: pop in with overshoot — reserved for earned moments. */
    fun rewardEnter(): EnterTransition =
        fadeIn(enter(AnimDuration.fast)) + scaleIn(rewardSpring(), initialScale = 0.6f)

    // ── Phase 4 primitives (docs/BrandIdentity.md §5) ────────────────────────
    // The named idioms of the competitive motion language. Specs only — the draw side of Trace/Link
    // is [drawTracedPath] below; Warm pairs the spring with a caller-side indigo→amber colour anim.

    /** **Trace** — geometry *draws itself* (the signature discovery idiom). Animate this 0→1
     *  progress and feed it to [drawTracedPath] to reveal a line/curve as if it's being constructed.
     *  Decelerates into place like an entrance. */
    fun traceSpec(durationMillis: Int = AnimDuration.slow): TweenSpec<Float> =
        tween(durationMillis, easing = MotionEasing.enter)

    /** **Warm** — the earned indigo→amber settle (mastery, rank-up, claim): a springy overshoot.
     *  Pair the scale with an `animateColor` from the active (indigo) tone to the earned (amber/gold)
     *  tone — cool becomes warm only when something is earned. */
    fun warmSpring(): SpringSpec<Float> =
        spring(dampingRatio = 0.55f, stiffness = Spring.StiffnessMediumLow)

    /** **Link** — a connecting line draws between two elements (the *aha* of connection). Use this
     *  progress with [drawTracedPath] to stroke the partial line; standard easing (an on-screen move). */
    fun linkSpec(durationMillis: Int = AnimDuration.normal): TweenSpec<Float> =
        tween(durationMillis, easing = MotionEasing.standard)
}

/**
 * Stroke [path] only up to [progress] (0..1) of its length — the draw side of [Motion.traceSpec] and
 * [Motion.linkSpec]. Reveals geometry as if it's being constructed (compass-and-straightedge), the
 * ownable alternative to a plain fade-in.
 */
fun DrawScope.drawTracedPath(
    path: Path,
    progress: Float,
    color: Color,
    strokeWidth: Float,
    cap: StrokeCap = StrokeCap.Round,
) {
    val measure = PathMeasure().apply { setPath(path, forceClosed = false) }
    val dst = Path()
    measure.getSegment(0f, measure.length * progress.coerceIn(0f, 1f), dst, startWithMoveTo = true)
    drawPath(dst, color, style = Stroke(width = strokeWidth, cap = cap))
}
