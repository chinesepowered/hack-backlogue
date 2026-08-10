package com.snag.app.capture

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Text

/**
 * The share-sheet entry point. A user watching a YouTube review or scrolling a
 * Reddit thread hits Share -> Snag and lands here, never leaving the app they
 * were in for more than a second.
 */
class CaptureActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val shared = readSharedText(intent)
        setContent { Text(shared.orEmpty()) }
    }

    private fun readSharedText(intent: Intent?): String? = when (intent?.action) {
        Intent.ACTION_SEND -> intent.getStringExtra(Intent.EXTRA_TEXT)
        Intent.ACTION_PROCESS_TEXT -> intent.getStringExtra(Intent.EXTRA_PROCESS_TEXT)
        else -> null
    }
}
