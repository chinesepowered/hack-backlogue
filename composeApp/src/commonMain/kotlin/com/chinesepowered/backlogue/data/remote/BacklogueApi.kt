package com.chinesepowered.backlogue.data.remote

import com.chinesepowered.backlogue.data.remote.dto.GameDto
import com.chinesepowered.backlogue.data.remote.dto.SearchResponseDto
import com.chinesepowered.backlogue.data.remote.dto.WatchRequestDto
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.http.isSuccess

/**
 * Every network result the app can act on.
 *
 * Search failures are extremely visible in this product — they happen while the
 * user is mid-share, with a video paused behind them — so the UI needs to tell
 * offline apart from "we looked and there is nothing", and neither can be an
 * exception thrown from a coroutine nobody catches.
 */
sealed interface ApiResult<out T> {
    data class Success<T>(val value: T) : ApiResult<T>
    data class Failure(val reason: Reason, val message: String? = null) : ApiResult<Nothing>

    enum class Reason { Offline, RateLimited, ServerError, NotConfigured, Unknown }
}

inline fun <T, R> ApiResult<T>.map(transform: (T) -> R): ApiResult<R> = when (this) {
    is ApiResult.Success -> ApiResult.Success(transform(value))
    is ApiResult.Failure -> this
}

class BacklogueApi(
    private val client: HttpClient,
    private val baseUrl: String,
) {
    val isConfigured: Boolean get() = baseUrl.isNotBlank()

    suspend fun search(query: String, limit: Int = 20): ApiResult<List<GameDto>> =
        request {
            client.get("$baseUrl/v1/search") {
                parameter("q", query)
                parameter("limit", limit)
            }
        }.map { it.body<SearchResponseDto>().games }

    suspend fun game(igdbId: Long): ApiResult<GameDto> =
        request { client.get("$baseUrl/v1/games/$igdbId") }.map { it.body<GameDto>() }

    /** Fire-and-forget: a failed watch registration must never block an add. */
    suspend fun watch(subscriptionId: String, igdbIds: List<Long>): ApiResult<Unit> =
        request {
            client.post("$baseUrl/v1/watch") {
                contentType(ContentType.Application.Json)
                setBody(WatchRequestDto(subscriptionId, igdbIds))
            }
        }.map { }

    private suspend fun request(block: suspend () -> HttpResponse): ApiResult<HttpResponse> {
        if (!isConfigured) {
            return ApiResult.Failure(
                ApiResult.Reason.NotConfigured,
                "No API base URL. Set BACKLOGUE_API_BASE_URL in local.properties.",
            )
        }
        return try {
            val response = block()
            when {
                response.status.isSuccess() -> ApiResult.Success(response)
                response.status.value == 429 -> ApiResult.Failure(ApiResult.Reason.RateLimited)
                response.status.value >= 500 -> ApiResult.Failure(ApiResult.Reason.ServerError)
                else -> ApiResult.Failure(
                    ApiResult.Reason.Unknown,
                    "HTTP ${response.status.value}",
                )
            }
        } catch (cancellation: kotlin.coroutines.cancellation.CancellationException) {
            // Search re-runs on every keystroke, so cancellation is the common
            // case, not an error. Letting it surface as Failure would flash an
            // error state on every character typed.
            throw cancellation
        } catch (error: Throwable) {
            ApiResult.Failure(ApiResult.Reason.Offline, error.message)
        }
    }
}
