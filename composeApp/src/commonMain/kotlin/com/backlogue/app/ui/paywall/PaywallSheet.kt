package com.backlogue.app.ui.paywall

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.backlogue.app.billing.ProLimits
import com.backlogue.app.ui.theme.BacklogueShapes
import com.backlogue.app.ui.theme.BacklogueTheme
import com.backlogue.app.ui.theme.BacklogueType

/**
 * The Pro upsell.
 *
 * Written to sell the things that only matter once someone already loves the
 * app — alerts, unlimited pile, year in review — and never to gate the core
 * loop. It appears in exactly two places: when the free pile is full, and from
 * settings. It is never shown on launch, and never interrupts an add in
 * progress, because the one moment this app exists to protect is the two
 * seconds between "that looks good" and "it's saved".
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaywallSheet(
    onDismiss: () -> Unit,
    onPurchase: () -> Unit,
    onRestore: () -> Unit,
    busy: Boolean = false,
    message: String? = null,
) {
    val colors = BacklogueTheme.colors
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.surface,
        shape = BacklogueShapes.sheet,
    ) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Backlogue Pro", style = BacklogueType.display, color = colors.textPrimary)
            Text(
                text = "Your first ${ProLimits.FreePileLimit} games are free, forever. " +
                    "Pro is for when your pile outgrows that.",
                style = BacklogueType.body,
                color = colors.textSecondary,
                textAlign = TextAlign.Center,
            )

            Column(
                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // Only ship claims the app can actually honour. Custom lists
                // and a year-in-review were advertised here before either
                // existed; selling absent features is the fastest way to lose
                // a store review, and it is not worth a conversion point.
                ProFeature("An unlimited pile", "No cap, ever.")
                ProFeature(
                    "Know when it lands",
                    "A nudge when a wishlisted game finally gets a release date, " +
                        "or the day it comes out.",
                )
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(BacklogueShapes.chip)
                    .background(if (busy) colors.accentPressed else colors.accent)
                    .clickable(enabled = !busy, onClick = onPurchase)
                    .padding(vertical = 16.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = if (busy) "Working…" else "Get Pro",
                    style = BacklogueType.label,
                    color = colors.textOnAccent,
                )
            }

            Text(
                text = "Restore purchases",
                style = BacklogueType.meta,
                color = colors.textTertiary,
                modifier = Modifier
                    .clickable(enabled = !busy, onClick = onRestore)
                    .padding(8.dp),
            )

            if (message != null) {
                Text(
                    text = message,
                    style = BacklogueType.meta,
                    color = colors.textSecondary,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun ProFeature(title: String, body: String) {
    val colors = BacklogueTheme.colors
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(
            modifier = Modifier
                .padding(top = 6.dp)
                .size(6.dp)
                .clip(BacklogueShapes.chip)
                .background(colors.accent),
        )
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = BacklogueType.gameTitle, color = colors.textPrimary)
            Text(body, style = BacklogueType.meta, color = colors.textSecondary)
        }
    }
}
