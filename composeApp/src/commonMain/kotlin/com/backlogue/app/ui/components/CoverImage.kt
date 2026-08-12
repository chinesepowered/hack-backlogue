package com.backlogue.app.ui.components

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.compose.AsyncImagePainter
import com.backlogue.app.ui.theme.BacklogueMotion
import com.backlogue.app.ui.theme.BacklogueShapes
import com.backlogue.app.ui.theme.BacklogueTheme
import com.backlogue.app.ui.theme.BacklogueType

/**
 * Cover art with a placeholder that is worth looking at.
 *
 * Cover art is the whole visual identity of this app, and a meaningful slice of
 * it will always be missing — IGDB has no art for unannounced games, and a
 * newly added title renders before its image has downloaded. A grey box in
 * those slots would undo the gallery feeling everywhere else, so the fallback
 * is a tinted panel carrying the game's initials, derived from the title so it
 * is stable across launches rather than random.
 */
@Composable
fun CoverImage(
    url: String?,
    title: String,
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = BacklogueShapes.cover,
) {
    val colors = BacklogueTheme.colors
    var state by remember(url) { mutableStateOf<AsyncImagePainter.State>(AsyncImagePainter.State.Empty) }

    Box(
        modifier = modifier
            .clip(shape)
            .background(colors.surfaceElevated),
    ) {
        if (url != null) {
            AsyncImage(
                model = url,
                contentDescription = title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
                onState = { state = it },
            )
        }

        val showFallback = url == null ||
            state is AsyncImagePainter.State.Error ||
            state is AsyncImagePainter.State.Loading ||
            state is AsyncImagePainter.State.Empty

        Crossfade(
            targetState = showFallback,
            animationSpec = BacklogueMotion.enter(BacklogueMotion.DurationMedium),
            label = "coverFallback",
        ) { fallback ->
            if (fallback) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(title.coverGradient()),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = title.initials(),
                        style = BacklogueType.title,
                        color = colors.textPrimary.copy(alpha = 0.75f),
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        overflow = TextOverflow.Clip,
                        modifier = Modifier.padding(4.dp),
                    )
                }
            }
        }
    }
}

/** First letters of the first two significant words: "Hollow Knight" -> "HK". */
private fun String.initials(): String = split(' ', ':', '-')
    .filter { it.isNotBlank() && it.first().isLetterOrDigit() }
    .take(2)
    .joinToString("") { it.first().uppercase() }
    .ifBlank { "?" }

/**
 * A deterministic two-stop gradient per title. Hashing the name means the same
 * game always gets the same colour, so a pile of art-less games still reads as
 * a set of distinct objects rather than a column of identical placeholders.
 */
private fun String.coverGradient(): Brush {
    val hue = (hashCode().toLong() and 0xFFFFFF).toFloat() % 360f
    return Brush.linearGradient(
        listOf(
            hslColor(hue, 0.35f, 0.28f),
            hslColor((hue + 40f) % 360f, 0.40f, 0.16f),
        )
    )
}

private fun hslColor(hue: Float, saturation: Float, lightness: Float): androidx.compose.ui.graphics.Color {
    val c = (1f - kotlin.math.abs(2f * lightness - 1f)) * saturation
    val x = c * (1f - kotlin.math.abs((hue / 60f) % 2f - 1f))
    val m = lightness - c / 2f
    val (r, g, b) = when {
        hue < 60f -> Triple(c, x, 0f)
        hue < 120f -> Triple(x, c, 0f)
        hue < 180f -> Triple(0f, c, x)
        hue < 240f -> Triple(0f, x, c)
        hue < 300f -> Triple(x, 0f, c)
        else -> Triple(c, 0f, x)
    }
    return androidx.compose.ui.graphics.Color(r + m, g + m, b + m, 1f)
}
