# Setup — from a fresh Mac to a running app

Written for someone who has shipped Expo/React Native but has never touched
Kotlin, Gradle, Android Studio, or Xcode. Every command is copy-pasteable and
every step says what "it worked" looks like.

**Total time:** about 3–4 hours the first time, most of it waiting on downloads
and Xcode. Android alone is ~45 minutes. Do Android first — it's the easy half
and it proves the backend works before you fight Xcode.

---

## How this differs from Expo (read this first, it'll save you an hour)

You already know how to ship an app. The muscle memory that will mislead you:

| Expo | Here |
| --- | --- |
| `npx expo start`, hot reload in seconds | Gradle builds. First one takes ~5 min, later ones ~30s. There *is* hot reload in Android Studio ("Apply Changes"), but it's less magic. |
| `package.json` + npm | `gradle/libs.versions.toml` (version catalog) + `build.gradle.kts`. Same idea, different file. |
| `eas build` builds in the cloud | You build locally. Android on any machine; **iOS only on a Mac.** |
| One JS bundle runs everywhere | One *Kotlin* codebase compiles to a real Android app and a real iOS framework. There's no bundler and no JS runtime. |
| `app.json` config | `composeApp/build.gradle.kts` (Android) and Xcode project settings (iOS). |
| Metro resolves your imports | Gradle resolves them at build time. A missing dep is a build failure, not a runtime error. |
| `.env` | `local.properties` (git-ignored, same purpose). |

**The one genuinely new concept:** Gradle is a build tool *and* a dependency
manager *and* a task runner. `./gradlew somethingSomething` is the equivalent of
`npm run something`. `./gradlew tasks` lists what's available.

**The mental model for this project:** `composeApp/` is one module that compiles
to three things — an Android app, an iOS framework, and a JVM program (used only
to render store screenshots). `iosApp/` is a thin Swift wrapper that loads the
iOS framework. `server/` is a normal TypeScript Cloudflare Worker, which will
feel completely familiar.

---

## Part 0 — Install the toolchain

### 0.1 Homebrew (skip if you have it)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 0.2 Java

Kotlin runs on the JVM. You need a JDK — version 17 or newer.

```bash
brew install --cask temurin@21
java -version
```

✅ **Done when:** `java -version` prints `openjdk version "21..."`.

### 0.3 Android Studio

```bash
brew install --cask android-studio
```

Open it once and complete the setup wizard (accept the defaults — it downloads
the Android SDK, ~2GB). This is the equivalent of the Android half of
`eas build`, running locally.

Then tell this project where the SDK went:

```bash
cd /path/to/hack-ship
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
```

✅ **Done when:** `ls $HOME/Library/Android/sdk` lists folders like `platforms`.

### 0.4 Xcode

You said it's installed. Two things people miss:

```bash
# Point the command-line tools at the full Xcode, not the standalone CLI tools.
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# Accept the licence and install components (Xcode also prompts on first launch).
sudo xcodebuild -license accept
xcodebuild -runFirstLaunch
```

✅ **Done when:** `xcodebuild -version` prints a version instead of an error.

Also open Xcode → Settings → Accounts and **sign in with your Apple ID** (the
one with your developer account). Nothing iOS will build without this.

### 0.5 Node

For the backend. You almost certainly have it.

```bash
node --version   # want v20 or newer
```

---

## Part 1 — Get the backend running (~30 min)

**Do this first.** Nothing in the app works without it — search, game data, and
alerts all route through it. It's plain TypeScript, so it's the most familiar
part of this whole project for you.

### 1.1 Twitch credentials (this is how you get IGDB)

IGDB is the game database. It has no signup of its own — it authenticates
through Twitch, so a Twitch app *is* an IGDB app. This confuses everyone once.

1. Go to <https://dev.twitch.tv/console/apps> → **Register Your Application**
2. Name: anything. OAuth Redirect URL: `http://localhost`. Category: Application Integration
3. Copy the **Client ID**, then **New Secret** and copy that

### 1.2 Cloudflare

```bash
cd server
npm install
npx wrangler login          # opens a browser
npx wrangler kv namespace create BACKLOGUE_KV
```

That last command prints an `id = "..."`. **Paste it into `server/wrangler.toml`**
replacing `REPLACE_WITH_KV_NAMESPACE_ID`.

### 1.3 Secrets and deploy

```bash
npx wrangler secret put TWITCH_CLIENT_ID        # paste, Enter
npx wrangler secret put TWITCH_CLIENT_SECRET
npx wrangler secret put ONESIGNAL_APP_ID        # from step 2.2 below — or rerun later
npx wrangler secret put ONESIGNAL_REST_API_KEY
npm run deploy
```

✅ **Done when:**

```bash
curl https://backlogue-api.<your-subdomain>.workers.dev/v1/health
# {"ok":true}

curl "https://backlogue-api.<your-subdomain>.workers.dev/v1/search?q=hollow%20knight"
# {"games":[{"id":...,"name":"Hollow Knight",...}]}
```

