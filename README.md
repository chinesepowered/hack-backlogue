# Backlogue

**Every game you meant to play.** A gaming bucket list built around the one moment
every other backlog app misses: the second you *discover* a game.

You're three minutes into a YouTube review, or halfway down an r/Games thread,
and something looks good. Every tracker asks you to leave what you're doing,
open an app, search for the game, and file it. Almost nobody does that, which is
why almost nobody's backlog is accurate.

Backlogue lives in the share sheet instead. Share the video, the thread, or the
Steam page into it and the game is in your pile in one tap, with a note about
where you found it. Six months later your list reads like a record of your own
taste instead of a chore list.

Built for **RevenueCat Shipaton 2026**.

- Demo video: https://www.youtube.com/watch?v=3Wbm6W8L_PI
- Devpost entry: https://devpost.com/software/backlogue
- Site and privacy policy: https://backlogue-app.vercel.app/

---

## Status

Android and desktop run from one Kotlin codebase with a shared Compose UI. The
shared code also **compiles and links for iOS**: the
[iOS workflow](https://github.com/chinesepowered/hack-backlogue/actions/workflows/ios.yml)
builds `ComposeApp.framework` on a macOS runner, RevenueCat included. What isn't
done for iOS is the Xcode packaging and an App Store release.

## Why it's built this way

**Kotlin Multiplatform and Compose Multiplatform.** One codebase, one design
system, and genuinely shared UI on Android and desktop, rather than a shared
core with two hand-written front ends. The only platform-specific UI is the
capture surface, because that's where the operating systems actually differ.
Desktop isn't a token target either: a lot of game discovery happens in a browser
tab on a PC, and a backlog that only exists on your phone is one you have to
remember to open.

**Designed against its own genre.** For most players a backlog is low-grade
guilt; every "pile of shame" joke is someone telling you their tracker made them
feel bad. So there are no numbers anywhere: no completion percentage, no unplayed
counter, no red badges, no overdue states. A status with nothing in it doesn't
even get a filter chip. The last status is called *Bounced*, not *Abandoned*,
because "I bounced off it" is what players actually say, and it puts the
mismatch on the game rather than on the person.

**Dark-first and art-forward.** Cover art is the best thing on the screen, so the
interface stays out of its way. The app is near-black in dark mode and follows
the system theme, with a light palette built from the same tokens.

**Provenance as a first-class field.** Every add records where it came from. It's
one extra column, and it's the feature that turns a list into a story.

## Architecture

```
composeApp/
  src/
    commonMain/          Shared everything: UI, domain, data
      kotlin/com/chinesepowered/backlogue/
        domain/          Models and pure logic, no framework imports
          capture/       Share-payload parsing (the core of the product)
          model/         Game, BacklogEntry, BacklogStatus, DiscoverySource
        ui/theme/        Colour, type, shape and motion tokens
      sqldelight/        Local database schema
    commonTest/          Pure-Kotlin tests, run on every target
    mobileMain/          RevenueCat, shared by Android and iOS
    androidMain/         Activities, share-sheet target, OneSignal, Android drivers
    jvmMain/             Desktop app and the offscreen screenshot renderer
    iosMain/             iOS drivers and framework entry point
server/                  Cloudflare Worker: IGDB proxy and the hourly alert sweep
```

The domain layer deliberately imports no Compose, Ktor or SQLDelight, so it can
be tested without a device or a network. `expect`/`actual` appears five times,
each at a real platform boundary: the SQLite driver, the HTTP engine, the IO
dispatcher, the Koin platform module and the purchases factory. Everything else
goes through dependency injection.

| Concern | Choice |
| --- | --- |
| UI | Compose Multiplatform 1.11.1 |
| Language | Kotlin 2.3.20 |
| Navigation | `org.jetbrains.androidx.navigation` |
| Local storage | SQLDelight |
| Networking | Ktor 3 |
| DI | Koin |
| Images | Coil 3 |
| Game data | IGDB, through the Worker |
| Monetization | RevenueCat (`purchases-kmp`) |
| Push | OneSignal |

## Building

New to Kotlin, Gradle or Xcode? **[setup.md](setup.md)** walks through the whole
thing from scratch, written for someone coming from Expo and React Native.

```bash
./gradlew :composeApp:run               # desktop app, the fastest way to see it
./gradlew :composeApp:assembleDebug     # Android APK
./gradlew :composeApp:testDebugUnitTest # tests
./gradlew screenshots                   # store screenshots, no emulator needed
```

Requires **JDK 21**, not the JDK 25 that Android Studio bundles. The Android
Gradle Plugin rejects 25 with an error message that consists only of `25.0.2`.

Search and alerts need the Worker. See [server/README.md](server/README.md) to
deploy your own, then set `BACKLOGUE_API_BASE_URL` in `local.properties`.

**iOS** needs macOS and Xcode; see [setup.md](setup.md) appendix A.

Store listing copy and assets are in [docs/store/](docs/store/). The demo video
pipeline (narration, emulator capture, compositing) is described in
[docs/video-script.md](docs/video-script.md).

## Roadmap

- [x] Share-sheet capture (`ACTION_SEND` and `PROCESS_TEXT`) with a tested parser
- [x] Pile, search and game detail screens on a shared design system
- [x] Cloudflare Worker: IGDB proxy and hourly release-alert sweep
- [x] OneSignal release alerts on Android
- [x] RevenueCat subscription, paywall, purchase and restore
- [x] Desktop app
- [x] Offscreen screenshot rendering (`./gradlew screenshots`)
- [x] Shared code compiling and linking for iOS in CI
- [ ] Share a game out of the app
- [ ] iOS app packaging and App Store release
- [ ] Price-drop alerts (needs a pricing source IGDB doesn't provide)

## License

MIT, see [LICENSE](LICENSE).
