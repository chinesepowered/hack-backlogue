package com.chinesepowered.backlogue.domain.model

import kotlinx.datetime.LocalDate

/**
 * A game as the catalogue knows it, before a player has any relationship to it.
 * Kept deliberately thin — everything here comes from IGDB and is replaceable;
 * the parts that matter to a player live on [BacklogEntry].
 */
data class Game(
    val igdbId: Long,
    val name: String,
    val coverUrl: String?,
    val releaseDate: LocalDate?,
    val summary: String?,
    val platforms: List<String> = emptyList(),
    val genres: List<String> = emptyList(),
    /** IGDB aggregate rating, 0-100. Null when too few reviews exist. */
    val criticRating: Int? = null,
) {
    /** "2026" or "TBA" — release years matter more than exact dates in a pile. */
    val releaseYearLabel: String
        get() = releaseDate?.year?.toString() ?: "TBA"

    val isUnreleased: Boolean
        get() = releaseDate == null
}
