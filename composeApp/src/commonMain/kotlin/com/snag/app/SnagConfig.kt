package com.snag.app

/**
 * Runtime configuration, supplied by each platform's entry point.
 *
 * None of these are secrets — the RevenueCat and OneSignal values are public
 * client keys, and the API base URL is a public endpoint. The genuinely secret
 * material (the Twitch client secret IGDB requires) lives only in the Cloudflare
 * Worker and never reaches a device. That split is the reason the app talks to
 * the Worker instead of IGDB directly.
 *
 * Every field defaults to empty and every consumer degrades gracefully, so a
 * fresh clone with no credentials still builds, launches, and can be navigated.
 */
data class SnagConfig(
    val apiBaseUrl: String = "",
    val revenueCatApiKey: String = "",
    val oneSignalAppId: String = "",
    val debug: Boolean = false,
)
