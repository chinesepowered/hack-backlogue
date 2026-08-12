package com.backlogue.app.ui.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.ui.unit.IntOffset

/**
 * Motion is doing real work in this app, not decoration.
 *
 * The single most important moment in Backlogue is the half-second after a user
 * shares a link into it: they are still inside YouTube, they tapped share, and
 * they need to believe the game landed safely before they go back to watching.
 * [BacklogueLand] is that reassurance — a spring with just enough overshoot to read
 * as "caught", tuned to settle before the user's thumb leaves the screen.
 */
object BacklogueMotion {

    /** Standard easing for anything entering the screen. */
    val EnterEasing: Easing = CubicBezierEasing(0.05f, 0.7f, 0.1f, 1.0f)

    /** Anything leaving should get out of the way faster than it arrived. */
    val ExitEasing: Easing = CubicBezierEasing(0.3f, 0.0f, 0.8f, 0.15f)

    /** Cross-fades, tint changes, anything that does not move. */
    val StandardEasing: Easing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)

    const val DurationFast = 150
    const val DurationMedium = 300
    const val DurationSlow = 450

    /** The "caught it" spring. Overshoots once, settles quickly. */
    fun <T> land(): FiniteAnimationSpec<T> = spring(
        dampingRatio = 0.62f,
        stiffness = Spring.StiffnessMediumLow,
    )

    /** For status changes — confident, no bounce. A pile is not a trampoline. */
    fun <T> settle(): FiniteAnimationSpec<T> = spring(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMedium,
    )

    fun <T> enter(durationMillis: Int = DurationMedium): FiniteAnimationSpec<T> =
        tween(durationMillis = durationMillis, easing = EnterEasing)

    fun <T> exit(durationMillis: Int = DurationFast): FiniteAnimationSpec<T> =
        tween(durationMillis = durationMillis, easing = ExitEasing)

    /** Offset spring specialised so list reordering does not wobble. */
    fun reorder(): FiniteAnimationSpec<IntOffset> = spring(
        dampingRatio = Spring.DampingRatioNoBouncy,
        stiffness = Spring.StiffnessMediumLow,
    )
}
