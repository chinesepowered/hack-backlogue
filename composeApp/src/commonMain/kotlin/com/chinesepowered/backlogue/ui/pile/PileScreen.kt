package com.chinesepowered.backlogue.ui.pile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinesepowered.backlogue.domain.model.BacklogStatus
import com.chinesepowered.backlogue.ui.components.EmptyState
import com.chinesepowered.backlogue.ui.components.GameRow
import com.chinesepowered.backlogue.ui.components.StatusChip
import com.chinesepowered.backlogue.ui.theme.BacklogueShapes
import com.chinesepowered.backlogue.ui.theme.BacklogueTheme
import com.chinesepowered.backlogue.ui.theme.BacklogueType

/**
 * The pile: everything a player has added.
 *
 * Note what is deliberately absent — no completion percentage, no "you have 47
 * unplayed games" counter, no progress ring. Those are the mechanics that turn
 * a collection into an obligation, and the brief for this app is explicitly
 * that managing a backlog should feel enjoyable rather than like a chore.
 * Counts appear only inside the filter chips, where the player went looking
 * for them.
 */
@Composable
fun PileScreen(
    viewModel: PileViewModel,
    onOpenGame: (Long) -> Unit,
    onAddGame: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    PileContent(
        state = state,
        onSelectFilter = viewModel::setFilter,
        onOpenGame = onOpenGame,
        onAddGame = onAddGame,
        modifier = modifier,
    )
}

/**
 * The screen with its state passed in rather than collected.
 *
 * Splitting this out keeps the layout renderable without a ViewModel, a
 * database, or a coroutine that has had time to emit — which is what lets the
 * offscreen renderer produce store screenshots from the real composables
 * instead of a mock-up that drifts from the app.
 */
@Composable
fun PileContent(
    state: PileUiState,
    onSelectFilter: (BacklogStatus?) -> Unit,
    onOpenGame: (Long) -> Unit,
    onAddGame: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BacklogueTheme.colors

    Scaffold(
        containerColor = colors.background,
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onAddGame,
                containerColor = colors.accent,
                contentColor = colors.textOnAccent,
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Text("Add a game", style = BacklogueType.label, modifier = Modifier.padding(start = 8.dp))
            }
        },
        modifier = modifier,
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            Text(
                text = "Your pile",
                style = BacklogueType.display,
                color = colors.textPrimary,
                modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 12.dp),
            )

            FilterRow(
                selected = state.filter,
                counts = state.statusCounts,
                onSelect = onSelectFilter,
            )

            if (state.showFreeTierHint) {
                FreeTierHint(remaining = state.remainingFreeSlots)
            }

            when {
                state.isLoading -> Box(Modifier.fillMaxSize())

                state.items.isEmpty() && state.filter == null -> EmptyState(
                    headline = "Nothing here yet",
                    body = "Next time a game catches your eye — in a video, a thread, " +
                        "anywhere — hit share and pick Backlogue. It lands here in one tap.",
                    actionLabel = "Or search for one",
                    onAction = onAddGame,
                )

                state.items.isEmpty() -> EmptyState(
                    headline = "Nothing here yet",
                    body = "No games you ${state.filter?.verb ?: "saved"}.",
                )

                else -> LazyColumn(
                    contentPadding = PaddingValues(bottom = 96.dp, top = 4.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(state.items, key = { it.id }) { item ->
                        GameRow(item = item, onClick = { onOpenGame(item.id) })
                    }
                }
            }
        }
    }
}

@Composable
private fun FilterRow(
    selected: BacklogStatus?,
    counts: Map<BacklogStatus, Int>,
    onSelect: (BacklogStatus?) -> Unit,
) {
    val colors = BacklogueTheme.colors

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AllChip(selected = selected == null, onClick = { onSelect(null) })
        BacklogStatus.ordered.forEach { status ->
            // Hiding empty statuses keeps a new user's filter row from being a
            // row of zeroes, which reads as five things they have failed to do.
            if (counts[status] != null || selected == status) {
                StatusChip(
                    status = status,
                    selected = selected == status,
                    onClick = { onSelect(if (selected == status) null else status) },
                )
            }
        }
    }
}

@Composable
private fun AllChip(selected: Boolean, onClick: () -> Unit) {
    val colors = BacklogueTheme.colors
    Box(
        modifier = Modifier
            .clip(BacklogueShapes.chip)
            .background(if (selected) colors.accentSubtle else Color.Transparent)
            .border(
                BorderStroke(1.dp, if (selected) colors.accent.copy(alpha = 0.5f) else colors.outline),
                BacklogueShapes.chip,
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 7.dp),
    ) {
        Text(
            text = "All",
            style = BacklogueType.label,
            color = if (selected) colors.accent else colors.textSecondary,
        )
    }
}

@Composable
private fun FreeTierHint(remaining: Int) {
    val colors = BacklogueTheme.colors
    Text(
        text = if (remaining > 0) {
            "$remaining free slots left in your pile"
        } else {
            "Your free pile is full — Pro lifts the cap"
        },
        style = BacklogueType.meta,
        color = colors.textTertiary,
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
    )
}
