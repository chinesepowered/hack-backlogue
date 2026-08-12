package com.chinesepowered.backlogue

import androidx.compose.ui.window.ComposeUIViewController
import com.chinesepowered.backlogue.di.backlogueModules
import com.chinesepowered.backlogue.domain.capture.ShareTextParser
import org.koin.core.context.startKoin
import platform.UIKit.UIViewController

/**
 * Bridges Compose Multiplatform into UIKit.
 *
 * @param initialSharedText payload handed over by the share extension via the
 *        App Group, already consumed on the Swift side so it cannot re-import.
 */
fun MainViewController(initialSharedText: String? = null): UIViewController =
    ComposeUIViewController {
        App(initialCandidate = initialSharedText?.let(ShareTextParser::parse))
    }

/**
 * Called once from `iOSApp.init`. Koin cannot start inside
 * [ComposeUIViewController] because the view controller is rebuilt on
 * configuration changes and starting Koin twice throws.
 */
fun initKoin(config: BacklogueConfig) {
    startKoin {
        modules(backlogueModules(config))
    }
}
