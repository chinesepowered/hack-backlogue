package com.chinesepowered.backlogue.domain.model

/**
 * Where a game sits in a player's life.
 *
 * The vocabulary here is a product decision, not a naming detail. Most trackers
 * use "Dropped" or "Abandoned" for the last state, which quietly frames a
 * perfectly reasonable choice as a personal failure. [Bounced] is what players
 * actually say — "I bounced off it" — and it puts the mismatch on the game
 * rather than the person. The same reasoning keeps "Unplayed" out of the list
 * entirely: a game you have not started yet is [Backlog], which is a plan, not
 * an accusation.
 */
enum class BacklogStatus(val id: String) {
    /** Wants it, does not own it. The natural landing state for a fresh addition. */
    Wishlist("wishlist"),

    /** Owns it, has not started it. */
    Backlog("backlog"),

    /** In progress right now. */
    Playing("playing"),

    /** Finished — credits, platinum, or personal "I'm done and satisfied". */
    Beaten("beaten"),

    /** Tried it, it wasn't for them. No judgement attached. */
    Bounced("bounced"),
    ;

    val displayName: String
        get() = when (this) {
            Wishlist -> "Wishlist"
            Backlog -> "Backlog"
            Playing -> "Playing"
            Beaten -> "Beaten"
            Bounced -> "Bounced"
        }

    /** Second-person copy used in empty states and confirmations. */
    val verb: String
        get() = when (this) {
            Wishlist -> "want to play"
            Backlog -> "will get to"
            Playing -> "are playing"
            Beaten -> "beat"
            Bounced -> "bounced off"
        }

    /** True when the game is no longer waiting on the player for anything. */
    val isResolved: Boolean
        get() = this == Beaten || this == Bounced

    companion object {
        fun fromId(id: String): BacklogStatus =
            entries.firstOrNull { it.id == id } ?: Wishlist

        /** Display order — follows the arc of actually playing something. */
        val ordered: List<BacklogStatus> =
            listOf(Playing, Backlog, Wishlist, Beaten, Bounced)
    }
}
