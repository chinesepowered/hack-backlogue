package com.chinesepowered.backlogue.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.material3.Text
import com.chinesepowered.backlogue.domain.model.BacklogStatus
import com.chinesepowered.backlogue.ui.theme.BacklogueMotion
import com.chinesepowered.backlogue.ui.theme.BacklogueShapes
import com.chinesepowered.backlogue.ui.theme.BacklogueTheme
import com.chinesepowered.backlogue.ui.theme.BacklogueType

/** The hue that represents a status everywhere in the app. */
@Composable
fun BacklogStatus.color(): Color = with(BacklogueTheme.colors) {
    when (this@color) {
        BacklogStatus.Wishlist -> wishlist
        BacklogStatus.Backlog -> backlog
        BacklogStatus.Playing -> playing
        BacklogStatus.Beaten -> beaten
        BacklogStatus.Bounced -> bounced
    }
}

/**
 * A status as a small coloured pill.
 *
 * Colour alone never carries the meaning — the label is always present — because
 * two of the five statuses sit close enough in hue for a red-green colourblind
 * player to confuse them, and this chip is the primary way status is read.
 */
@Composable
fun StatusChip(
    status: BacklogStatus,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    onClick: (() -> Unit)? = null,
) {
    val colors = BacklogueTheme.colors
    val statusColor = status.color()

    val background by animateColorAsState(
        targetValue = if (selected) statusColor.copy(alpha = 0.18f) else Color.Transparent,
        animationSpec = BacklogueMotion.settle(),
        label = "chipBackground",
    )
    val contentColor by animateColorAsState(
        targetValue = if (selected) statusColor else colors.textSecondary,
        animationSpec = BacklogueMotion.settle(),
        label = "chipContent",
    )

    Row(
        modifier = modifier
            .clip(BacklogueShapes.chip)
            .background(background)
            .border(
                BorderStroke(1.dp, if (selected) statusColor.copy(alpha = 0.5f) else colors.outline),
                BacklogueShapes.chip,
            )
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            modifier = Modifier
                .size(7.dp)
                .clip(BacklogueShapes.chip)
                .background(statusColor),
        )
        Text(
            text = status.displayName,
            style = BacklogueType.label,
            color = contentColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}
