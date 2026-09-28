package com.chinesepowered.backlogue.share

import com.chinesepowered.backlogue.domain.model.BacklogEntry
import com.chinesepowered.backlogue.domain.model.BacklogStatus
import com.chinesepowered.backlogue.domain.model.DiscoverySource
import com.chinesepowered.backlogue.domain.model.Game
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlin.time.Instant

class ShareTextTest {

    private fun entry(
        status: BacklogStatus,
        source: DiscoverySource = DiscoverySource.YouTube,
        rating: Int? = null,
    ) = BacklogEntry(
        id = 1,
        game = Game(igdbId = 1, name = "Hollow Knight: Silksong", coverUrl = null, releaseDate = null, summary = null),
        status = status,
        rating = rating,
        note = null,
        sourceUrl = null,
        source = source,
        addedAt = Instant.fromEpochMilliseconds(0),
        startedAt = null,
        finishedAt = null,
        sortIndex = 0.0,
    )

    @Test
    fun aWishlistedGameSaysWhereItWasFound() {
        assertEquals(
            "Hollow Knight: Silksong is on my wishlist.\n" +
                "Found it through a YouTube video.\n" +
                "Tracked with Backlogue: $ShareLink",
            shareText(entry(BacklogStatus.Wishlist)),
        )
    }

    @Test
    fun aBeatenGameCarriesItsRating() {
        assertTrue(
            shareText(entry(BacklogStatus.Beaten, rating = 9))
                .startsWith("Beat Hollow Knight: Silksong and gave it 9/10."),
        )
    }

    @Test
    fun aBeatenGameWithoutARatingDoesNotInventOne() {
        assertTrue(shareText(entry(BacklogStatus.Beaten)).startsWith("Beat Hollow Knight: Silksong."))
    }

    @Test
    fun aManualAddHasNoProvenanceLine() {
        // "Found it through search" says nothing a reader would care about.
        assertFalse(shareText(entry(BacklogStatus.Backlog, DiscoverySource.Manual)).contains("Found it"))
    }

    @Test
    fun everyStatusProducesText() {
        // A new status added to the enum without a share sentence would fail to
        // compile at the `when`; this guards the output never being blank.
        BacklogStatus.entries.forEach { status ->
            assertTrue(shareText(entry(status)).lines().first().isNotBlank(), "blank text for $status")
        }
    }
}
