# Shipping Backlogue

Everything that cannot be done from a Linux CI container, in the order it
unblocks the most work. Deadline is **September 30, 2026, 11:45pm PDT**.

Two hard rules from the official rules worth re-reading before you start:

- The app's **first public release must fall between Aug 1 and Sep 30, 2026**.
  Updates to a previously released app do not qualify.
- Every category except Next Gen requires the app **fully published** to the App
  Store, Play Store, or Galaxy Store by the deadline.

---

## 0. Confirm the name

`Backlogue` is confirmed available and the rename is done throughout — package
`com.chinesepowered.backlogue`, URL scheme `backlogue://`, App Group
`group.com.chinesepowered.backlogue`. Register the store listing name early so nobody
takes it while you build.

## 1. Accounts and keys

| Service | What you need | Where it goes |
| --- | --- | --- |
| [Twitch Developer](https://dev.twitch.tv/console/apps) | Client ID + Secret | Worker secrets only |
| [RevenueCat](https://app.revenuecat.com) | iOS + Android public SDK keys | `local.properties` |
| [OneSignal](https://onesignal.com) | App ID + REST API key | App ID in `local.properties`, REST key in Worker |
| [Cloudflare](https://dash.cloudflare.com) | Account for Workers + KV | — |

IGDB has no separate signup: it authenticates through Twitch, so a Twitch app
*is* an IGDB app.

## 2. Deploy the Worker

Nothing in the app works without this — search, game data, and alerts all route
through it. See [`server/README.md`](server/README.md). Roughly:

```bash
cd server
npm install
npx wrangler kv namespace create BACKLOGUE_KV   # paste the id into wrangler.toml
npx wrangler secret put TWITCH_CLIENT_ID
npx wrangler secret put TWITCH_CLIENT_SECRET
npx wrangler secret put ONESIGNAL_APP_ID
npx wrangler secret put ONESIGNAL_REST_API_KEY
npm run deploy
```

Verify: `curl https://backlogue-api.<subdomain>.workers.dev/v1/health` → `{"ok":true}`

## 3. Fill in `local.properties`

Git-ignored, never committed:

```properties
sdk.dir=/Users/you/Library/Android/sdk
BACKLOGUE_API_BASE_URL=https://backlogue-api.<subdomain>.workers.dev
REVENUECAT_ANDROID_KEY=goog_xxx
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

`./gradlew :composeApp:assembleDebug` should now give you a working Android app.

## 4. iOS — the part with real unknowns

The shared Kotlin and the Swift sources are written, but **nothing on the iOS
side has ever been through a compiler** — this container is Linux. Expect
friction here and budget a day.

```bash
./gradlew :composeApp:compileKotlinIosSimulatorArm64   # do this first
```

Then, in Xcode:

1. Create an iOS App target in `iosApp/`, add the Swift files from
   `iosApp/iosApp/`.
2. Add a **Share Extension** target, use
   `iosApp/ShareExtension/ShareViewController.swift`.
3. Enable **App Groups** on *both* targets with the identifier
   `group.com.chinesepowered.backlogue` — capture silently does nothing if these do not match.
4. Register the `backlogue://` URL scheme on the app target.
5. Add a `Secrets.swift` (git-ignored) providing `apiBaseUrl`,
   `revenueCatApiKey`, `oneSignalAppId`, `isDebug`.
6. Link the `ComposeApp` framework produced by Gradle.

**The known risk:** `purchases-kmp` 3.x moved its iOS integration to
Gradle-managed Swift Package dependencies. If the framework link fails, that is
the first place to look, and it is a documented setup change rather than a bug
in this project.

## 5. RevenueCat dashboard

1. Create products in App Store Connect and Play Console first — RevenueCat can
   only import products that already exist.
2. Entitlement identifier must be exactly **`pro`** (see `ProLimits`).
3. Offering identifier **`default`**.
4. Build a paywall in the Paywall Editor.
5. Start one **Experiment** — the cheapest thing that makes the HAMM entry
   non-empty. Monthly-first vs annual-first pricing is the obvious first test.
6. Enable **Customer Center** so subscription management is self-serve.

## 6. Store listings

Both stores need:

- 1024×1024 icon, no alpha, no rounded corners
- Screenshots at 1179×2556, **no device frame** (Devpost requires at least one
  at this size)
- Description, keywords, privacy policy URL
- Privacy nutrition labels / Play Data Safety — you collect a OneSignal
  subscription id and game selections; declare both

Play: a personal account predating Nov 2023 skips the 12-tester gate, but still
budget 3–7 days for first review. Apple: usually 24–48h, but a rejection costs
you a full cycle, so do not leave this to the final week.

## 7. Devpost submission

One project, entered into every category below. **Only one Influencer category
is allowed per project** — Gaming is the one.

- [ ] Influencer — Gaming (Mr Lewis Blogs Gaming)
- [ ] Ship Kotlin Everywhere (JetBrains)
- [ ] RevenueCat Design Award
- [ ] Next Gen (student — needs your ccsf.edu address and a public repo)
- [ ] #BuildInPublic
- [ ] Keep Them Coming Back (OneSignal)
- [ ] HAMM

Required attachments: text description, **demo video under 2 minutes** on
YouTube or Vimeo, store listing URL, 1024×1024 icon, ≥1 screenshot at
1179×2556, and either a free trial or a promo code so judges can reach Pro.

**Do not forget the promo code.** A judge who cannot get past the paywall
scores what they can see.

## 8. The demo video

Two minutes, and the first fifteen seconds decide it. Open inside a YouTube
video, share into Backlogue, show the game landing. That is the entire pitch and
every other tracker's video cannot show it.

Then: the pile, a status change, a rating, and the provenance line six months
on. Save the paywall for last or skip it.

---

## What is already done

- Android app builds and runs; unit tests pass
- Worker typechecks and deploys
- Shared Kotlin compiles for Android; iOS sources written, **not yet compiled**
- Design system, domain model, capture parser, pile/search/detail, paywall UI

## Known gaps — read this before submitting

- **iOS push does not register.** OneSignal's iOS SDK is a Swift package with
  no Kotlin bindings, so `Modules.ios.kt` binds `NoPushRegistrar`. Android
  registers and receives; iOS needs the OneSignal SPM dependency added in Xcode
  and a Swift-backed `PushRegistrar`. Everything above that seam already works.
- **Nothing on iOS has been compiled.** Kotlin/Native iOS targets require the
  Xcode toolchain, which exists only on macOS, so no amount of CI effort can
  cover this — it has to happen on your Mac.

Also deliberately out of scope: **price-drop alerts**. The Worker handles
release dates and launches, which need only IGDB. Real price tracking needs a
store pricing source IGDB does not provide.
