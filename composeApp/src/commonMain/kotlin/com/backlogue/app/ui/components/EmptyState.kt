package com.backlogue.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.backlogue.app.ui.theme.BacklogueTheme
import com.backlogue.app.ui.theme.BacklogueType

/**
 * Empty states carry more weight here than in most apps: a brand new pile is
 * empty by definition, and it is the first thing every judge will see. So this
 * one teaches the core gesture — share into Backlogue — rather than apologising for
 * having no data.
 */
@Composable
fun EmptyState(
    headline: String,
    body: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    val colors = BacklogueTheme.colors

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 40.dp, vertical = 48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = headline,
            style = BacklogueType.title,
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
        )
        Text(
            text = body,
            style = BacklogueType.body,
            color = colors.textSecondary,
            textAlign = TextAlign.Center,
        )
        if (actionLabel != null && onAction != null) {
            TextButton(onClick = onAction) {
                Text(text = actionLabel, style = BacklogueType.label, color = colors.accent)
            }
        }
    }
}
