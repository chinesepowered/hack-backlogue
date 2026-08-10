package com.snag.app.domain.capture

import com.snag.app.domain.model.DiscoverySource

/**
 * How confident we are that [CaptureCandidate.query] is actually a game name.
 *
 * This drives UI, not just logging: on [High] we can resolve and save in one
 * tap, on [Low] we should show the search field already focused rather than
 * pretend we understood.
 */
enum class CaptureConfidence { High, Medium, Low }

data class CaptureCandidate(
    /** What we will send to IGDB. */
    val query: String,
    /** The untouched share payload, kept so we can show "you shared: ...". */
    val rawText: String,
    val url: String?,
    val source: DiscoverySource,
    val confidence: CaptureConfidence,
)

/**
 * Turns whatever the share sheet handed us into a game search.
 *
 * This is the least glamorous file in the app and the one the whole product
 * rests on. A share from YouTube arrives as a clickbait title plus a link; from
 * Steam as a URL with the game name sitting right there in the path; from
 * Reddit as a thread slug. Getting a usable query out of all three without
 * asking the user to retype anything is the difference between "saved it in one
 * tap while the video kept playing" and "opened an app and gave up".
 *
 * The rule followed throughout: prefer under-cleaning to over-cleaning. IGDB's
 * search tolerates extra words far better than it tolerates a butchered title.
 */
object ShareTextParser {

    private val urlRegex = Regex("""https?://\S+""", RegexOption.IGNORE_CASE)

    /** [4K], (Official Trailer), 【…】 — decoration, never part of a title. */
    private val bracketedRegex = Regex("""[\[({【][^\])}】]*[\])}】]""")

    /** Emoji and pictographs, which YouTube titles are full of. */
    private val emojiRegex = Regex(
        "[\\uD83C-\\uDBFF\\uDC00-\\uDFFF]+|[\\u2600-\\u27BF]|[\\uFE0F\\u200D]"
    )

    /**
     * Phrases that describe *content about* a game rather than the game. Order
     * matters: longer phrases first so "official trailer" is consumed before
     * "trailer" can strand the word "official".
     */
    private val noisePhrases = listOf(
        "official gameplay trailer", "official reveal trailer", "official announcement trailer",
        "official launch trailer", "official story trailer", "cinematic trailer",
        "gameplay trailer", "reveal trailer", "announcement trailer", "launch trailer",
        "story trailer", "official trailer", "release date trailer", "date trailer",
        "everything we know", "first impressions", "hands on preview", "hands-on preview",
        "early access review", "in progress review", "review in progress",
        "full walkthrough", "no commentary", "let's play", "lets play",
        "first look", "gameplay demo", "gameplay reveal", "gameplay walkthrough",
        "official teaser", "video review", "spoiler free review", "spoiler-free review",
        "is it worth it", "should you play", "before you buy",
        "reaction", "impressions", "walkthrough", "playthrough", "speedrun",
        "gameplay", "trailer", "teaser", "review", "preview", "livestream",
        "live stream", "podcast", "unboxing", "tier list", "retrospective",
    )

    /** Platform and quality tags that ride along on video titles. */
    private val tagWords = setOf(
        "4k", "8k", "1080p", "1440p", "2160p", "60fps", "120fps", "hdr", "rtx",
        "ps4", "ps5", "ps6", "xbox", "series", "switch", "switch2", "pc", "steam",
        "deck", "vr", "psvr", "hd", "uhd", "remastered4k",
    )

    /** All-caps hype that never appears in an actual title. */
    private val hypeWords = setOf(
        "finally", "insane", "omg", "wow", "crazy", "shocking", "must", "watch",
        "breaking", "huge", "massive", "leaked", "leak", "confirmed", "explained",
        "ranked", "best", "worst", "top", "new", "update", "news",
    )

    /** Channel/outlet suffixes after a trailing separator. */
    private val outletNames = setOf(
        "ign", "gamespot", "gameinformer", "game informer", "polygon", "kotaku",
        "eurogamer", "pc gamer", "digital foundry", "easy allies", "skill up",
        "skillup", "videogamedunkey", "dunkey", "acg", "gmanlives", "noclip",
        "nintendo", "playstation", "xbox", "steam", "epic games", "bandai namco",
        "square enix", "capcom", "ubisoft", "ea", "rockstar games",
    )

