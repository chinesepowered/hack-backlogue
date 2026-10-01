# Backlogue: Devpost award answers

Private to judges and organisers. Each section is pasted into the field whose
id is in its heading. **A blank field is how you opt out of a category**, so the
blanks listed at the end are deliberate.

Every factual claim below was checked against the code on 2026-09-28. Stage 4
of judging has a RevenueCat developer install the app specifically to verify
claims, so if the app changes, re-check this file.

House style: no em dashes.

---

## Plain fields

| Id | Field | Value |
| --- | --- | --- |
| 27378 | Includes app icon | Yes |
| 27379 | Includes screenshot | Yes |
| 27380 | First version released Aug 1 to Sep 30 | Yes. Live on Google Play Sep 30, 2026 |
| 27381 | Staff or sponsor | No |
| 27382 | App type | Android |
| 27384 | Google Play URL | https://play.google.com/store/apps/details?id=com.chinesepowered.backlogue |
| 27793 | Next Gen repo | https://github.com/chinesepowered/hack-backlogue |
| 27792 | Next Gen student email | `clai74@mail.ccsf.edu` |
| 28375 | Minor entrant consent | Yes (the entrant is not a minor) |
| 28118 | RevenueCat project ID | `projb3ae91a4` |
| 28135 | Promo code | `JUDGING`, a Play custom code for `backlogue_pro_monthly` |
| 27943 | Influencer category | Gaming (Mr Lewis Blogs Gaming) |
| 28128 | OneSignal App ID | `5c4fb51b-9266-4ba7-90e7-2c381417c858` |
| 27791 | Growth Fund | No |

---

## 27944: Influencer Award, Gaming

The brief asks for a gaming bucket list where players can save, organise, complete and rate the games they want to play, and it asks whether managing a backlog feels enjoyable rather than like another chore. Backlogue treats that second part as the real design problem.

**Saving** happens where discovery happens. Backlogue is a share target: share a YouTube video, a Reddit thread or a Steam page into it, and the game is in your pile in one tap without leaving what you were watching. Every tracker makes you stop, open an app and search, which is why their lists are never complete.

**Organising** uses five statuses: Wishlist, Backlog, Playing, Beaten and Bounced, with a filter chip for each status that has something in it.

**Completing** a game marks it Beaten. Giving up on one marks it Bounced, not Abandoned, because "I bounced off it" is what players actually say and it puts the mismatch on the game instead of on the player.

**Rating** is 1 to 10 and only appears once a game is resolved. Asking someone to score a game they haven't finished is how trackers fill up with noise.

**Not feeling like a chore** is the part the whole app is built around. There are no numbers anywhere: no completion percentage, no unplayed counter, no progress rings, no red badges, no overdue states. Those are the mechanics that turn a collection into an obligation. Every game also remembers where you found it ("From a YouTube video"), so the list reads like a record of your own taste rather than a to-do list.

## 28121: Ship Kotlin Everywhere

Android and desktop run from one Compose Multiplatform codebase. They render the same composables, not a shared core with two hand-written front ends. The only platform-specific UI is the capture surface, which is where the operating systems genuinely differ.

The interesting part is where the seams were drawn, so here is how it was done rather than what was built.

**expect/actual appears five times, each at a real platform boundary:** the SQLite driver, the HTTP engine, the IO dispatcher, the Koin platform module, and the purchases factory. Everything else that looks platform-shaped goes through dependency injection instead, which keeps shared code free of platform branching. A push-registration seam that briefly became an expect/actual was deleted again once each platform module could simply bind its own implementation.

**RevenueCat publishes no JVM artifact,** so it couldn't stay in commonMain once a desktop target existed. It moved into a `mobile` source set shared by Android and iOS, behind a `createProAccess` factory. That's a more honest structure anyway: in-app purchases are a phone concern, and a platform without a store now gets a free-tier implementation instead of a link error.

**The desktop target started as a screenshot renderer.** Compose can rasterise offscreen through Skia, so a JVM target was added just to generate store screenshots without an emulator. Giving it a window and a persistent database turned it into a real second platform in about twenty minutes, which is the strongest argument for Compose Multiplatform we can make.

**The domain layer imports no framework.** No Compose, no Ktor, no SQLDelight, so the share-text parser the product rests on is tested in plain Kotlin with no device and no network. **Screens are state in, callbacks out,** which is what lets the offscreen renderer draw the real screens without a database or a coroutine that has had time to emit.

**On iOS,** the shared Kotlin compiles and links. A public GitHub Actions workflow on a macOS runner builds `ComposeApp.framework` for the iOS simulator with RevenueCat included, because `purchases-kmp` lives in the source set iOS compiles. What isn't done is the Xcode packaging and an App Store release. That's packaging work, not shared-code work.

