package com.backlogue.app.domain.model

/**
 * Where a player was standing when they added something.
 *
 * This is the feature that turns a list into a story. Six months on, "Hollow
 * Knight: Silksong — from a YouTube video, March 4" is a memory; the same row
 * without provenance is homework. It costs one extra column and it is the thing
 * users will screenshot.
 */
enum class DiscoverySource(val id: String) {
    YouTube("youtube"),
    Reddit("reddit"),
    Steam("steam"),
    Twitch("twitch"),
    Bluesky("bluesky"),
    Mastodon("mastodon"),
    X("x"),
    Discord("discord"),
    TikTok("tiktok"),
    AppStore("appstore"),
    Web("web"),
    Manual("manual"),
    ;

    /** Reads as the tail of "From ___". */
    val label: String
        get() = when (this) {
            YouTube -> "a YouTube video"
            Reddit -> "Reddit"
            Steam -> "Steam"
            Twitch -> "Twitch"
            Bluesky -> "Bluesky"
            Mastodon -> "Mastodon"
            X -> "X"
            Discord -> "Discord"
            TikTok -> "TikTok"
            AppStore -> "the App Store"
            Web -> "the web"
            Manual -> "search"
        }

    companion object {
        fun fromId(id: String?): DiscoverySource =
            entries.firstOrNull { it.id == id } ?: Manual

        /**
         * Classifies a shared URL by host. Deliberately generous with matching —
         * a share sheet hands us youtu.be, m.youtube.com, and
         * www.youtube.com interchangeably, and getting this wrong is invisible
         * to the user in the worst way: the memory is just slightly off.
         */
        fun fromUrl(url: String?): DiscoverySource {
            if (url.isNullOrBlank()) return Manual
            val host = url
                .substringAfter("://", url)
                .substringBefore('/')
                .substringBefore(':')
                .removePrefix("www.")
                .removePrefix("m.")
                .lowercase()

            return when {
                host.endsWith("youtube.com") || host == "youtu.be" -> YouTube
                host.endsWith("reddit.com") || host == "redd.it" -> Reddit
                host.endsWith("steampowered.com") || host.endsWith("steamcommunity.com") -> Steam
                host.endsWith("twitch.tv") -> Twitch
                host.endsWith("bsky.app") -> Bluesky
                host.endsWith("mastodon.social") || host.startsWith("mastodon.") -> Mastodon
                host == "x.com" || host.endsWith("twitter.com") -> X
                host.endsWith("discord.com") || host.endsWith("discord.gg") -> Discord
                host.endsWith("tiktok.com") -> TikTok
                host.endsWith("apple.com") -> AppStore
                else -> Web
            }
        }
    }
}
