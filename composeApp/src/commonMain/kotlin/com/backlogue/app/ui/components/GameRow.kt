package com.backlogue.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.backlogue.app.domain.model.BacklogEntry
import com.backlogue.app.ui.theme.BacklogueTheme
import com.backlogue.app.ui.theme.BacklogueType

/**
 * One game in the pile.
 *
 * The metadata line is the design decision worth defending: it shows where the
 * game was added rather than its genre or platform, both of which are
 * available and both of which players can already infer. "From a
 * YouTube video" is the line that makes a list feel like a personal record, and
 * it is the reason the pile does not read like a spreadsheet.
 */
@Composable
fun GameRow(
    item: BacklogEntry,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BacklogueTheme.colors

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        CoverImage(
            url = item.game.coverUrl,
            title = item.game.name,
            modifier = Modifier.width(52.dp).height(70.dp),
        )

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(5.dp),
        ) {
            Text(
                text = item.game.name,
                style = BacklogueType.gameTitle,
                color = colors.textPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = item.provenanceLabel,
                style = BacklogueType.meta,
                color = colors.textTertiary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                StatusChip(status = item.status, selected = true)
                if (item.hasRating) {
                    Text(
                        text = "${item.rating}/10",
                        style = BacklogueType.label,
                        color = colors.gold,
                    )
                }
            }
        }
    }
}
