# Snag

**Snag it now, play it later.** A gaming bucket list built around the one moment
every other backlog app misses: the second you *discover* a game.

You are three minutes into a YouTube review, or halfway down an r/Games thread,
and something looks good. Every tracker on the market asks you to leave what you
are doing, open an app, search for the game, and file it. Almost nobody does
that, which is why almost nobody's backlog is accurate.

Snag lives in the share sheet instead. Share the video, the thread, or the Steam
page into Snag and the game is in your pile before the video has finished
buffering — with a note about where you found it, so six months later your list
reads like a record of your own taste instead of a chore list.

Built for **RevenueCat Shipaton 2026**.

---

## Status

The Android app builds and runs, the Worker deploys, and the shared Kotlin
compiles. The iOS sources are written but have **not** been through a compiler
yet — see [SUBMISSION.md](SUBMISSION.md) for what is left and what it needs.

## Why it is built this way

**Kotlin Multiplatform + Compose Multiplatform.** One codebase, one design
system, genuinely shared UI on iOS and Android — not a shared core with two
hand-written front ends. The only platform-specific UI is the share extension on
each side, because that is where the OS actually differs.

**Dark-first, art-forward design.** The thing being visualised here is, for most
players, a source of low-grade guilt — every "pile of shame" joke is a user
telling you their tracker made them feel bad. So the palette is built to read as
a gallery rather than a debt: near-black, deferential to cover art, no red
badges, no overdue states. The last status is called *Bounced*, not *Abandoned*,
because "I bounced off it" is what players actually say and it puts the mismatch
on the game rather than the person.

**Provenance as a first-class field.** Every snag records where it came from.
This is one extra column and it is the feature that turns a list into a story.

## Architecture

```
composeApp/
  src/
    commonMain/          Shared everything: UI, domain, data
      kotlin/com/snag/app/
        domain/          Models and pure logic — no framework imports
          capture/       Share-payload parsing (the core of the product)
          model/         Game, SnaggedGame, BacklogStatus, DiscoverySource
        ui/theme/        Colour, type, shape, and motion tokens
      sqldelight/        Local database schema
    commonTest/          Pure-Kotlin tests, run on every target
    androidMain/         Activities, share-sheet target, Android drivers
    iosMain/             iOS drivers and framework entry point
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

**Android** (works on Linux or macOS):

```bash
echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew :composeApp:assembleDebug
```

**iOS** (requires macOS + Xcode): open `iosApp/iosApp.xcodeproj`.

**Tests:**

```bash
./gradlew :composeApp:allTests
```

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
- [ ] **Purchase flow** — the paywall reads entitlements but cannot start a purchase
- [ ] **OneSignal client** — the Worker sends, but no device registers or receives
- [ ] iOS: compile, Xcode targets, Share Extension wiring
- [ ] Custom lists and year-in-review (advertised on the paywall — build or cut)
- [ ] Price-drop alerts (needs a pricing source IGDB does not provide)
- [ ] Store listings and submission

## License

MIT — see [LICENSE](LICENSE).
