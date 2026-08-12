package com.chinesepowered.backlogue.data

import app.cash.sqldelight.coroutines.asFlow
import app.cash.sqldelight.coroutines.mapToList
import app.cash.sqldelight.coroutines.mapToOneOrNull
import com.chinesepowered.backlogue.data.remote.ApiResult
import com.chinesepowered.backlogue.data.remote.BacklogueApi
import com.chinesepowered.backlogue.data.remote.map
import com.chinesepowered.backlogue.db.BacklogueDatabase
import com.chinesepowered.backlogue.domain.model.BacklogStatus
import com.chinesepowered.backlogue.domain.model.DiscoverySource
import com.chinesepowered.backlogue.domain.model.Game
import com.chinesepowered.backlogue.domain.model.BacklogEntry
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import kotlin.time.Clock

/**
 * The single source of truth for a player's pile.
 *
 * Deliberately local-first. An add must succeed while the user is on a train
 * with one bar, because the moment we make saving depend on the network we have
 * rebuilt the very friction this app exists to remove. The catalogue lookup can
 * fail and the game still lands — worst case it lands with the raw shared title
 * as its name, which the user can fix later, rather than not landing at all.
 */
class BacklogueRepository(
    private val database: BacklogueDatabase,
    private val api: BacklogueApi,
    private val ioDispatcher: CoroutineDispatcher,
    private val clock: Clock = Clock.System,
) {
    private val queries get() = database.backlogueQueries

    fun observePile(): Flow<List<BacklogEntry>> =
        queries.selectAll().asFlow().mapToList(ioDispatcher).map { rows ->
            rows.map { it.toDomain() }
        }

    fun observeByStatus(status: BacklogStatus): Flow<List<BacklogEntry>> =
        queries.selectByStatus(status.id).asFlow().mapToList(ioDispatcher).map { rows ->
            rows.map { it.toDomain() }
        }

    fun observeById(id: Long): Flow<BacklogEntry?> =
        queries.selectById(id).asFlow().mapToOneOrNull(ioDispatcher).map { it?.toDomain() }

    fun observeCount(): Flow<Long> =
        queries.countAll().asFlow().mapToList(ioDispatcher).map { it.firstOrNull() ?: 0L }

    suspend fun count(): Long = withContext(ioDispatcher) {
        queries.countAll().executeAsOne()
    }

    suspend fun contains(igdbId: Long): Boolean = withContext(ioDispatcher) {
        queries.selectByIgdbId(igdbId).executeAsOneOrNull() != null
    }

    /**
     * Saves a game to the pile. Returns the row id, or the existing one if this
     * game was already added — sharing the same trailer twice should feel
     * like a no-op, not an error.
     */
    suspend fun add(
        game: Game,
        status: BacklogStatus = BacklogStatus.Wishlist,
        source: DiscoverySource = DiscoverySource.Manual,
        sourceUrl: String? = null,
    ): Long = withContext(ioDispatcher) {
        queries.transactionWithResult {
            val existing = queries.selectByIgdbId(game.igdbId).executeAsOneOrNull()
            if (existing != null) {
                // Refresh catalogue fields but never touch the player's own
                // data — someone re-sharing a game they already rated must not
                // lose that rating.
                queries.updateCatalogueData(
                    name = game.name,
                    coverUrl = game.coverUrl,
                    releaseDateEpoch = game.releaseDate?.toEpochDayLong(),
                    summary = game.summary,
                    igdbId = game.igdbId,
                )
                return@transactionWithResult existing.id
            }

            // New entries go to the top of the pile. Newest-first is what the
            // user expects immediately after sharing something.
            val topIndex = (queries.minSortIndex().executeAsOneOrNull() ?: 0.0) - 1.0

            queries.insert(
                igdbId = game.igdbId,
                name = game.name,
                coverUrl = game.coverUrl,
                releaseDateEpoch = game.releaseDate?.toEpochDayLong(),
                summary = game.summary,
                status = status.id,
                rating = null,
                note = null,
                sourceUrl = sourceUrl,
                sourceLabel = source.id,
                addedAtEpoch = clock.now().toEpochMilliseconds(),
                startedAtEpoch = null,
                finishedAtEpoch = null,
                sortIndex = topIndex,
            )
            queries.lastInsertedId().executeAsOne()
        }
    }

    /**
     * Moving a game through the funnel also stamps the timestamps that make the
     * year-in-review possible, so "how long did that take me" needs no
     * separate bookkeeping.
     */
    suspend fun setStatus(id: Long, status: BacklogStatus) = withContext(ioDispatcher) {
        val existing = queries.selectById(id).executeAsOneOrNull() ?: return@withContext
        val now = clock.now().toEpochMilliseconds()

        val startedAt = when {
            status == BacklogStatus.Playing && existing.startedAtEpoch == null -> now
            else -> existing.startedAtEpoch
        }
        val finishedAt = when {
            status.isResolved && existing.finishedAtEpoch == null -> now
            // Moving back out of a resolved state clears the finish stamp,
            // otherwise a mis-tap permanently corrupts the stats.
            !status.isResolved -> null
            else -> existing.finishedAtEpoch
        }

        queries.updateStatus(status.id, startedAt, finishedAt, id)
    }

    suspend fun rate(id: Long, rating: Int?) = withContext(ioDispatcher) {
        queries.updateRating(rating?.toLong(), id)
    }

    suspend fun setNote(id: Long, note: String?) = withContext(ioDispatcher) {
        queries.updateNote(note?.takeIf { it.isNotBlank() }, id)
    }

    suspend fun remove(id: Long) = withContext(ioDispatcher) {
        queries.deleteById(id)
    }

    suspend fun reorder(id: Long, previous: BacklogEntry?, next: BacklogEntry?) =
        withContext(ioDispatcher) {
            val index = BacklogEntry.sortIndexBetween(previous?.sortIndex, next?.sortIndex)
            queries.updateSortIndex(index, id)
        }

    suspend fun search(query: String): ApiResult<List<Game>> {
        if (query.isBlank()) return ApiResult.Success(emptyList())
        return api.search(query).map { dtos -> dtos.map { it.toDomain() } }
    }

    suspend fun catalogueGame(igdbId: Long): ApiResult<Game> =
        api.game(igdbId).map { it.toDomain() }
}
