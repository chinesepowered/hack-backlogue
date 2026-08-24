# Setup — Windows

Written for someone who has shipped Expo/React Native but has never touched
Kotlin, Gradle, or Android Studio. Every command is copy-pasteable and every
step says what "it worked" looks like.

**Platforms:** Android and Desktop. Both build on Windows. **iOS cannot be built
on Windows at all** — see [the platform decision](#the-platform-decision) below.

**Total time:** about 90 minutes, most of it waiting on the first Gradle build
and on account signups.

---

## The platform decision

Kotlin/Native's iOS targets require the Xcode toolchain, which only exists on
macOS. There is no workaround — not a VM, not a cross-compiler.

So Backlogue ships **Android + Desktop**, and that is a deliberate choice rather
than a consolation:

- The Shipaton requires publication to the App Store, **Play Store**, *or*
  Galaxy Store. Android alone satisfies every category's publication rule.
- The Ship Kotlin Everywhere award counts Android, iOS, **desktop**, and web,
  and JetBrains state explicitly that judges "reward effective cross-platform
  development, not platform count alone."
- Dropping iOS removes the only unverified code in the project, plus Xcode
  signing, App Store review, and a Swift OneSignal integration that does not
  exist yet.

The iOS sources are still in `iosApp/` and still correct. If you get time on a
Mac, [appendix A](#appendix-a--ios-if-you-get-a-mac) picks it up.

---

## How this differs from Expo

You already know how to ship an app. The muscle memory that will mislead you:

| Expo | Here |
| --- | --- |
| `npx expo start`, hot reload in seconds | Gradle builds. First one is ~10 min, later ones ~40s. |
| `package.json` + npm | `gradle/libs.versions.toml` + `build.gradle.kts`. Same idea, different file. |
| `eas build` builds in the cloud | You build locally. |
| One JS bundle runs everywhere | One *Kotlin* codebase compiles to a real Android app and a real desktop app. No bundler, no JS runtime. |
| `app.json` | `composeApp/build.gradle.kts` |
| Metro resolves imports at runtime | Gradle resolves them at build time. A missing dep is a build failure, not a runtime error. |
| `.env` | `local.properties` (git-ignored, same purpose) |

`./gradlew someTask` is the equivalent of `npm run something`.

**Project layout:** `composeApp/` is one module that compiles to three things —
an Android app, a desktop app, and a screenshot renderer. `server/` is a normal
TypeScript Cloudflare Worker and will feel completely familiar.

---

## Part 0 — Toolchain

### 0.1 Java 21 — and *not* 25

```powershell
winget install --id EclipseAdoptium.Temurin.21.JDK
```

**Do not use the JDK bundled with Android Studio.** It is JDK 25. Gradle itself
runs on 25 fine, but the Android Gradle Plugin rejects it, and the error message
it produces is literally the string `25.0.2` with no explanation. This is
verified on this machine, not theoretical.

Tell Gradle which JDK to use, permanently:

```powershell
setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
```

Close and reopen your terminal, then:

```powershell
echo $env:JAVA_HOME
java -version      # want 21.x
```

### 0.2 Android Studio

```powershell
winget install --id Google.AndroidStudio
```

Open it once and finish the setup wizard (accept defaults — it downloads the
Android SDK, about 2GB). You need it for the SDK, the emulator, and `adb`. You
do not have to write any code in it.

### 0.3 Node

```powershell
node --version     # want v20+
```

---

## Part 1 — Configure the repo

Create `local.properties` in the repo root (git-ignored):

```properties
sdk.dir=C:/Users/YOURNAME/AppData/Local/Android/Sdk
BACKLOGUE_API_BASE_URL=
REVENUECAT_ANDROID_KEY=
ONESIGNAL_APP_ID=
```

**Use forward slashes.** This is a Java properties file, where backslash is an
escape character — `C:\Users\...` silently becomes `C:Users...` and the build
fails with `The filename, directory name, or volume label syntax is incorrect`,
which does not hint at the real cause. Also verified the hard way.

The three blank values are fine for now; the app builds and runs without them,
just with search disabled.

---

## Part 2 — Build and run (~15 min)

### Desktop — the fastest way to see it

```powershell
./gradlew :composeApp:run
```

✅ **Done when:** a Backlogue window opens showing an empty pile.

### Android

```powershell
./gradlew :composeApp:assembleDebug
```

First run downloads Gradle and every dependency. **About 10 minutes, and it will
look frozen.** It isn't.

✅ **Done when:** `BUILD SUCCESSFUL` and
`composeApp/build/outputs/apk/debug/composeApp-debug.apk` exists.

**Onto your phone:** Settings → About phone → tap **Build number** seven times →
Developer options → **USB debugging** on. Plug in, accept the prompt.

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
./gradlew :composeApp:installDebug
```

Or start an emulator from Android Studio → Device Manager first.

---

## Part 3 — The backend (~30 min)

**Everything that makes the app useful runs through this** — search, game data,
alerts. It is plain TypeScript, so it is the most familiar part of the project.

### 3.1 Twitch credentials (this is how you get IGDB)

IGDB is the game database and has no signup of its own — it authenticates
through Twitch, so a Twitch app *is* an IGDB app. This confuses everyone once.

1. <https://dev.twitch.tv/console/apps> → **Register Your Application**
2. Name: anything. OAuth Redirect URL: `http://localhost`. Category: Application Integration
3. Copy the **Client ID**, then **New Secret** and copy that

### 3.2 Deploy

```powershell
cd server
npm install
npx wrangler login                            # opens a browser
npx wrangler kv namespace create BACKLOGUE_KV
```

That prints an `id = "..."`. **Paste it into `server/wrangler.toml`** replacing
`REPLACE_WITH_KV_NAMESPACE_ID`.

```powershell
npx wrangler secret put TWITCH_CLIENT_ID
npx wrangler secret put TWITCH_CLIENT_SECRET
npx wrangler secret put ONESIGNAL_APP_ID       # from 4.2, or rerun later
npx wrangler secret put ONESIGNAL_REST_API_KEY
npm run deploy
```

✅ **Done when:**

```powershell
curl https://backlogue-api.YOUR-SUBDOMAIN.workers.dev/v1/health
# {"ok":true}
curl "https://backlogue-api.YOUR-SUBDOMAIN.workers.dev/v1/search?q=hollow%20knight"
# {"games":[...]}
```

If health works but search doesn't, your Twitch credentials are wrong. That is
the only thing it can be.

Put the URL in `local.properties` as `BACKLOGUE_API_BASE_URL`, rebuild, and
search works in both the Android and desktop apps.

---

## Part 4 — Accounts for monetization and alerts (~20 min)

### 4.1 RevenueCat

1. <https://app.revenuecat.com> → new project **Backlogue**
2. Add a **Play Store** app, bundle id `com.chinesepowered.backlogue`
3. Copy the **public SDK key** (starts `goog_`) into `local.properties`

Products and the entitlement come after Play Console products exist — see
[SUBMISSION.md](SUBMISSION.md).

### 4.2 OneSignal

1. <https://onesignal.com> → new app **Backlogue**
2. Platform **Google Android (FCM)**; it walks you through creating a Firebase
   project
3. Copy the **App ID** into `local.properties`, and set the **REST API Key** as
   a Worker secret (3.2)

---

## Part 5 — Test the thing that matters

On the phone:

1. Open YouTube, find a game trailer
2. Share → **Backlogue**
3. The game resolves and is one tap from saved

**That flow is the entire product.** If it works, you have a submittable app.

---

## Part 6 — Everything else

```powershell
./gradlew :composeApp:testDebugUnitTest   # 10 tests
./gradlew screenshots                     # store screenshots, no emulator needed
./gradlew :composeApp:packageMsi          # desktop installer
node tools/render-store-assets.mjs        # icon + Play feature graphic
cd server; npm run typecheck
```

Store listing copy is pre-written in [docs/store/listing.md](docs/store/listing.md).
Submission checklist is [SUBMISSION.md](SUBMISSION.md).

---

## When it goes wrong

| Symptom | Cause |
| --- | --- |
| Build fails with just `25.0.2` | `JAVA_HOME` points at Android Studio's JDK 25. Use Temurin 21. |
| `The filename, directory name, or volume label syntax is incorrect` | Backslashes in `local.properties`. Use forward slashes. |
| `SDK location not found` | `local.properties` missing or `sdk.dir` wrong |
| Gradle hangs on first build | It's downloading. Give it 10 minutes. |
| `Could not find <artifact>` | A version in `gradle/libs.versions.toml` doesn't exist. Check Maven Central. |
| Search says "Search isn't set up" | `BACKLOGUE_API_BASE_URL` blank in `local.properties` |
| Search says "No connection" | Worker not deployed, or wrong URL |
| `adb devices` shows `unauthorized` | Unlock the phone, accept the USB prompt |
| Push permission never prompts | Deliberate — only asked once you have games in the pile |

**Rule of thumb for Gradle errors:** scroll up to the first line starting `e:`.
Everything after it is noise.

---

## Appendix A — iOS, if you get a Mac

Nothing here can be done from Windows. The Kotlin and Swift sources exist and
are correct, but **have never been compiled**.

1. `./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64` — do this before
   opening Xcode. If it fails, it is a Kotlin problem rather than an Xcode one,
   and the likely culprit is `purchases-kmp` 3.x moving its iOS integration to
   Swift Package dependencies.
2. Xcode → new iOS App project inside `iosApp/`, bundle id
   `com.chinesepowered.backlogue`, SwiftUI + Swift
3. Delete Xcode's generated `ContentView.swift` and `*App.swift`, add the files
   from `iosApp/iosApp/` instead
4. Build Phases → new **Run Script** above "Compile Sources":
   `cd "$SRCROOT/.." && ./gradlew :composeApp:embedAndSignAppleFrameworkForXcode`
5. Build Settings → Framework Search Paths:
   `$(SRCROOT)/../composeApp/build/xcode-frameworks/$(CONFIGURATION)/$(SDK_NAME)`
6. Build Settings → **User Script Sandboxing = No** (otherwise step 4 fails with
   an unhelpful error — this one wastes hours)
7. Add a Share Extension target using `iosApp/ShareExtension/`
8. **App Groups** on *both* targets: `group.com.chinesepowered.backlogue`. If
   these do not match exactly, sharing silently does nothing and shows no error.
9. URL scheme `backlogue` on the app target
10. iOS push needs the OneSignal Swift package and a Swift-backed
    `PushRegistrar` — `Modules.ios.kt` currently binds `NoPushRegistrar`
