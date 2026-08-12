package com.chinesepowered.backlogue.domain.capture

import com.chinesepowered.backlogue.domain.model.DiscoverySource

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

        return CaptureCandidate(
            query = cleaned.text,
            rawText = raw,
            url = url,
            source = source,
            confidence = when {
                cleaned.text.isBlank() -> CaptureConfidence.Low
                // We only got a result by putting back words we had classified
                // as noise, so we are guessing. Send the user to a search box.
                cleaned.usedFallback -> CaptureConfidence.Low
                // A short result after heavy stripping usually means we found
                // the title. A long one means we mostly failed to strip.
                cleaned.text.split(' ').size <= 6 -> CaptureConfidence.Medium
                else -> CaptureConfidence.Low
            },
        )
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
                    ?.let { cleanTitle(it).text }
            }

            else -> null
        }?.takeIf { it.isNotBlank() }
    }

    private fun String.slugToTitle(): String =
        replace('_', ' ').replace('-', ' ').trim()

    private data class CleanResult(val text: String, val usedFallback: Boolean)

    private fun cleanTitle(input: String): CleanResult {
        val base = stripOutletSuffix(
            bracketedRegex.replace(emojiRegex.replace(input, " "), " ")
        )

        val kept = tokenize(stripNoisePhrases(base)).filter(::isMeaningful)
        if (kept.isNotEmpty()) return CleanResult(join(kept), usedFallback = false)

        // Everything we removed was, in fact, the title — "Gameplay Trailer"
        // shared with no other context, say. Reinstate it rather than handing
        // the user an empty search box; the caller downgrades confidence so the
        // UI knows to ask rather than assume.
        val baseWords = tokenize(base)
        val keptBase = baseWords.filter(::isMeaningful)
        val fallback = keptBase.ifEmpty { baseWords }
        return CleanResult(join(fallback), usedFallback = true)
    }

    /**
     * Everything after a trailing separator is usually the channel or outlet:
     * "Silksong Review | IGN". Only cut when what follows actually looks like
     * one, so "Dark Souls | Remastered" survives intact.
     */
    private fun stripOutletSuffix(input: String): String {
        var text = input
        for (separator in listOf('|', '—', '–', '·')) {
            val idx = text.lastIndexOf(separator)
            if (idx > 0) {
                val tail = text.substring(idx + 1).trim().lowercase()
                if (tail.isNotEmpty() && outletNames.any { tail == it || tail.startsWith("$it ") }) {
                    text = text.substring(0, idx)
                }
            }
        }
        return text
    }

    /**
     * Blanks out noise phrases in place. Replacing with equal-length spaces
     * rather than deleting keeps every index aligned with [lowered], so the
     * whole pass can be driven off a single lowercased copy.
     */
    private fun stripNoisePhrases(input: String): String {
        val lowered = input.lowercase()
        var working = input
        for (phrase in noisePhrases) {
            var searchFrom = 0
            while (true) {
                val idx = lowered.indexOf(phrase, searchFrom, ignoreCase = true)
                if (idx < 0) break
                val endIdx = idx + phrase.length
                // Whole-word boundaries only, so "review" does not eat the
                // "Review" inside a longer real word.
                val beforeOk = idx == 0 || !lowered[idx - 1].isLetterOrDigit()
                val afterOk = endIdx >= lowered.length || !lowered[endIdx].isLetterOrDigit()
                if (beforeOk && afterOk && endIdx <= working.length) {
                    working = working.replaceRange(idx, endIdx, " ".repeat(phrase.length))
                }
                searchFrom = endIdx
            }
        }
        return working
    }

    private fun tokenize(input: String): List<String> = input
        .split(' ', '\n', '\t')
        .map { it.trim().trim('-', '–', '—', '|', ':', ',', '.', '!', '?', '"', '\'', '·') }
        .filter { it.isNotBlank() }

    private fun isMeaningful(word: String): Boolean {
        val lower = word.lowercase()
        return when {
            lower in tagWords -> false
            // Hype words only go if the author was shouting them, since plenty
            // of real titles contain "New" or "Best" in normal case.
            word == word.uppercase() && word.length > 1 && lower in hypeWords -> false
            else -> true
        }
    }

    private fun join(words: List<String>): String =
        words.joinToString(" ").trim().trim('-', ':', '|', ',').trim()
}
