# Backlogue

**Every game you meant to play.** A gaming bucket list built around the one moment
every other backlog app misses: the second you *discover* a game.

You are three minutes into a YouTube review, or halfway down an r/Games thread,
and something looks good. Every tracker on the market asks you to leave what you
are doing, open an app, search for the game, and file it. Almost nobody does
that, which is why almost nobody's backlog is accurate.

Backlogue lives in the share sheet instead. Share the video, the thread, or the Steam
page into Backlogue and the game is in your pile before the video has finished
buffering — with a note about where you found it, so six months later your list
reads like a record of your own taste instead of a chore list.

Built for **RevenueCat Shipaton 2026**.

---

## Status

Ships on **Android and Desktop**, both building on Windows and Linux. The iOS
sources exist and are correct but have never been compiled — Kotlin/Native's
iOS targets require the Xcode toolchain, which is macOS-only. See
[setup.md](setup.md) for the reasoning and [SUBMISSION.md](SUBMISSION.md) for
what is left.

## Why it is built this way

**Kotlin Multiplatform + Compose Multiplatform.** One codebase, one design
system, genuinely shared UI on Android and desktop — not a shared core with two
hand-written front ends. The only platform-specific UI is the capture surface,
because that is where the OS actually differs. Desktop is not a token target
either: a lot of game discovery happens in a browser tab on a PC, and a backlog
that only exists on your phone is one you have to remember to open.

**Dark-first, art-forward design.** The thing being visualised here is, for most
players, a source of low-grade guilt — every "pile of shame" joke is a user
telling you their tracker made them feel bad. So the palette is built to read as
a gallery rather than a debt: near-black, deferential to cover art, no red
badges, no overdue states. The last status is called *Bounced*, not *Abandoned*,
because "I bounced off it" is what players actually say and it puts the mismatch
on the game rather than the person.

**Provenance as a first-class field.** Every add records where it came from.
This is one extra column and it is the feature that turns a list into a story.

## Architecture

```
composeApp/
  src/
    commonMain/          Shared everything: UI, domain, data
      kotlin/com/chinesepowered/backlogue/
        domain/          Models and pure logic — no framework imports
          capture/       Share-payload parsing (the core of the product)
          model/         Game, BacklogEntry, BacklogStatus, DiscoverySource
        ui/theme/        Colour, type, shape, and motion tokens
      sqldelight/        Local database schema
    commonTest/          Pure-Kotlin tests, run on every target
    androidMain/         Activities, share-sheet target, Android drivers
    jvmMain/             Desktop app + offscreen screenshot renderer
    iosMain/             iOS drivers and framework entry point (uncompiled)
```

Domain logic is deliberately free of Compose, Ktor, and SQLDelight imports so it
can be tested without a device or a network.

| Concern | Choice |
| --- | --- |
| UI | Compose Multiplatform 1.11.1 |
| Language | Kotlin 2.3.20 |
| Navigation | `org.jetbrains.androidx.navigation` |
| Local storage | SQLDelight |
| Networking | Ktor 3 |
| DI | Koin |
| Images | Coil 3 |
| Game data | IGDB |
| Monetization | RevenueCat (`purchases-kmp`) |

## Building

New to Kotlin, Gradle, or Xcode? **[setup.md](setup.md)** walks the whole thing
from a fresh Mac, written for someone coming from Expo/React Native.

```bash
./gradlew :composeApp:run               # desktop app — fastest way to see it
./gradlew :composeApp:assembleDebug     # Android APK
./gradlew :composeApp:testDebugUnitTest # tests
./gradlew screenshots                   # store screenshots, no emulator needed
node tools/render-store-assets.mjs      # icon + Play feature graphic
```

Requires **JDK 21** — not the JDK 25 that Android Studio bundles, which the
Android Gradle Plugin rejects with an error message consisting solely of
`25.0.2`.

**iOS** requires macOS + Xcode — see [setup.md](setup.md) appendix A.

Store listing copy and assets: [docs/store/](docs/store/).

## Roadmap

- [x] KMP + Compose Multiplatform scaffold, building for Android
- [x] Design system: colour, type, shape, motion tokens
- [x] Domain model and share-payload parser, with tests
- [x] Cloudflare Worker: IGDB proxy + hourly alert sweep
- [x] Repository layer, SQLDelight store, Ktor client
- [x] Pile, search, and game detail screens
- [x] Android share-sheet capture (`ACTION_SEND` + `PROCESS_TEXT`)
- [x] RevenueCat entitlements and paywall UI
- [x] Offscreen screenshot rendering (`./gradlew screenshots`)
- [x] Purchase and restore through RevenueCat offerings
- [x] OneSignal registration and release alerts (Android; iOS pending)
- [x] Desktop app (`./gradlew :composeApp:run`)
- [ ] iOS — blocked on macOS, see setup.md appendix A
- [ ] Price-drop alerts (needs a pricing source IGDB does not provide)
- [ ] Store listings and submission

## License

MIT — see [LICENSE](LICENSE).
