package com.chinesepowered.backlogue.domain.capture

import com.chinesepowered.backlogue.domain.model.DiscoverySource
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * These cases are real share payloads, copied from what Android's share sheet
 * actually produces on each platform. The parser is the product, so it gets the
 * test coverage.
 */
class ShareTextParserTest {

    @Test
    fun steamUrlYieldsExactTitleWithHighConfidence() {
        val result = ShareTextParser.parse(
            "https://store.steampowered.com/app/1030300/Hollow_Knight_Silksong/"
        )

        assertEquals("Hollow Knight Silksong", result.query)
        assertEquals(DiscoverySource.Steam, result.source)
        assertEquals(CaptureConfidence.High, result.confidence)
    }

    @Test
    fun youtubeShareStripsOutletSuffixAndReviewNoise() {
        val result = ShareTextParser.parse(
            "Silksong Review | IGN\nhttps://youtu.be/dQw4w9WgXcQ"
        )

        assertEquals("Silksong", result.query)
        assertEquals(DiscoverySource.YouTube, result.source)
    }

    @Test
    fun bracketedTagsAndTrailerPhrasesAreRemoved() {
        val result = ShareTextParser.parse(
            "[4K] Elden Ring Nightreign - Official Gameplay Trailer\n" +
                "https://www.youtube.com/watch?v=abc123"
        )

        assertEquals("Elden Ring Nightreign", result.query)
    }

    @Test
    fun redditThreadSlugBecomesQuery() {
        val result = ShareTextParser.parse(
            "https://www.reddit.com/r/Games/comments/1abcdef/hollow_knight_silksong_is_out/"
        )

        assertEquals(DiscoverySource.Reddit, result.source)
        assertTrue(
            result.query.contains("Hollow Knight Silksong", ignoreCase = true),
            "expected game name in query, got '${result.query}'",
        )
    }

    @Test
    fun emojiAndShoutedHypeAreDropped() {
        val result = ShareTextParser.parse(
            "🔥 FINALLY! Silksong gameplay 🔥 https://youtu.be/x"
        )

        assertEquals("Silksong", result.query)
    }

    @Test
    fun titlesThatAreOnlyNoiseFallBackRatherThanReturningEmpty() {
        // If we stripped every word, the "noise" was the title. Better to hand
        // IGDB something imperfect than to hand the user an empty search box.
        val result = ShareTextParser.parse("Gameplay Trailer https://youtu.be/x")

        assertTrue(result.query.isNotBlank(), "parser returned an empty query")
    }

    @Test
    fun plainTextWithNoUrlIsTreatedAsAManualSearch() {
        val result = ShareTextParser.parse("Outer Wilds")

        assertEquals("Outer Wilds", result.query)
        assertEquals(DiscoverySource.Manual, result.source)
        assertEquals(null, result.url)
    }

    @Test
    fun pipeSeparatorIsKeptWhenItIsNotAnOutlet() {
        // "Dark Souls | Remastered" must survive: the tail is part of the name.
        val result = ShareTextParser.parse("Dark Souls | Remastered")

        assertTrue(
            result.query.contains("Remastered"),
            "wrongly truncated a real title: '${result.query}'",
        )
    }

    @Test
    fun trailingPunctuationDoesNotLeakIntoTheUrl() {
        val result = ShareTextParser.parse("great game (https://youtu.be/abc).")

        assertEquals("https://youtu.be/abc", result.url)
    }

    @Test
    fun sourceClassificationHandlesMobileAndShortHosts() {
        assertEquals(DiscoverySource.YouTube, DiscoverySource.fromUrl("https://m.youtube.com/watch?v=1"))
        assertEquals(DiscoverySource.YouTube, DiscoverySource.fromUrl("https://youtu.be/1"))
        assertEquals(DiscoverySource.Reddit, DiscoverySource.fromUrl("https://redd.it/1"))
        assertEquals(DiscoverySource.X, DiscoverySource.fromUrl("https://x.com/a/status/1"))
        assertEquals(DiscoverySource.Web, DiscoverySource.fromUrl("https://example.com/a"))
        assertEquals(DiscoverySource.Manual, DiscoverySource.fromUrl(null))
    }
}