- iOS build runs: https://github.com/chinesepowered/hack-backlogue/actions/workflows/ios.yml
- Source: https://github.com/chinesepowered/hack-backlogue

Two Compose Multiplatform 1.11 pitfalls are documented where the next person will hit them, in the build file itself: `components-resources` no longer publishing for `iosX64`, which fails with an error that never mentions the Intel simulator, and `compose.material3` not bundling icons-core the way the Android artifact does. https://github.com/chinesepowered/hack-backlogue/blob/main/composeApp/build.gradle.kts#L74

## 28129: Keep Them Coming Back (OneSignal)

The deployed campaign is a release-date alert, sent through the OneSignal REST API from a Cloudflare Worker. The Worker sweeps the games people are watching every hour and sends a push only on a genuine change: a watched game gained a release date, its date moved, or it came out.

Three decisions, all of them about not sending:

1. **Snapshotting is the whole trick.** The Worker records each game's state between runs. Without that, the obvious implementation re-sends "out now" every hour for a week, which is how an app gets muted and then deleted. The first sighting of a game writes a baseline and sends nothing at all.
2. **Only unfinished games are watched.** A game already beaten or bounced off doesn't need a release alert, and registering the whole pile would make the sweep do work for every game anyone ever saved.
3. **Permission is requested late, and only once there's a reason.** The prompt appears the first time the pile holds something worth being notified about, never on first launch, which is how apps get permanently denied.

The test every notification has to pass: would the player be glad it arrived? A backlog tracker has endless excuses to nag ("you have 47 unplayed games!"), and every one of them makes the pile feel like a debt, which is the exact feeling this app is designed against.

**Integration.** A `PushRegistrar` wraps the OneSignal Android SDK behind an interface. `AlertSync` mirrors the unfinished part of the pile to the Worker's `/v1/watch` endpoint, debounced so three quick additions become one registration. The subscription id is polled briefly after start, because OneSignal registers asynchronously and asking too early fails silently until the next pile change. The Worker's scheduled handler batches by game, so one release fans out to every watcher in a single REST call.

**Verified end to end** on an Android 36 emulator: the device got a subscription id, `AlertSync` registered it with the Worker, and a notification sent through the OneSignal REST API arrived and displayed. There are no engagement numbers yet to report.

## 27391: RevenueCat Design Award

The design argument is about which mechanics were refused. These are the details worth noticing.

**No numbers anywhere.** No completion percentage, no counter of unplayed games, no progress rings, no red badges, no overdue states. A status with nothing in it doesn't get a filter chip at all, so a new player's filter row isn't a row of zeroes.

**One loud colour.** The coral accent is reserved for the single genuinely happy action, adding a game. Nothing else is allowed to shout, and there are no red warning states anywhere. The Pro badge in the pile header is outline and secondary text on purpose: spending the app's one loud colour on an upsell would undo the point.

**Dark-first and deferential to cover art.** Cover art is the best thing on the screen and we didn't draw it. In dark mode the app is near-black, which is what the screenshots show. It follows the system theme, and the demo video was recorded on a light-mode phone, so it shows the light palette built from the same tokens.

**Placeholders that still read as a collection.** IGDB has no art for unannounced games, and a freshly added title renders before its image arrives. The fallback is a tinted panel with the game's initials, derived from the title, so a pile of art-less games still reads as distinct objects instead of a column of identical grey boxes. When the real art arrives it cross-fades in rather than popping.

**Confirmation at the moment it matters.** After a share, the user is still inside YouTube with their thumb moving. The Add button turns into a check the instant the game is saved, so they know it landed before they go back to watching.

**The empty state teaches the gesture** instead of apologising for having no data. Every new user sees it first, so it's treated as a designed screen, not a fallback.

**Colour never carries meaning alone.** Status chips are always labelled as well as tinted, and they animate their colour change, because two of the five status hues are close enough to confuse a red-green colourblind player.

## 27388: HAMM Award

**The model.** A free tier and one subscription. Saving, organising and rating up to 30 games is free for good. Backlogue Pro is $1.99 a month through RevenueCat and adds two things: an uncapped pile, and release alerts. Pro sells only what matters once you already care; it never makes the free experience worse.

**Why the paywall is where it is.** It appears in exactly two places: the Pro badge in the pile header, and the moment the free pile is full. Never on launch and never during a capture. The product exists to protect the two seconds between "that looks good" and "it's saved", and a paywall in that gap would destroy it.

**Why 30.** A cap of five would convert better and would contradict the only thing this app is for. Thirty was chosen from what real backlogs look like, so anyone who hits it is a committed user rather than a curious one. The paywall only ever appears to someone who already knows what the app is worth.

