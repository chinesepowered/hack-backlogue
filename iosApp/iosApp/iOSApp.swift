import SwiftUI
import ComposeApp

/**
 * The iOS entry point.
 *
 * Everything above the OS boundary is shared Kotlin — the same Compose
 * Multiplatform UI Android renders, not a parallel SwiftUI implementation. The
 * Swift here exists only to do what Kotlin cannot: own the app lifecycle, and
 * receive the share extension's payload.
 */
@main
struct iOSApp: App {
    init() {
        KoinKt.doInitKoin(
            config: SnagConfig(
                apiBaseUrl: Secrets.apiBaseUrl,
                revenueCatApiKey: Secrets.revenueCatApiKey,
                oneSignalAppId: Secrets.oneSignalAppId,
                debug: Secrets.isDebug
            )
        )
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .ignoresSafeArea(.all)
                // The share extension writes into the shared app group and
                // opens snag://capture; this is where that gets picked up.
                .onOpenURL { url in
                    SharedCaptureInbox.shared.handle(url: url)
                }
        }
    }
}

struct ContentView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        MainViewControllerKt.MainViewController(
            initialSharedText: SharedCaptureInbox.shared.takePending()
        )
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
