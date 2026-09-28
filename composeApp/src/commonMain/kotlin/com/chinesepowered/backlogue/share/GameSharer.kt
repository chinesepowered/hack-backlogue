package com.chinesepowered.backlogue.share

import com.chinesepowered.backlogue.domain.model.BacklogEntry
import com.chinesepowered.backlogue.domain.model.BacklogStatus
import com.chinesepowered.backlogue.domain.model.DiscoverySource

/**
 * Sends a game out of the app through whatever the platform offers.
 *
 * Bound per platform in `platformModule()` rather than declared expect/actual,
 * for the same reason push registration is: Android needs a Context, and only
 * the platform module can supply one.
 */
interface GameSharer {
    /**
     * False on platforms with no share surface yet. The button is hidden there
     * rather than shown and dead, because a control that does nothing is worse
     * than one that isn't offered.
     */
    val available: Boolean

    fun share(entry: BacklogEntry)
}

/** For platforms without a share sheet: desktop, and iOS until it has one. */
class NoGameSharer : GameSharer {
    override val available: Boolean = false
    override fun share(entry: BacklogEntry) = Unit
}

const val ShareLink = "https://backlogue-app.vercel.app/"

/**
 * What a shared game says. Kept in common code so every platform says the same
 * thing, and pure so it can be tested without a device.
 *
 * It reads as something a player would actually post: what they did with the
 * game, the rating if they gave one, and where they found it, because the
 * provenance line is the part of this app people want to show off.
 */
fun shareText(entry: BacklogEntry): String = buildString {
    val name = entry.game.name
    append(
        when (entry.status) {
            BacklogStatus.Wishlist -> "$name is on my wishlist."
            BacklogStatus.Backlog -> "$name is in my backlog."
            BacklogStatus.Playing -> "Playing $name right now."
            BacklogStatus.Beaten -> entry.rating
                ?.let { "Beat $name and gave it $it/10." }
                ?: "Beat $name."
            BacklogStatus.Bounced -> "Bounced off $name."
        },
    )
    // "Found it through search" says nothing, so a manual add gets no line.
    if (entry.source != DiscoverySource.Manual) {
        append("\nFound it through ${entry.source.label}.")
    }
    append("\nTracked with Backlogue: $ShareLink")
}
