package com.chinesepowered.backlogue.ui.search

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.chinesepowered.backlogue.domain.capture.CaptureConfidence
import com.chinesepowered.backlogue.domain.model.Game
import com.chinesepowered.backlogue.ui.components.CoverImage
import com.chinesepowered.backlogue.ui.components.EmptyState
import com.chinesepowered.backlogue.ui.theme.BacklogueShapes
import com.chinesepowered.backlogue.ui.theme.BacklogueTheme
import com.chinesepowered.backlogue.ui.theme.BacklogueType

/**
 * Search, and the landing screen for a share.
 *
 * When arriving from the share sheet the field is pre-filled from the parsed
 * candidate. The keyboard only opens automatically on a low-confidence parse:
 * if we got the game right, popping a keyboard over the answer is noise.
 */
@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    onBack: () -> Unit,
    onShowPaywall: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = BacklogueTheme.colors
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(state.candidate) {
        val confidence = state.candidate?.confidence
        if (state.candidate == null || confidence == CaptureConfidence.Low) {
            runCatching { focusRequester.requestFocus() }
        }
    }

    LaunchedEffect(state.blockedByFreeLimit) {
        if (state.blockedByFreeLimit) {
            onShowPaywall()
            viewModel.dismissFreeLimit()
        }
    }

    Column(modifier = modifier.fillMaxSize().background(colors.background)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 4.dp, end = 16.dp, top = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = colors.textSecondary)
            }
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::onQueryChange,
                placeholder = { Text("Search games", style = BacklogueType.body, color = colors.textTertiary) },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                modifier = Modifier.weight(1f).focusRequester(focusRequester),
            )
        }

        state.candidate?.let { candidate ->
            Text(
                text = when (candidate.confidence) {
                    CaptureConfidence.High, CaptureConfidence.Medium ->
                        "From ${candidate.source.label}"
                    CaptureConfidence.Low ->
                        "Couldn't read a game name from that — try searching"
                },
                style = BacklogueType.meta,
                color = colors.textTertiary,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
        }

        when {
            state.isSearching && state.results.isEmpty() -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = colors.accent)
            }

            state.error != null -> EmptyState(
                headline = when (state.error) {
                    SearchError.Offline -> "No connection"
                    SearchError.RateLimited -> "Too many searches"
                    SearchError.NotConfigured -> "Search isn't set up"
                    else -> "Search is having a moment"
                },
                body = when (state.error) {
                    SearchError.Offline ->
                        "Your pile still works offline — this just needs a connection to look games up."
                    SearchError.RateLimited -> "Give it a few seconds and try again."
                    SearchError.NotConfigured ->
                        "No API base URL is configured for this build. See the README."
                    else -> "Try that again in a moment."
                },
            )

            state.query.isNotBlank() && state.results.isEmpty() -> EmptyState(
                headline = "No games found",
                body = "Nothing matched \"${state.query}\".",
            )

            else -> LazyColumn(
                contentPadding = PaddingValues(vertical = 8.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(state.results, key = { it.igdbId }) { game ->
                    SearchResultRow(
                        game = game,
                        alreadyAdded = game.igdbId in state.addedIgdbIds,
                        onAdd = { viewModel.add(game) },
                    )
                }
            }
        }
    }
}

@Composable
private fun SearchResultRow(
    game: Game,
    alreadyAdded: Boolean,
    onAdd: () -> Unit,
) {
    val colors = BacklogueTheme.colors

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !alreadyAdded, onClick = onAdd)
            .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        CoverImage(
            url = game.coverUrl,
            title = game.name,
            modifier = Modifier.width(46.dp).height(62.dp),
        )
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                text = game.name,
                style = BacklogueType.gameTitle,
                color = colors.textPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = game.releaseYearLabel,
                style = BacklogueType.meta,
                color = colors.textTertiary,
            )
        }

        Box(
            modifier = Modifier
                .clip(BacklogueShapes.chip)
                .background(if (alreadyAdded) colors.surfaceElevated else colors.accent)
                .clickable(enabled = !alreadyAdded, onClick = onAdd)
                .padding(horizontal = 16.dp, vertical = 9.dp),
            contentAlignment = Alignment.Center,
        ) {
            if (alreadyAdded) {
                Icon(
                    Icons.Default.Check,
                    contentDescription = "Already in your pile",
                    tint = colors.playing,
                )
            } else {
                Text("Add", style = BacklogueType.label, color = colors.textOnAccent)
            }
        }
    }
}
