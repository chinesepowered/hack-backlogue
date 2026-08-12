import Foundation

/**
 * The hand-off between the share extension and the app.
 *
 * A share extension is a separate process with its own sandbox, so it cannot
 * call into the running app. The standard route is a shared App Group container:
 * the extension writes the payload, opens `backlogue://capture`, and the app reads it
 * on launch. That indirection is why iOS capture is native Swift on both sides
 * while Android gets away with a plain Activity.
 *
 * `take` semantics are deliberate — the payload is consumed on read, so a
 * relaunch does not re-import a game the user already saved.
 */
final class SharedCaptureInbox {
    static let shared = SharedCaptureInbox()

    /// Must match the App Group capability on both the app and the extension.
    static let appGroupId = "group.com.chinesepowered.backlogue"
    private static let pendingKey = "pendingSharedText"

    private var defaults: UserDefaults? {
        UserDefaults(suiteName: Self.appGroupId)
    }

    func store(text: String) {
        defaults?.set(text, forKey: Self.pendingKey)
    }

    func handle(url: URL) {
        guard url.scheme == "backlogue" else { return }
        // The payload itself already sits in the app group; the URL is only a
        // wake-up signal, which keeps arbitrarily long shared text out of a URL.
    }

    func takePending() -> String? {
        guard let defaults, let text = defaults.string(forKey: Self.pendingKey) else {
            return nil
        }
        defaults.removeObject(forKey: Self.pendingKey)
        return text.isEmpty ? nil : text
    }
}
