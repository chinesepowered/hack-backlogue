package com.backlogue.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

/**
 * Cover art is almost always square-cornered, so the chrome around it carries
 * the softness. Radii step in a clear 4dp rhythm so nested cards never look
 * accidentally mismatched.
 */
object BacklogueShapes {
    val chip = RoundedCornerShape(999.dp)
    val cover = RoundedCornerShape(8.dp)
    val card = RoundedCornerShape(16.dp)
    val sheet = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    val dialog = RoundedCornerShape(24.dp)
}

internal val MaterialShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),
    small = RoundedCornerShape(8.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(28.dp),
)
