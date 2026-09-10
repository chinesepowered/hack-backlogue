package com.chinesepowered.backlogue.data.remote

import com.chinesepowered.backlogue.data.remote.dto.SearchResponseDto
import com.chinesepowered.backlogue.data.toDomain
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/**
 * Guards the contract between the Worker and the app.
 *
 * The payload below is a verbatim capture from the deployed Worker
 * (`/v1/search?q=outer wilds`), not a hand-written fixture. That distinction is
 * the whole point: every other test in this project exercises code we wrote
 * against data we invented, so a field the Worker renames — or an IGDB shape
 * change the Worker passes through — would be invisible until a user searched
 * and got nothing.
 *
 * It is embedded as a string rather than read from a file because commonTest
 * has no multiplatform file API, and a network call in a unit test would make
 * the suite fail whenever the Worker is down or a laptop is offline.
 *
 * If the Worker's response shape changes, re-capture with:
 *   curl "$BACKLOGUE_API_BASE_URL/v1/search?q=outer%20wilds&limit=3"
 */
class WorkerContractTest {

    @Test
    fun realWorkerResponseDecodesIntoDtos() {
        val response = BacklogueJson.decodeFromString(SearchResponseDto.serializer(), CAPTURE)

        assertEquals(3, response.games.size)

        val outerWilds = response.games.first()
        assertEquals(11737L, outerWilds.igdbId)
        assertEquals("Outer Wilds", outerWilds.name)
        assertEquals("2019-05-28", outerWilds.firstReleaseDate)
        assertEquals(85, outerWilds.criticRating)
        assertNotNull(outerWilds.coverUrl)
        assertTrue(outerWilds.coverUrl!!.startsWith("https://images.igdb.com/"))
    }

    @Test
    fun decodedGamesMapIntoTheDomainWithUsableDates() {
        val response = BacklogueJson.decodeFromString(SearchResponseDto.serializer(), CAPTURE)
        val game = response.games.first().toDomain()

        assertEquals("Outer Wilds", game.name)
        // The ISO date has to survive into a LocalDate, because the release-year
        // label and the alert sweep both depend on it parsing.
        assertEquals(2019, game.releaseDate?.year)
        assertEquals("2019", game.releaseYearLabel)
    }

    @Test
    fun platformNamesContainingPipesSurviveDecoding() {
        // "Xbox Series X|S" is a real platform name and a real hazard: the share
        // parser treats a pipe as an outlet separator, so anything that round
        // trips a platform through that logic would truncate it.
        val response = BacklogueJson.decodeFromString(SearchResponseDto.serializer(), CAPTURE)
        assertTrue(
            response.games.first().platforms.any { it == "Xbox Series X|S" },
            "expected the pipe-containing platform name intact, got ${response.games.first().platforms}",
        )
    }

    @Test
    fun unknownFieldsDoNotBreakDecoding() {
        // The Worker is deployed independently of the app, so it can start
        // returning a new field at any time. That must never crash a shipped
        // client that has not been updated.
        val withExtra = """{"games":[{"id":1,"name":"X","somethingNew":true,"nested":{"a":1}}]}"""
        val response = BacklogueJson.decodeFromString(SearchResponseDto.serializer(), withExtra)
        assertEquals("X", response.games.single().name)
    }

    @Test
    fun absentOptionalFieldsFallBackRatherThanThrowing() {
        // An unannounced game has no cover, no date, no rating. IGDB omits the
        // keys entirely rather than sending null.
        val sparse = """{"games":[{"id":2,"name":"Unannounced Thing"}]}"""
        val game = BacklogueJson
            .decodeFromString(SearchResponseDto.serializer(), sparse)
            .games.single()

        assertEquals(null, game.coverUrl)
        assertEquals(null, game.firstReleaseDate)
        assertTrue(game.platforms.isEmpty())
        assertEquals("TBA", game.toDomain().releaseYearLabel)
    }
}

private const val CAPTURE = """
{"games":[
{"id":11737,"name":"Outer Wilds","coverUrl":"https://images.igdb.com/igdb/image/upload/t_cover_big/co65ac.jpg","firstReleaseDate":"2019-05-28","summary":"Outer Wilds is a critically-acclaimed and award-winning open world mystery about a solar system trapped in an endless time loop.","platforms":["Xbox Series X|S","PlayStation 4","PC (Microsoft Windows)","PlayStation 5","Xbox One","Nintendo Switch"],"genres":["Puzzle","Simulator","Adventure","Indie"],"criticRating":85},
{"id":146761,"name":"Outer Wilds: Echoes of the Eye","coverUrl":"https://images.igdb.com/igdb/image/upload/t_cover_big/co2hwc.jpg","firstReleaseDate":"2021-09-28","summary":"Echoes of the Eye is an expansion for Outer Wilds.","platforms":["PC (Microsoft Windows)","PlayStation 4","Xbox One"],"genres":["Adventure","Indie"],"criticRating":88},
{"id":119171,"name":"Outer Wilds: Original Soundtrack","coverUrl":null,"firstReleaseDate":"2019-06-14","summary":"The soundtrack.","platforms":[],"genres":[],"criticRating":null}
]}
"""