**What we changed and learned.**
- The paywall used to advertise custom lists and a year in review. Neither existed, so both lines were deleted rather than shipped half-built.
- The paywall was briefly unreachable. Its only entry point was the search screen refusing a thirty-first add, so no reviewer, judge or curious user could ever see what Pro was. A paywall that only appears to already-committed users sounds like restraint and is really just invisible. It now has a permanent, quiet entry point in the pile header.

**The RevenueCat integration.** Entitlements are read through a `ProAccess` interface, so view models never touch purchase plumbing and the UI runs against a stub where there's no store. Entitlement state is pushed through `PurchasesDelegate` rather than polled, so a renewal or refund that happens while the app is in the background takes effect without a relaunch. Purchase outcomes separate cancelled from failed: backing out of a store sheet isn't an error, and showing one for it is the fastest way to make a paywall feel hostile.

**Revenue and conversion.** None to report yet, and we'd rather say so than dress up a number.

## 27390: #BuildInPublic, how it helped

The development log is the commit history: every commit argues the decision it makes, including the wrong ones that were later reverted. The lessons that generalise:

**A compiler can't check integrations.** A self-audit found three features that compiled, passed tests and did nothing: the "Get Pro" button only closed the sheet, push existed entirely server-side so no device could ever receive one, and the method that registered alerts was never called. Later, the same lesson caught an unreachable paywall and two screens drawing underneath the status bar, where the system bar swallowed every tap on the delete button.

**Store screenshots without an emulator.** Compose can lay out and rasterise offscreen through Skia, so `./gradlew screenshots` renders the real composables to PNG at exactly 1179x2556. They come from the shipping code, so they can't drift from the app.

**Tools that fail while reporting success.** The Android emulator's screen recorder stops at about 87 seconds whatever `--time-limit` says, and its encoder dies after roughly six clips, returning 60KB stubs. Both report success. The fix was one clip per scene, which keeps each clip under the ceiling and makes narration sync structural instead of computed.

**Errors that point nowhere near their cause:** Android Studio's bundled JDK 25 rejected by the Android Gradle Plugin with a message that is only `25.0.2`; backslashes in `local.properties` silently eaten by Java's property escaping and surfacing as "The filename, directory name, or volume label syntax is incorrect".

### 28119: links

https://github.com/chinesepowered/hack-backlogue/commits/main

Add the social thread here once it's posted. Without posts this category is
weak: the award is for a journey shared on social media, and the brief asks for
"links to your posts".

## 27387: Grand Prize

Growth numbers since launch are too early to be meaningful, so we won't dress them up.

The case we'd make is about the shape of the loop. Backlogue is a share target, so every use of it starts inside another app where people are already watching: a YouTube video, a Reddit thread, a Steam page. The whole value proposition fits in a fifteen-second clip that no other backlog tracker can film, because their version is "open the app and search".

## 27392: Notes for the judges

**Where to look in the code.** `ShareTextParser` is the file the product rests on, with ten tests built from real share-sheet payloads, including the case where every word is noise and the fallback has to put words back instead of handing the user an empty search box. The domain layer imports no framework, so all of it is testable without a device or a network.

**Two platforms, one UI.** Android and desktop render the same composables. Desktop is the free tier by construction: there's no store or notification service there, so purchases and push resolve to honest no-ops instead of buttons that fail.

**Deliberately not built: price-drop alerts.** IGDB has no pricing data. Rather than ship a shallow version, we left it out and removed the claim from the paywall.

**About the demo video.** It's vertical and under two minutes, so YouTube filed it as a Short; `youtube.com/watch?v=3Wbm6W8L_PI` is the same video. It was recorded on a light-mode phone. The app follows the system theme, and the screenshots show dark mode.

**Links.** Source: https://github.com/chinesepowered/hack-backlogue. iOS CI: https://github.com/chinesepowered/hack-backlogue/actions/workflows/ios.yml

---

## Deliberately blank

| Id | Category | Why |
| --- | --- | --- |
| 27383 | App Store URL | No iOS release |
| 28117 | Galaxy Store URL | No Galaxy build |
| 27389 | Peace Prize | The anti-guilt design is real, but it isn't in the same category as accessibility or mental-health entries |
| 27795 | Catvertising | No ads at all |
| 27794 | Best Game | A tool for gamers, not a game |
| 28125 | Best App for Galaxy | No Galaxy build |
| 28123-4 | Most Viral (Noise) | Not used |
| 28126-7 | Idea to Income (Replit) | Not used |
| 28130 | Growth Loop (Layers) | Not used |
| 28132-4 | Funnel Vision (Stripe) | Not used |
