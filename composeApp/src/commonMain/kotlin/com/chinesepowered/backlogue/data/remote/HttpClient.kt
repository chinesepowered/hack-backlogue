package com.chinesepowered.backlogue.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

/**
 * The engine is the only part of networking that differs per platform — OkHttp
 * on Android, Darwin on iOS — so it is the only part behind expect/actual.
 * Everything else, including timeouts and JSON behaviour, is shared so the two
 * platforms cannot quietly drift apart.
 */
expect fun platformHttpClient(config: HttpClientConfig<*>.() -> Unit): HttpClient

val BacklogueJson: Json = Json {
    ignoreUnknownKeys = true
    isLenient = true
    explicitNulls = false
    coerceInputValues = true
}

fun createBacklogueHttpClient(): HttpClient = platformHttpClient {
    install(ContentNegotiation) {
        json(BacklogueJson)
    }
    install(HttpTimeout) {
        // Search runs while the user is waiting mid-share with a video paused
        // behind them. Failing fast and offering a manual search beats a
        // spinner that might resolve in fifteen seconds.
        requestTimeoutMillis = 8_000
        connectTimeoutMillis = 5_000
        socketTimeoutMillis = 8_000
    }
}
