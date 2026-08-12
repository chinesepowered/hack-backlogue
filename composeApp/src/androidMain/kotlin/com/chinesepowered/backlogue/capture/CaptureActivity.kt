package com.chinesepowered.backlogue.capture

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.chinesepowered.backlogue.App
import com.chinesepowered.backlogue.domain.capture.ShareTextParser

/**
 * The share-sheet entry point, and the reason this app exists.
 *
 * A user watching a YouTube review taps Share -> Backlogue and arrives here. The
 * activity is declared `noHistory` and `excludeFromRecents` so that going back
 * returns them to the video rather than leaving a stray Backlogue task behind — the
 * whole promise is that capturing a game costs you your place in nothing.
 */
class CaptureActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val shared = readSharedText(intent)
        val candidate = shared?.let(ShareTextParser::parse)

        setContent {
            App(initialCandidate = candidate)
        }
    }

    private fun readSharedText(intent: Intent?): String? = when (intent?.action) {
        Intent.ACTION_SEND -> intent.getStringExtra(Intent.EXTRA_TEXT)
        // PROCESS_TEXT fires when a user selects a game name in any app and
        // picks Backlogue from the text-selection menu.
        Intent.ACTION_PROCESS_TEXT -> intent.getStringExtra(Intent.EXTRA_PROCESS_TEXT)
        else -> null
    }?.takeIf { it.isNotBlank() }
}
