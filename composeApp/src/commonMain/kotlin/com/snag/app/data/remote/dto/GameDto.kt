package com.snag.app.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * The catalogue shape returned by Snag's own API rather than IGDB's.
 *
 * IGDB needs a Twitch client secret, which must never ship inside an app, so
 * every catalogue call goes through the Snag Worker. That indirection buys us a
 * second thing worth having: the Worker flattens IGDB's deeply-nested,
 * id-reference-heavy responses into exactly the fields this app renders, so the
 * client never carries parsing code for a schema it does not control.
 */
@Serializable
data class GameDto(
    @SerialName("id") val igdbId: Long,
    @SerialName("name") val name: String,
    @SerialName("coverUrl") val coverUrl: String? = null,
    /** ISO-8601 date, or null for unannounced titles. */
    @SerialName("firstReleaseDate") val firstReleaseDate: String? = null,
    @SerialName("summary") val summary: String? = null,
    @SerialName("platforms") val platforms: List<String> = emptyList(),
    @SerialName("genres") val genres: List<String> = emptyList(),
    @SerialName("criticRating") val criticRating: Int? = null,
)

@Serializable
data class SearchResponseDto(
    @SerialName("games") val games: List<GameDto> = emptyList(),
)

/**
 * Registers interest in a game so the Worker can push when its price drops, it
 * finally gets a release date, or it is about to leave a subscription service.
 */
@Serializable
data class WatchRequestDto(
    @SerialName("subscriptionId") val subscriptionId: String,
    @SerialName("igdbIds") val igdbIds: List<Long>,
)
