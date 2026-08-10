import UIKit
import Social
import UniformTypeIdentifiers

/**
 * The iOS half of capture-at-discovery.
 *
 * Presents no UI of its own. A share extension that shows a compose sheet costs
 * the user two extra taps and a dismissal, which is exactly the friction this
 * product exists to remove — so this one takes the payload, stashes it in the
 * shared App Group, opens the app, and gets out of the way.
 */
class ShareViewController: UIViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
        extractSharedText { [weak self] text in
            guard let self else { return }
            if let text, !text.isEmpty {
                SharedCaptureInbox.shared.store(text: text)
            }
            self.openHostAppAndFinish()
        }
    }

    /**
     * A single share can carry both a URL and its page title as separate
     * attachments — that is how a YouTube share arrives. Both are collected and
     * joined, because the parser needs the title for the game name and the URL
     * for the provenance.
     */
    private func extractSharedText(completion: @escaping (String?) -> Void) {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let providers = item.attachments else {
            completion(nil)
            return
        }

        var collected: [String] = []
        let group = DispatchGroup()

        for provider in providers {
            if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.url.identifier) { value, _ in
                    if let url = value as? URL { collected.append(url.absoluteString) }
                    group.leave()
                }
            } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                group.enter()
                provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { value, _ in
                    if let text = value as? String { collected.append(text) }
                    group.leave()
                }
            }
        }

        group.notify(queue: .main) {
            completion(collected.isEmpty ? nil : collected.joined(separator: "\n"))
        }
    }

    private func openHostAppAndFinish() {
        guard let url = URL(string: "snag://capture") else {
            extensionContext?.completeRequest(returningItems: nil)
            return
        }

        // Extensions have no direct openURL, so walk the responder chain for an
        // application that will do it. Fragile by nature, hence the fallback:
        // worst case the payload is still saved and appears next launch.
        var responder: UIResponder? = self
        while let current = responder {
            if let application = current as? UIApplication {
                application.open(url, options: [:]) { [weak self] _ in
                    self?.extensionContext?.completeRequest(returningItems: nil)
                }
                return
            }
            responder = current.next
        }

        extensionContext?.completeRequest(returningItems: nil)
    }
}
