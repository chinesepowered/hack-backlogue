package com.chinesepowered.backlogue.share

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.chinesepowered.backlogue.capture.CaptureActivity
import com.chinesepowered.backlogue.domain.model.BacklogEntry

/**
 * Hands a game to Android's own share sheet.
 *
 * Backlogue is itself a text share target, so without an exclusion it would
 * offer to share a game back into itself. EXTRA_EXCLUDE_COMPONENTS removes it
 * from the chooser.
 */
class AndroidGameSharer(private val context: Context) : GameSharer {

    override val available: Boolean = true

    override fun share(entry: BacklogEntry) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, shareText(entry))
            putExtra(Intent.EXTRA_TITLE, entry.game.name)
        }
        val chooser = Intent.createChooser(send, null).apply {
            putExtra(
                Intent.EXTRA_EXCLUDE_COMPONENTS,
                arrayOf(ComponentName(context, CaptureActivity::class.java)),
            )
            // Koin supplies the application context, which has no task of its
            // own to start an activity in.
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
    }
}
