# Shipping Backlogue

Everything that cannot be done from a Linux CI container, in the order it
unblocks the most work. Deadline is **September 30, 2026, 11:45pm PDT**.

Two hard rules from the official rules worth re-reading before you start:

- The app's **first public release must fall between Aug 1 and Sep 30, 2026**.
  Updates to a previously released app do not qualify.
- Every category except Next Gen requires the app **fully published** to the App
  Store, Play Store, or Galaxy Store by the deadline.

---

## Critical path, as of 2026-09-28

Deadline: **Sep 30, 11:45pm PT.** The Devpost entry is submitted and the repo is
public, so **Next Gen is eligible now**. Every other category needs the app
publicly live on Google Play in the US by the deadline; testing tracks do not
count, and "approved" can take up to a day to become visible.

**1. Done: live on Google Play Sep 30.** https://play.google.com/store/apps/details?id=com.chinesepowered.backlogue
The entry carries the Play URL and the first-release confirmation.

~~The first production release is in review. Do not upload anything else
until Play approves it.~~ A new upload replaces the release in review and
restarts the clock. That release is `versionCode 2`, built Sep 10.

**2. Upload `versionCode 3` as an update now.** The
Sep 10 build predates three fixes the demo video shows: the Pro badge that
makes the paywall reachable, the status-bar inset on the game and capture
screens, and the keyboard no longer covering search results after a share.
`versionCode 3` has all three, plus a Share button on the game screen, which
the Gaming influencer brief asks for. Eligibility only depends on the first
release date, and judges install whatever is live when they get to the entry,
so the update lands in time for judging even if it is approved after Sep 30.

   `composeApp/build/outputs/bundle/release/composeApp-release.aab`

**3. A promo code or a free trial is required** for judges to reach Pro, and
the entry has neither. Play Console, Monetize, Promo codes, once the app is live,
then paste it into Devpost field 28135.

**4. Once live, re-submit Devpost** with the Play URL (field 27384) and the
first-release box (field 27380) ticked. Both were left blank on purpose.

**5. #BuildInPublic needs posts.** The award is for a journey shared on social
media, and the entry links only to the commit history. `socials.md` has drafts.

---

## 0. Confirm the name

`Backlogue` is confirmed available and the rename is done throughout — package
`com.chinesepowered.backlogue`, URL scheme `backlogue://`, App Group
`group.com.chinesepowered.backlogue`.

## 1. Accounts and keys

