package com.backlogue.app.ui.theme

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/**
 * Backlogue's palette.
 *
 * The design brief for a backlog app is unusual: the thing we are visualising
 * is, for most players, a source of low-grade guilt. Every "pile of shame" joke
 * is a user telling us their tracker made them feel bad. So the palette is
 * built to read as a *collection* rather than a debt — dark, gallery-like, and
 * deferential to cover art, which is the most beautiful thing on the screen and
 * which we did not draw.
 *
 * Nothing here is red-for-overdue. The only urgent colour in the system is the
 * accent, and it is reserved for the one genuinely happy action: adding a game.
 */
@Immutable
data class BacklogueColors(
    val background: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val surfaceSunken: Color,
    val outline: Color,
    val outlineStrong: Color,

    val textPrimary: Color,
    val textSecondary: Color,
    val textTertiary: Color,
    val textOnAccent: Color,

    /** Reserved for the add action and nothing else. */
    val accent: Color,
    val accentPressed: Color,
    val accentSubtle: Color,

    /** Achievement, ratings, the year-in-review. */
    val gold: Color,

    val wishlist: Color,
    val backlog: Color,
    val playing: Color,
    val beaten: Color,
    val bounced: Color,

    val scrim: Color,
    val isDark: Boolean,
)

/**
 * Dark is the default, not an alternate. Players browse at night, on OLED, and
 * key art sings against near-black in a way it never does against white.
 * The violet cast keeps it from reading as a terminal.
 */
val BacklogueDarkColors = BacklogueColors(
    background = Color(0xFF0B0910),
    surface = Color(0xFF15121C),
    surfaceElevated = Color(0xFF1F1B29),
    surfaceSunken = Color(0xFF060509),
    outline = Color(0xFF2E2839),
    outlineStrong = Color(0xFF453D54),

    textPrimary = Color(0xFFF5F2FA),
    textSecondary = Color(0xFFA79FB8),
    textTertiary = Color(0xFF6E667F),
    textOnAccent = Color(0xFF1A0A06),

    accent = Color(0xFFFF5A3C),
    accentPressed = Color(0xFFE04A2E),
    accentSubtle = Color(0x33FF5A3C),

    gold = Color(0xFFFFD166),

    wishlist = Color(0xFF8B7BF7),
    backlog = Color(0xFF5AA9E6),
    playing = Color(0xFF3DD68C),
    beaten = Color(0xFFFFD166),
    bounced = Color(0xFF7E7589),

    scrim = Color(0xCC060509),
    isDark = true,
)

val BacklogueLightColors = BacklogueColors(
    background = Color(0xFFFBF9FD),
    surface = Color(0xFFFFFFFF),
    surfaceElevated = Color(0xFFF3F0F7),
    surfaceSunken = Color(0xFFEFEBF4),
    outline = Color(0xFFE2DDEA),
    outlineStrong = Color(0xFFC9C2D4),

    textPrimary = Color(0xFF16121D),
    textSecondary = Color(0xFF5C5468),
    textTertiary = Color(0xFF8E8699),
    textOnAccent = Color(0xFFFFFFFF),

    accent = Color(0xFFE8462A),
    accentPressed = Color(0xFFC93A21),
    accentSubtle = Color(0x1FE8462A),

    gold = Color(0xFFB8860B),

    wishlist = Color(0xFF6A55E0),
    backlog = Color(0xFF2C7FBF),
    playing = Color(0xFF149E63),
    beaten = Color(0xFFB8860B),
    bounced = Color(0xFF7E7589),

    scrim = Color(0x9916121D),
    isDark = false,
)

val LocalBacklogueColors = staticCompositionLocalOf { BacklogueDarkColors }
