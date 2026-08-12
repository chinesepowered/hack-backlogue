package com.backlogue.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.LineHeightStyle
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/**
 * A deliberately narrow type scale.
 *
 * Backlog apps drift toward dense, spreadsheet-like screens because there is
 * always one more piece of metadata to surface. Constraining the scale to a few
 * sizes forces those decisions into hierarchy rather than font size, and keeps
 * game titles — which vary wildly in length — from wrecking the rhythm.
 *
 * Tight tracking on the display sizes; loose on the small sizes where it aids
 * legibility over cover art.
 */
private val TrimLineHeight = LineHeightStyle(
    alignment = LineHeightStyle.Alignment.Center,
    trim = LineHeightStyle.Trim.None,
)

object BacklogueType {
    /** Screen titles and the year-in-review hero numbers. */
    val display = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Bold,
        fontSize = 34.sp,
        lineHeight = 38.sp,
        letterSpacing = (-0.02).em,
        lineHeightStyle = TrimLineHeight,
    )

    val title = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 26.sp,
        letterSpacing = (-0.01).em,
        lineHeightStyle = TrimLineHeight,
    )

    /** Game names in a list. The single most-used style in the app. */
    val gameTitle = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 20.sp,
        letterSpacing = (-0.005).em,
        lineHeightStyle = TrimLineHeight,
    )

    val body = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp,
        lineHeightStyle = TrimLineHeight,
    )

    /** Where you found it, when you added it, how long it took. */
    val meta = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 17.sp,
        letterSpacing = 0.005.em,
        lineHeightStyle = TrimLineHeight,
    )

    val label = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp,
        lineHeight = 16.sp,
        letterSpacing = 0.01.em,
        lineHeightStyle = TrimLineHeight,
    )

    /** Status chips and section headers. Small, uppercase, widely tracked. */
    val overline = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 11.sp,
        lineHeight = 14.sp,
        letterSpacing = 0.08.em,
        lineHeightStyle = TrimLineHeight,
    )
}

internal val MaterialTypography = Typography(
    displaySmall = BacklogueType.display,
    headlineMedium = BacklogueType.title,
    titleMedium = BacklogueType.gameTitle,
    bodyLarge = BacklogueType.body,
    bodyMedium = BacklogueType.meta,
    labelLarge = BacklogueType.label,
    labelSmall = BacklogueType.overline,
)