    fun parse(sharedText: String): CaptureCandidate {
        val raw = sharedText.trim()
        val url = urlRegex.find(raw)?.value?.trimEnd('.', ',', ')', ']')
        val source = DiscoverySource.fromUrl(url)

        // A URL slug that contains the game name is worth far more than a title
        // we have to guess at, so try that path first.
        val fromSlug = url?.let { extractFromUrl(it, source) }
        if (fromSlug != null && fromSlug.isNotBlank()) {
            return CaptureCandidate(
                query = fromSlug,
                rawText = raw,
                url = url,
                source = source,
                confidence = CaptureConfidence.High,
            )
        }

        val titleText = url?.let { raw.replace(it, " ") } ?: raw
        val cleaned = cleanTitle(titleText)

        return when {
            cleaned.isBlank() -> CaptureCandidate(
                query = "",
                rawText = raw,
                url = url,
                source = source,
                confidence = CaptureConfidence.Low,
            )

            else -> CaptureCandidate(
                query = cleaned,
                rawText = raw,
                url = url,
                source = source,
                // A short, clean result after heavy stripping usually means we
                // found the title. A long one means we mostly failed to strip.
                confidence = if (cleaned.split(' ').size <= 6) {
                    CaptureConfidence.Medium
                } else {
                    CaptureConfidence.Low
                },
            )
        }
    }

    /**
     * Some hosts put the game name straight in the path. Steam is the best
     * case: `/app/1030300/Hollow_Knight_Silksong/` needs only underscore
     * replacement to become a perfect query.
     */
    private fun extractFromUrl(url: String, source: DiscoverySource): String? {
        val path = url.substringAfter("://", url).substringAfter('/', "")
        val segments = path.split('/').filter { it.isNotBlank() }

        return when (source) {
            DiscoverySource.Steam -> {
                val appIndex = segments.indexOf("app")
                segments.getOrNull(appIndex + 2)?.takeIf { appIndex >= 0 }?.slugToTitle()
            }

            DiscoverySource.Reddit -> {
                val commentsIndex = segments.indexOf("comments")
                segments.getOrNull(commentsIndex + 2)
                    ?.takeIf { commentsIndex >= 0 }
                    ?.slugToTitle()
                    ?.let { cleanTitle(it) }
            }

            else -> null
        }?.takeIf { it.isNotBlank() }
    }

    private fun String.slugToTitle(): String =
        replace('_', ' ').replace('-', ' ').trim()

    private fun cleanTitle(input: String): String {
        var text = input

        text = emojiRegex.replace(text, " ")
        text = bracketedRegex.replace(text, " ")

        // Everything after a trailing separator is usually the channel or
        // outlet: "Silksong Review | IGN". Only cut when what follows actually
        // looks like an outlet, so we never truncate "Dark Souls | Remastered".
        for (separator in listOf('|', '—', '–', '·')) {
            val idx = text.lastIndexOf(separator)
            if (idx > 0) {
                val tail = text.substring(idx + 1).trim().lowercase()
                if (tail.isNotEmpty() && outletNames.any { tail == it || tail.startsWith("$it ") }) {
                    text = text.substring(0, idx)
                }
            }
        }

        val lowered = text.lowercase()
        var working = text
        for (phrase in noisePhrases) {
            var searchFrom = 0
            while (true) {
                val idx = lowered.indexOf(phrase, searchFrom, ignoreCase = true)
                if (idx < 0) break
                // Only strip on whole-word boundaries.
                val beforeOk = idx == 0 || !lowered[idx - 1].isLetterOrDigit()
                val endIdx = idx + phrase.length
                val afterOk = endIdx >= lowered.length || !lowered[endIdx].isLetterOrDigit()
                if (beforeOk && afterOk && idx + phrase.length <= working.length) {
                    working = working.replaceRange(idx, endIdx, " ".repeat(phrase.length))
                }
                searchFrom = endIdx
            }
        }
        text = working

        val words = text
            .split(' ', '\n', '\t')
            .map { it.trim().trim('-', '–', '—', '|', ':', ',', '.', '!', '?', '"', '\'', '·') }
            .filter { it.isNotBlank() }

        val kept = words.filter { word ->
            val lower = word.lowercase()
            when {
                lower in tagWords -> false
                // Hype words only go if the author was shouting them.
                word == word.uppercase() && word.length > 1 && lower in hypeWords -> false
                else -> true
            }
        }

        // If stripping removed everything, the "noise" was the title. Fall back
        // to the words we started with rather than returning nothing.
        val result = (if (kept.isEmpty()) words else kept).joinToString(" ")
        return result.trim().trim('-', ':', '|', ',').trim()
    }
}