If the second one returns an error but health works, your Twitch credentials are
wrong. That's the only thing it can be.

---

## Part 2 — The other accounts (~20 min)

### 2.1 RevenueCat

1. <https://app.revenuecat.com> → new project **Backlogue**
2. Add an **App Store** app and a **Play Store** app (bundle id
   `com.chinesepowered.backlogue` for both)
3. Copy the **public SDK keys** — Apple starts `appl_`, Google starts `goog_`

Products and the entitlement come later (Part 6) — they need store products to
exist first.

### 2.2 OneSignal

1. <https://onesignal.com> → new app **Backlogue**
2. Platform: **Google Android (FCM)**. It'll walk you through a Firebase project —
   create one, download nothing, just paste the Server Key it asks for.
3. Copy the **App ID** (Settings → Keys & IDs) and the **REST API Key**

Re-run the two `wrangler secret put ONESIGNAL_*` commands now if you skipped them.

---

## Part 3 — Run the Android app (~20 min)

### 3.1 Configure

Open `local.properties` (repo root, git-ignored) and make it look like this:

```properties
sdk.dir=/Users/YOURNAME/Library/Android/sdk
BACKLOGUE_API_BASE_URL=https://backlogue-api.YOUR-SUBDOMAIN.workers.dev
REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

The app builds fine with these blank — it just runs with search disabled — so if
something's missing, that's the symptom.

### 3.2 Build

```bash
./gradlew :composeApp:assembleDebug
```

First run downloads Gradle and every dependency. **5–10 minutes, and it will
look frozen.** It isn't.

✅ **Done when:** `BUILD SUCCESSFUL` and
`composeApp/build/outputs/apk/debug/composeApp-debug.apk` exists.

### 3.3 Put it on your phone

Enable developer mode on the phone: Settings → About phone → tap **Build number**
seven times. Then Settings → Developer options → **USB debugging** on. Plug in,
accept the prompt on the phone.

```bash
$HOME/Library/Android/sdk/platform-tools/adb devices   # should list your phone
./gradlew :composeApp:installDebug
```

✅ **Done when:** Backlogue is on your home screen and opens to an empty pile.

### 3.4 Test the thing that matters

1. Open YouTube, find any game trailer
2. Share → **Backlogue**
3. The game should resolve and be one tap from saved

**That single flow is the entire product.** If it works, you have a submittable
app. Everything after this is polish and iOS.

---

## Part 4 — Xcode from zero (~90 min, budget more)

This is the hard part, and you've never used Xcode. Go slowly.

### 4.1 Vocabulary

- **Project** — the `.xcodeproj` file. Like a `package.json` for native.
- **Target** — one buildable thing. You'll have two: the app, and the share
  extension. (Expo hides this; here it's explicit.)
- **Scheme** — a build configuration you select in the toolbar. Mostly ignore.
- **Signing** — Apple requires every build be cryptographically signed. Xcode
  can manage it automatically. Let it.
- **Capability** — an entitlement like App Groups or Push. You add these in the
  **Signing & Capabilities** tab.

### 4.2 Compile the shared Kotlin first

Before Xcode, prove the Kotlin half builds for iOS. **This has never been run —
it's the highest-risk step in the project.**

```bash
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
```

✅ **Done when:** `BUILD SUCCESSFUL`.

❌ **If it fails:** that's expected-ish and it's a Kotlin problem, not an Xcode
problem. Read the first `e:` line. Most likely culprit is `purchases-kmp`, whose
iOS integration moved to Swift Package dependencies in 3.x. Fix this before
opening Xcode — debugging both at once is miserable.

### 4.3 Create the Xcode project

1. Xcode → **File → New → Project**
2. **iOS → App** → Next
3. Product Name: `Backlogue` · Team: your Apple ID · Organization Identifier:
   `com.chinesepowered` · Interface: **SwiftUI** · Language: **Swift**
4. Save it **inside `iosApp/`** (the folder already exists; let it create
   `iosApp/Backlogue.xcodeproj`)
5. Verify: target → General → **Bundle Identifier** must read exactly
   `com.chinesepowered.backlogue`

### 4.4 Add the existing Swift files

Xcode created its own `ContentView.swift` and `BacklogueApp.swift`. Delete both
("Move to Trash"), then **File → Add Files to "Backlogue"** and add:

- `iosApp/iosApp/iOSApp.swift`
- `iosApp/iosApp/SharedCaptureInbox.swift`

Check **"Copy items if needed"** OFF and make sure the app target is ticked.

### 4.5 Link the Kotlin framework

This is the step with no equivalent in your Expo experience.

1. Select the **project** (top of the file tree) → your **app target** → **Build Phases**
2. Click **+** → **New Run Script Phase**. Drag it so it's **above** "Compile Sources"
3. Paste:

```sh
cd "$SRCROOT/.."
./gradlew :composeApp:embedAndSignAppleFrameworkForXcode
```

4. In **Build Settings**, search `Framework Search Paths`, add:
   `$(SRCROOT)/../composeApp/build/xcode-frameworks/$(CONFIGURATION)/$(SDK_NAME)`
5. Search `User Script Sandboxing` and set it to **No** (the script writes
   outside the sandbox and will fail otherwise — this one wastes people hours)

### 4.6 Secrets

**File → New → File → Swift File**, name it `Secrets.swift`, in the app target:

```swift
enum Secrets {
    static let apiBaseUrl = "https://backlogue-api.YOUR-SUBDOMAIN.workers.dev"
    static let revenueCatApiKey = "appl_xxxxxxxx"
    static let oneSignalAppId = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    static let isDebug = true
}
```

Then add it to `.gitignore` so you don't commit keys:

```bash
echo "iosApp/**/Secrets.swift" >> .gitignore
```

### 4.7 First run

Pick an iPhone simulator in the toolbar, press **⌘R**.

✅ **Done when:** the app launches in the simulator showing the empty pile.

This is the milestone that proves Kotlin Multiplatform is actually working. If
you get here, the JetBrains award entry is real.

### 4.8 The share extension

Only after 4.7 works.

1. **File → New → Target → iOS → Share Extension**. Name: `ShareExtension`
2. Delete the `ShareViewController.swift` and `MainInterface.storyboard` it
   generates
3. Add `iosApp/ShareExtension/ShareViewController.swift` to the **ShareExtension
   target only**
4. Add `iosApp/iosApp/SharedCaptureInbox.swift` to the ShareExtension target too
   (tick it in the File Inspector on the right — a file can belong to two targets)
5. In the extension's `Info.plist`, under `NSExtension` →
   `NSExtensionAttributes` → `NSExtensionActivationRule`, set
   `NSExtensionActivationSupportsWebURLWithMaxCount` = 1

### 4.9 App Groups — the step that silently breaks capture

The extension and the app are separate processes. They share data through an
App Group, and **if the identifiers don't match exactly, sharing does nothing
and shows no error.**

For **both** targets: **Signing & Capabilities → + Capability → App Groups →
+** and add:

```
group.com.chinesepowered.backlogue
```

### 4.10 URL scheme

App target → **Info** tab → **URL Types** → **+** → URL Schemes: `backlogue`

✅ **Done when:** sharing a YouTube link from Safari in the simulator opens
Backlogue with the game resolved.

---

## Part 5 — Verify everything

```bash
./gradlew :composeApp:assembleDebug        # Android app
./gradlew :composeApp:testDebugUnitTest    # 10 tests, all should pass
./gradlew screenshots                      # regenerates store screenshots
node tools/render-store-assets.mjs         # regenerates icon + feature graphic
cd server && npm run typecheck             # backend
```

---

## Part 6 — Store setup

Follow [SUBMISSION.md](SUBMISSION.md) from section 5. Store listing copy is
written for you in [docs/store/listing.md](docs/store/listing.md), and the
assets are in `docs/store/` and `docs/screenshots/`.

---

## When it goes wrong

| Symptom | Cause |
| --- | --- |
| `SDK location not found` | `local.properties` missing or wrong `sdk.dir` |
| Gradle hangs on first build | It's downloading. Give it 10 minutes. |
| `Could not find <some artifact>` | Version in `gradle/libs.versions.toml` doesn't exist. Check Maven Central. |
| App runs, search returns "Search isn't set up" | `BACKLOGUE_API_BASE_URL` blank in `local.properties` |
| App runs, search says "No connection" | Worker not deployed, or wrong URL |
| Xcode: "Command PhaseScriptExecution failed" | Usually **User Script Sandboxing** is still On (step 4.5.5) |
| Xcode: framework not found | Framework Search Paths wrong, or Gradle link step never ran |
| Sharing to the app does nothing on iOS | App Group identifiers don't match between the two targets |
| Push permission never prompts | Only asked once you have games in the pile — that's deliberate |
| `adb devices` shows `unauthorized` | Unlock the phone and accept the USB debugging prompt |

**Rule of thumb for Gradle errors:** scroll up to the first line starting `e:`.
Everything after it is noise.

---

## Honest risk list

Ordered by how likely they are to cost you a day.

1. **iOS Kotlin compile (4.2) has never been run.** Nothing else in this project
   is unverified; this is.
2. **`purchases-kmp` iOS setup** changed in 3.x to Swift Package dependencies.
   If the framework link fights you, start there.
3. **Purchases have never executed.** The code is written and compiles, but a
   real purchase needs a real store product. Test on a device before submitting —
   a reviewer will press that button.
4. **iOS push doesn't register.** Deliberate: OneSignal's iOS SDK has no Kotlin
   bindings. Android works. See the note in `Modules.ios.kt`.
