package com.chinesepowered.backlogue.ui.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinesepowered.backlogue.domain.model.BacklogStatus
import com.chinesepowered.backlogue.ui.components.CoverImage
import com.chinesepowered.backlogue.ui.components.StatusChip
import com.chinesepowered.backlogue.ui.components.color
import com.chinesepowered.backlogue.ui.theme.BacklogueShapes
import com.chinesepowered.backlogue.ui.theme.BacklogueTheme
import com.chinesepowered.backlogue.ui.theme.BacklogueType

@Composable
fun DetailScreen(
    viewModel: DetailViewModel,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(state.removed) {
        if (state.removed && !state.isLoading) onBack()
    }

    DetailContent(
        state = state,
        onBack = onBack,
        onSetStatus = viewModel::setStatus,
        onRate = viewModel::rate,
        onRemove = viewModel::remove,
        modifier = modifier,
    )
}

/** State-in, callbacks-out, so the offscreen renderer can draw it. */
@Composable
fun DetailContent(
    state: DetailUiState,
    onBack: () -> Unit,
    onSetStatus: (BacklogStatus) -> Unit,
    onRate: (Int) -> Unit,
    onRemove: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BacklogueTheme.colors
    val item = state.item ?: return

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(colors.background)
            // Edge-to-edge is mandatory at targetSdk 36, so without this the
            // top row renders behind the status bar: the clock sits on the back
            // arrow, the battery icon on the delete button, and the system bar
            // eats any tap aimed at either.
            .statusBarsPadding()
            .verticalScroll(rememberScrollState()),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = colors.textSecondary)
            }
            Box(Modifier.weight(1f))
            IconButton(onClick = onRemove) {
                Icon(Icons.Default.Delete, "Remove from pile", tint = colors.textTertiary)
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            CoverImage(
                url = item.game.coverUrl,
                title = item.game.name,
                shape = BacklogueShapes.card,
                modifier = Modifier.width(120.dp).aspectRatio(0.75f),
            )
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(item.game.name, style = BacklogueType.title, color = colors.textPrimary)
                Text(item.game.releaseYearLabel, style = BacklogueType.meta, color = colors.textSecondary)
                Text(item.provenanceLabel, style = BacklogueType.meta, color = colors.textTertiary)
            }
        }

        SectionLabel("Status")
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            // Only the next sensible moves are offered rather than all five, so
            // the common action is one tap and the screen does not become a
            // radio-button form.
            BacklogStatus.ordered.take(3).forEach { status ->
                StatusChip(
                    status = status,
                    selected = item.status == status,
                    onClick = { onSetStatus(status) },
                )
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            BacklogStatus.ordered.drop(3).forEach { status ->
                StatusChip(
                    status = status,
                    selected = item.status == status,
                    onClick = { onSetStatus(status) },
                )
            }
        }

        // Rating only appears once a game is resolved: asking someone to score a
        // game they have not finished is how trackers end up full of noise.
        if (item.status.isResolved) {
            SectionLabel("Your rating")
            RatingRow(rating = item.rating, onRate = onRate)
        }

        item.game.summary?.let { summary ->
            SectionLabel("About")
            Text(
                text = summary,
                style = BacklogueType.body,
                color = colors.textSecondary,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
            )
        }

        Box(Modifier.height(48.dp))
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text.uppercase(),
        style = BacklogueType.overline,
        color = BacklogueTheme.colors.textTertiary,
        modifier = Modifier.padding(start = 20.dp, top = 24.dp, bottom = 10.dp),
    )
}

@Composable
private fun RatingRow(rating: Int?, onRate: (Int) -> Unit) {
    val colors = BacklogueTheme.colors
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        (1..10).forEach { value ->
            val active = rating != null && value <= rating
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(36.dp)
                    .clip(BacklogueShapes.cover)
                    .background(if (active) colors.gold else colors.surfaceElevated)
                    .clickable { onRate(value) },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = value.toString(),
                    style = BacklogueType.overline,
                    color = if (active) colors.textOnAccent else colors.textTertiary,
                )
            }
        }
    }
}
