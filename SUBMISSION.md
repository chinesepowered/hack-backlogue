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

## 4. Platforms — Android and Desktop

**iOS is out of scope.** Kotlin/Native's iOS targets need the Xcode toolchain,
which is macOS-only, and the build machine is Windows. This costs nothing on the
publication rules — the Shipaton accepts App Store, **Play Store**, or Galaxy
Store — and it removes the only unverified code in the project.

The Ship Kotlin Everywhere award counts Android, iOS, **desktop**, and web, and
JetBrains state that judges "reward effective cross-platform development, not
platform count alone." So the entry is Android + Desktop, sharing one Compose
Multiplatform UI.

```powershell
./gradlew :composeApp:run          # desktop app
./gradlew :composeApp:packageMsi   # desktop installer, if you want to ship it
```

Ship the desktop build as a GitHub release asset and link it from the Devpost
entry — it is the cheapest possible proof that the multiplatform claim is real.

If you later get time on a Mac, `setup.md` appendix A picks iOS up; the sources
are still there and still correct.

## 5. RevenueCat dashboard

1. Create products in App Store Connect and Play Console first — RevenueCat can
   only import products that already exist.
2. Entitlement identifier must be exactly **`pro`** (see `ProLimits`).
3. Offering identifier **`default`**.
4. Build a paywall in the Paywall Editor.
5. Start one **Experiment** — the cheapest thing that makes the HAMM entry
   non-empty. Monthly-first vs annual-first pricing is the obvious first test.
6. Enable **Customer Center** so subscription management is self-serve.

## 5b. Building the upload binary

Play needs a **signed release AAB**, not the debug APK.

```powershell
./gradlew :composeApp:bundleRelease     # -> composeApp/build/outputs/bundle/release/composeApp-release.aab
./gradlew :composeApp:assembleRelease   # -> a release APK, for sideloading and testing
```

Signing reads from the git-ignored `local.properties`; the keystore is
`backlogue-upload.jks` at the repo root and is also git-ignored.

> ### Back up the keystore now
>
> Copy `backlogue-upload.jks` and its password somewhere outside this repo — a
> password manager is ideal. With Play App Signing enabled, a lost *upload* key
> can be reset by Google support, but it is days of waiting during a hackathon.
> The file is git-ignored, so cloning the repo elsewhere will not bring it.

**The binary is only as configured as `local.properties` was when it was built.**
Empty values compile fine and produce an app whose search says "Search isn't set
up", with no purchases and no alerts. Confirm all four keys are filled and
rebuild before the upload that actually goes to production.

**`versionCode` must increase on every upload.** It is `1` in
`composeApp/build.gradle.kts`; Play rejects a re-used value.

### Verifying before upload

```powershell
$BT = "$env:LOCALAPPDATA\Android\Sdkuild-tools.0.0"
& "$BTpksigner.bat" verify --print-certs composeAppuild\outputspkelease\composeApp-release.apk
```

Should print `CN=Backlogue`. If it prints `CN=Android Debug`, the signing config
did not apply and Play will reject the upload.

**R8 is the real risk in a release build**, because every failure it causes is
invisible in debug: a missing keep rule does not fail the build, it produces an
app that installs, launches, and then throws when it deserialises a search
result. `composeApp/proguard-rules.pro` keeps the reflective surfaces —
serializers, navigation routes, Koin construction, the domain model. After
changing it, check the classes survived:

```powershell
Select-String -Path composeAppuild\outputs\mappingelease\mapping.txt -Pattern 'GameDto|DetailRoute|BacklogEntry'
```

And install the release APK on a device and run a search. Debug builds never
exercise any of this.

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
- [ ] Ship Kotlin Everywhere (JetBrains) — lead with Android + Desktop from one
      Compose UI, and link the desktop build
- [ ] RevenueCat Design Award
- [ ] Next Gen (student — needs your ccsf.edu address and a public repo)
- [ ] #BuildInPublic
- [ ] Keep Them Coming Back (OneSignal)
- [ ] HAMM

Devpost copy is pre-written: the public description in
[docs/devpost.md](docs/devpost.md), the private judge answers in
[docs/devpost-additional.md](docs/devpost-additional.md). The blanks that still
need values are marked with a warning sign in both.

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

- **Purchases have never executed.** The code compiles and the flow is wired,
  but a real purchase needs a real Play Console product. Test on a device before
  submitting — a reviewer will press that button.
- **Desktop has no purchases and no push,** by construction: there is no store
  and no notification service. `createProAccess` returns the free-tier stub and
  `NoPushRegistrar` is bound. The desktop build is the free tier, which is a
  coherent product rather than a broken one.
- **Nothing on iOS has been compiled** and it is out of scope — see section 4.

Also deliberately out of scope: **price-drop alerts**. The Worker handles
release dates and launches, which need only IGDB. Real price tracking needs a
store pricing source IGDB does not provide.
