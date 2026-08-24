package com.chinesepowered.backlogue

import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.chinesepowered.backlogue.di.backlogueModules
import org.koin.core.context.startKoin
import java.io.File
import java.util.Properties

/**
 * Backlogue on the desktop.
 *
 * The same Compose Multiplatform UI Android renders — not a port, not a
 * reimplementation. The only thing this file does that the Android entry point
 * does not is open a window.
 *
 * Desktop matters here for a practical reason as well as a philosophical one:
 * a lot of game discovery happens on a PC, in a browser tab, next to the store
 * page you are already looking at. A backlog that only exists on your phone is
 * one you have to remember to open.
 */
fun main() {
    startKoin { modules(backlogueModules(desktopConfig())) }

    application {
        // Sized to a phone-ish aspect so the shared layouts, which were designed
        // for a narrow column, do not stretch into unreadable line lengths.
        val state = rememberWindowState(size = DpSize(460.dp, 900.dp))
        Window(
            onCloseRequest = ::exitApplication,
            state = state,
            title = "Backlogue",
        ) {
            App()
        }
    }
}

/**
 * Configuration, in order of preference: environment variables, then
 * `local.properties` at the repo root.
 *
 * Reading local.properties means a desktop run picks up exactly the same
 * settings as the Android build with no second file to keep in sync — which is
 * the difference between the desktop target being genuinely usable and it being
 * a demo that always shows "search isn't set up".
 */
private fun desktopConfig(): BacklogueConfig {
    val props = Properties().apply {
        listOf(File("local.properties"), File("../local.properties"))
            .firstOrNull { it.exists() }
            ?.inputStream()
            ?.use { load(it) }
    }

    fun value(key: String): String =
        (System.getenv(key) ?: props.getProperty(key) ?: "").trim()

    return BacklogueConfig(
        apiBaseUrl = value("BACKLOGUE_API_BASE_URL"),
        // Desktop has no store, so purchases are unavailable by construction —
        // createProAccess on the JVM always returns the free-tier stub.
        revenueCatApiKey = "",
        oneSignalAppId = "",
        debug = true,
    )
}
