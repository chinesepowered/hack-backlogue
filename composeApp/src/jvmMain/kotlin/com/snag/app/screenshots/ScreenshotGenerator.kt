package com.snag.app.screenshots

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.ImageComposeScene
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Density
import com.snag.app.domain.model.BacklogStatus
import com.snag.app.domain.model.DiscoverySource
import com.snag.app.domain.model.Game
import com.snag.app.domain.model.SnaggedGame
import com.snag.app.ui.detail.DetailContent
import com.snag.app.ui.detail.DetailUiState
import com.snag.app.ui.pile.PileContent
import com.snag.app.ui.pile.PileUiState
import com.snag.app.ui.theme.SnagTheme
import androidx.compose.ui.unit.dp
import kotlinx.datetime.LocalDate
import org.jetbrains.skia.EncodedImageFormat
import java.io.File
import kotlin.time.Instant

/**
 * Renders the real screens to PNG without a device, an emulator, or a Mac.
 *
 * Compose can compose and lay out entirely offscreen through Skia, which means
 * store screenshots come from the same composables that ship — not a mock-up
 * that quietly drifts from the app. Output is exactly 1179x2556, the size
 * Devpost asks for, with no device frame.
 *
 * Cover art renders as the built-in gradient placeholder rather than real key
 * art: fetching from IGDB needs credentials this environment does not have, and
 * an image loaded asynchronously would not arrive before the frame is captured
 * anyway. The placeholder is deterministic per title, so these are reproducible.
 */

/** iPhone 15 Pro: 393x852 points at 3x = 1179x2556 pixels. */
private const val WidthPx = 1179
private const val HeightPx = 2556
private const val Density = 3f

/** Roughly an iPhone 15 Pro status bar, so the render matches the device. */
private val StatusBarInset = 44.dp

fun main(args: Array<String>) {
    val outputDir = File(args.firstOrNull() ?: "screenshots").apply { mkdirs() }

    val counts = sampledPile.groupingBy { it.status }.eachCount()

    render(outputDir, "01-pile") {
        PileContent(
            state = PileUiState(
                items = sampledPile,
                statusCounts = counts,
                totalCount = sampledPile.size.toLong(),
                isLoading = false,
            ),
            onSelectFilter = {},
            onOpenGame = {},
            onAddGame = {},
        )
    }

    render(outputDir, "02-empty") {
        PileContent(
            state = PileUiState(items = emptyList(), totalCount = 0, isLoading = false),
            onSelectFilter = {},
            onOpenGame = {},
            onAddGame = {},
        )
    }

    render(outputDir, "03-playing") {
        PileContent(
            state = PileUiState(
                items = sampledPile.filter { it.status == BacklogStatus.Playing },
                statusCounts = counts,
                filter = BacklogStatus.Playing,
                totalCount = sampledPile.size.toLong(),
                isLoading = false,
            ),
            onSelectFilter = {},
            onOpenGame = {},
            onAddGame = {},
        )
    }

    render(outputDir, "04-detail") {
        DetailContent(
            state = DetailUiState(item = sampledPile[3], isLoading = false),
            onBack = {},
            onSetStatus = {},
            onRate = {},
            onRemove = {},
        )
    }

    println("Wrote ${outputDir.listFiles()?.size ?: 0} screenshots to ${outputDir.absolutePath}")
}

private fun render(dir: File, name: String, content: @Composable () -> Unit) {
    val scene = ImageComposeScene(
        width = WidthPx,
        height = HeightPx,
        density = Density(Density),
    ) {
        SnagTheme(darkTheme = true) {
            // Offscreen rendering has no window insets, so the status-bar area
            // is added back by hand. Without it the title sits flush against
            // the top edge, which is not what the app looks like on a device.
            Box(
                Modifier
                    .fillMaxSize()
                    .background(SnagTheme.colors.background)
                    .padding(top = StatusBarInset),
            ) {
                content()
            }
        }
    }
    try {
        val image = scene.render()
        val data = image.encodeToData(EncodedImageFormat.PNG)
            ?: error("Skia failed to encode $name")
        File(dir, "$name.png").writeBytes(data.bytes)
        println("  $name.png  ${WidthPx}x$HeightPx")
    } finally {
        scene.close()
    }
}

private fun game(
    id: Long,
    name: String,
    year: Int?,
    summary: String? = null,
) = Game(
    igdbId = id,
    name = name,
    coverUrl = null,
    releaseDate = year?.let { LocalDate(it, 6, 1) },
    summary = summary,
)

private fun snagged(
    id: Long,
    game: Game,
    status: BacklogStatus,
    source: DiscoverySource,
    rating: Int? = null,
    daysAgo: Long = 0,
) = SnaggedGame(
    id = id,
    game = game,
    status = status,
    rating = rating,
    note = null,
    sourceUrl = null,
    source = source,
    snaggedAt = Instant.fromEpochMilliseconds(1_770_000_000_000L - daysAgo * 86_400_000L),
    startedAt = null,
    finishedAt = null,
    sortIndex = id.toDouble(),
)

/**
 * A pile that looks like a real person's, not a demo: a couple of things in
 * progress, a long tail of wishlist, one game they bounced off. Provenance is
 * varied because that line is the point of the product.
 */
private val sampledPile = listOf(
    snagged(1, game(1, "Hollow Knight: Silksong", 2026), BacklogStatus.Playing, DiscoverySource.YouTube, daysAgo = 3),
    snagged(2, game(2, "Outer Wilds", 2019), BacklogStatus.Playing, DiscoverySource.Reddit, daysAgo = 12),
    snagged(3, game(3, "Blue Prince", 2025), BacklogStatus.Backlog, DiscoverySource.Steam, daysAgo = 20),
    snagged(
        4,
        game(
            4,
            "Pentiment",
            2022,
            "A narrative adventure set in 16th-century Bavaria, where an artist " +
                "is drawn into a series of murders across twenty-five years.",
        ),
        BacklogStatus.Beaten,
        DiscoverySource.Bluesky,
        rating = 9,
        daysAgo = 60,
    ),
    snagged(5, game(5, "Animal Well", 2024), BacklogStatus.Backlog, DiscoverySource.Twitch, daysAgo = 31),
    snagged(6, game(6, "Return of the Obra Dinn", 2018), BacklogStatus.Wishlist, DiscoverySource.YouTube, daysAgo = 44),
    snagged(7, game(7, "Citizen Sleeper 2", 2025), BacklogStatus.Wishlist, DiscoverySource.Mastodon, daysAgo = 50),
    snagged(8, game(8, "Balatro", 2024), BacklogStatus.Bounced, DiscoverySource.Discord, rating = 6, daysAgo = 70),
)