| Service | What you need | Where it goes |
| --- | --- | --- |
| [Twitch Developer](https://dev.twitch.tv/console/apps) | Client ID + Secret | Worker secrets only |
| [RevenueCat](https://app.revenuecat.com) | Android public SDK key | `local.properties` |
| [OneSignal](https://onesignal.com) | App ID + REST API key | App ID in `local.properties`, REST key in Worker |
| [Cloudflare](https://dash.cloudflare.com) | Account for Workers + KV | — |

Done — all four are live. IGDB has no separate signup: it authenticates through
Twitch, so a Twitch app *is* an IGDB app.

## 2. Deploy the Worker

Done and verified in production: search returns real IGDB results, and a push
was observed end-to-end on an emulator (registration `watch:c81a169f… → [11737]`,
then a delivered notification).

See [`server/README.md`](server/README.md) to redeploy.

Verify: `curl https://backlogue-api.<subdomain>.workers.dev/v1/health` → `{"ok":true}`

## 3. Fill in `local.properties`

Git-ignored, never committed:

```properties
sdk.dir=C:/Users/you/AppData/Local/Android/Sdk
BACKLOGUE_API_BASE_URL=https://backlogue-api.<subdomain>.workers.dev
REVENUECAT_ANDROID_KEY=goog_xxx
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**Use forward slashes in every path here.** Java properties files treat a
backslash as an escape and eat it silently; the failure surfaces much later as
"The filename, directory name, or volume label syntax is incorrect", which
points at nothing.

## 4. Platforms — Android, Desktop, and what iOS actually is

The entry is **Android + Desktop**, sharing one Compose Multiplatform UI.

```powershell
./gradlew :composeApp:run          # desktop app
./gradlew :composeApp:packageMsi   # desktop installer, if you want to ship it
```

Ship the desktop build as a GitHub release asset and link it from the Devpost
entry — it is the cheapest possible proof that the multiplatform claim is real.

**On iOS: the shared Kotlin compiles and links.** A macOS CI runner
(`.github/workflows/ios.yml`) produces `ComposeApp.framework` for
`iosSimulatorArm64`, RevenueCat included, because `purchases-kmp` lives in the
`mobile` source set that iOS compiles. That job passed in 11m37s.

What is *not* done is Xcode project packaging and an App Store release. Day-to-day
development is on Windows, where Kotlin/Native cannot build Apple targets at all.
The Shipaton accepts Play Store publication alone, so this costs nothing on
eligibility.

The workflow is restricted to `workflow_dispatch` plus iOS-relevant paths on
purpose: macOS runners bill at 10× on private repos, about 120 minutes of a
2,000-minute monthly allowance per push.

If you pick iOS up on the MacBook, `setup.md` appendix A has the sequence. Half a
day is realistic now that the Kotlin side is proven — it is Xcode wiring, not
Kotlin work.

## 5. RevenueCat dashboard

1. Products exist in Play Console first — RevenueCat can only import products
   that already exist. `scripts/play-iap-setup.mjs` creates them.
2. Entitlement identifier must be exactly **`pro`** (see `ProLimits`).
3. Offering identifier **`default`**.
4. Build a paywall in the Paywall Editor.
5. Start one **Experiment** — the cheapest thing that makes the HAMM entry
   non-empty. Monthly-first vs annual-first pricing is the obvious first test.
6. Enable **Customer Center** so subscription management is self-serve.

A mismatch in either id produces no error — just a paywall that takes the money
and never unlocks.

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

**`versionCode` must increase on every upload.** It is `2` in
`composeApp/build.gradle.kts` and a build is already on internal testing. Check
the track's highest value and go past it; Play rejects a re-used versionCode,
but only after a full upload.

> **Memory note.** Three consecutive release builds were OOM-killed on this
> machine before `gradle.properties` was lowered to `-Xmx2048M` with
> `kotlin.daemon.jvmargs=-Xmx1536M`. If a build dies without an error, that is
> what happened — run `./gradlew --stop` and retry.

### Verifying before upload

```powershell
$BT = "$env:LOCALAPPDATA/Android/Sdk/build-tools/36.0.0"
& "$BT/apksigner.bat" verify --print-certs `
    composeApp/build/outputs/apk/release/composeApp-release.apk
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
Select-String -Path composeApp/build/outputs/mapping/release/mapping.txt `
    -Pattern 'GameDto|DetailRoute|BacklogEntry'
```

And install the release APK on a device and run a search. Debug builds never
exercise any of this.

## 6. Store listing and declarations

**All written.** [docs/store/store-submission.md](docs/store/store-submission.md)
answers every Play Console *App content* section with the reasoning behind each
choice, and `docs/store/data-safety.csv` is ready to import.

Assets in `docs/store/`: 1024 and 512 icons (no alpha), feature graphic, and
four screenshots at 1179×2556 with no device frame in `docs/screenshots/`.

Two things gate the rest:

- **The site is live** at https://backlogue-app.vercel.app/ — privacy policy at
  `/privacy.html`. That was the gating item: Play fetches the privacy URL during
  review, and the same URL is the deletion-request URL in the Data safety form,
  so a 404 would have failed twice.
- Play: a personal account predating Nov 2023 skips the 12-tester gate, but
  still budget 3–7 days for first review.

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
- [ ] Grand Prize

Devpost copy is pre-written: the public description in
[docs/devpost.md](docs/devpost.md), the private judge answers in
[docs/devpost-additional.md](docs/devpost-additional.md). The blanks that still
need values are marked with a warning sign in both.

Required attachments: text description, **demo video under 2 minutes** on
YouTube or Vimeo, store listing URL, 1024×1024 icon, ≥1 screenshot at
1179×2556, and either a free trial or a promo code so judges can reach Pro.

**Do not forget the promo code.** A judge who cannot get past the paywall
scores what they can see.

`.mcp.json` configures Devpost's MCP server, which can drive parts of the
submission from here. It needs a Claude Code restart to load, and it does not
remove the need for the video or the store URL.

## 8. The demo video — the real blocker

**Nothing has been recorded.** This is the one required attachment with no
draft, and unlike everything else it cannot be written — it needs the app
running somewhere you can film.

Two minutes, and the first fifteen seconds decide it. Open inside a YouTube
video, share into Backlogue, show the game landing. That is the entire pitch,
and every other tracker's video physically cannot show it.

Then: the pile, a status change, a rating, and the provenance line. Show the
paywall and an unlocked Pro state **inside the first three minutes** — the
Devpost form says judges are not required to redeem a promo code, so a paywall
only visible at the end may not be seen at all.

Three ways to get the footage, cheapest first:

1. **Your Android phone.** Install the release APK, screen-record from the
   notification shade, share a YouTube video into the app. This is the only
   option that shows the real share sheet with real apps in it, which is the
   whole point of the opening shot.
2. **An emulator.** The share sheet works and shares can be injected with
   `adb shell am start -a android.intent.action.SEND`. The emulator was removed
   from this machine after push verification; recreating it costs an hour or so.
   Play billing does not work here, so the Pro state would have to be faked or
   skipped.
3. **The desktop build** for the pile, filtering and detail screens. It cannot
   show capture, which is the pitch — so it is B-roll at best.

Option 1 is the only one that produces the opening shot the pitch depends on.

---

## What is already done

- Android app builds, runs, and is on the **internal testing** track
- Release AAB and APK built and signed (`CN=Backlogue` verified)
- Worker deployed; search and push both verified end-to-end
- Shared Kotlin compiles for Android, desktop, **and iOS** (CI, macOS runner)
- Design system, domain model, capture parser, pile/search/detail, paywall UI
- Store listing text, icons, feature graphic, four screenshots
- Play App content answers and the Data safety CSV
- Devpost public description and private judge answers
- `slides.html` pitch deck, `socials.md` build-in-public posts
- `web/` landing page and privacy policy — **deployed** to
  https://backlogue-app.vercel.app/

## Known gaps — read this before submitting

- **Not on production.** Internal testing only; Play review is 3–7 days.
- **Purchases have never executed.** The code compiles and the flow is wired,
  but a real purchase needs a real Play Console product and real hardware — an
  emulator cannot test Play billing. A reviewer will press that button.
- **No promo code** for judges yet; needs the subscription live.
- **No build-in-public thread URL** in the Devpost doc yet.
- **Theme undecided** — force dark vs follow system. This gates whether the four
  store screenshots need regenerating.
- **Xcode packaging for iOS is not done**, and is out of scope for the deadline.
  The Kotlin compiles; see section 4 for exactly what that does and does not mean.

Also deliberately out of scope: **price-drop alerts**. The Worker handles
release dates and launches, which need only IGDB. Real price tracking needs a
store pricing source IGDB does not provide.
