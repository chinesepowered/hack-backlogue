package com.backlogue.app.data

import com.backlogue.app.data.remote.dto.GameDto
import com.backlogue.app.domain.model.BacklogStatus
import com.backlogue.app.domain.model.DiscoverySource
import com.backlogue.app.domain.model.Game
import com.backlogue.app.domain.model.BacklogEntry
import com.backlogue.app.db.BacklogEntry as BacklogEntryEntity
import kotlinx.datetime.LocalDate
import kotlin.time.Instant

/**
 * Dates cross three representations in this app — an ISO string from the API,
 * an epoch-day integer in SQLite, and a LocalDate in the domain — so the
 * conversions live in one file where they can be checked against each other.
 * Release dates are stored as epoch *days* rather than millis: a launch date is
 * a calendar fact, and storing it as an instant invites timezone drift that
 * shows the wrong year to players near the date line.
 */

fun GameDto.toDomain(): Game = Game(
    igdbId = igdbId,
    name = name,
    coverUrl = coverUrl,
    releaseDate = firstReleaseDate?.toLocalDateOrNull(),
    summary = summary,
    platforms = platforms,
    genres = genres,
    criticRating = criticRating,
)

fun BacklogEntryEntity.toDomain(): BacklogEntry = BacklogEntry(
    id = id,
    game = Game(
        igdbId = igdbId,
        name = name,
        coverUrl = coverUrl,
        releaseDate = releaseDateEpoch?.let { LocalDate.fromEpochDays(it.toInt()) },
        summary = summary,
    ),
    status = BacklogStatus.fromId(status),
    rating = rating?.toInt(),
    note = note,
    sourceUrl = sourceUrl,
    source = DiscoverySource.fromId(sourceLabel),
    addedAt = Instant.fromEpochMilliseconds(addedAtEpoch),
    startedAt = startedAtEpoch?.let { Instant.fromEpochMilliseconds(it) },
    finishedAt = finishedAtEpoch?.let { Instant.fromEpochMilliseconds(it) },
    sortIndex = sortIndex,
)

fun LocalDate.toEpochDayLong(): Long = toEpochDays()

/**
 * Tolerant on purpose. IGDB dates arrive as plain dates, but a Worker change or
 * a cached response could hand us a full timestamp; a malformed date should
 * cost us the release year, not the whole search result.
 */
private fun String.toLocalDateOrNull(): LocalDate? = runCatching {
    LocalDate.parse(substringBefore('T'))
}.getOrNull()
