package com.backlogue.app.domain.model

import kotlin.time.Instant

/**
 * A game plus the player's relationship to it: the actual unit of this app.
 */
data class BacklogEntry(
    val id: Long,
    val game: Game,
    val status: BacklogStatus,
    /** 1-10, set when a game is resolved. Null while still in progress. */
    val rating: Int?,
    val note: String?,
    val sourceUrl: String?,
    val source: DiscoverySource,
    val addedAt: Instant,
    val startedAt: Instant?,
    val finishedAt: Instant?,
    /**
     * Manual ordering within a status. A float so a drag between two neighbours
     * is a midpoint write rather than a renumber of the whole list.
     */
    val sortIndex: Double,
) {
    val hasRating: Boolean get() = rating != null

    /** "From a YouTube video" — the provenance line under a title. */
    val provenanceLabel: String
        get() = "From ${source.label}"

    companion object {
        /** Midpoint between two neighbours, for drag-to-reorder. */
        fun sortIndexBetween(before: Double?, after: Double?): Double = when {
            before == null && after == null -> 0.0
            before == null -> after!! - 1.0
            after == null -> before + 1.0
            else -> (before + after) / 2.0
        }
    }
}
