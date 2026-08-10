package com.snag.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable

/**
 * Snag's own tokens ride alongside Material 3 rather than replacing it: the
 * Material scheme keeps stock components (sheets, snackbars, the RevenueCat
 * paywall) looking native, while [SnagTheme.colors] carries the parts of the
 * design Material has no slot for — five status hues, and an accent that is
 * deliberately not the primary colour of most components.
 */
object SnagTheme {
    val colors: SnagColors
        @Composable @ReadOnlyComposable get() = LocalSnagColors.current
}

@Composable
fun SnagTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colors = if (darkTheme) SnagDarkColors else SnagLightColors

    val materialScheme = if (darkTheme) {
        darkColorScheme(
            primary = colors.accent,
            onPrimary = colors.textOnAccent,
            secondary = colors.playing,
            onSecondary = colors.textOnAccent,
            tertiary = colors.wishlist,
            background = colors.background,
            onBackground = colors.textPrimary,
            surface = colors.surface,
            onSurface = colors.textPrimary,
            surfaceVariant = colors.surfaceElevated,
            onSurfaceVariant = colors.textSecondary,
            outline = colors.outline,
            outlineVariant = colors.outlineStrong,
            scrim = colors.scrim,
        )
    } else {
        lightColorScheme(
            primary = colors.accent,
            onPrimary = colors.textOnAccent,
            secondary = colors.playing,
            onSecondary = colors.textOnAccent,
            tertiary = colors.wishlist,
            background = colors.background,
            onBackground = colors.textPrimary,
            surface = colors.surface,
            onSurface = colors.textPrimary,
            surfaceVariant = colors.surfaceElevated,
            onSurfaceVariant = colors.textSecondary,
            outline = colors.outline,
            outlineVariant = colors.outlineStrong,
            scrim = colors.scrim,
        )
    }

    CompositionLocalProvider(LocalSnagColors provides colors) {
        MaterialTheme(
            colorScheme = materialScheme,
            typography = MaterialTypography,
            shapes = MaterialShapes,
            content = content,
        )
    }
}
