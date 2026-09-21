# Store submission runbook — Backlogue

Everything Play Console asks for, answered. The **App content answer sheet**
below is the part to read: each section names the exact option to select and why
that one is the honest answer for this app, because several of them are wrong in
ways that only surface months later as a policy strike.

State as of 2026-09-20: version `0.1.0` (versionCode 2) landed on the **internal
testing** track. Not yet on production. Listing text, graphics, the subscription
and RevenueCat are all scripted; what's left is declarations and rollout.

| Thing | Value |
| --- | --- |
| Package | `com.chinesepowered.backlogue` |
| Play listing title | **Backlogue** |
| Category | Entertainment |
| Site / privacy URL | `https://backlogue.chinesepowered.com/` · `/privacy.html` |
| Public contact | `nelson@chinesepowered.com` |
| Subscription | `backlogue_pro_monthly`, base plan `monthly`, $1.99/mo |
| RevenueCat | entitlement `pro`, offering `default`, project `projb3ae91a4` |
| Upload artifact | `composeApp/build/outputs/bundle/release/composeApp-release.aab` |

Two ids are load-bearing and hardcoded in `ProLimits`: entitlement **`pro`** and
offering **`default`**. A typo in either is a paywall that takes the money and
never unlocks, and nothing in the build will warn you.

---

## Step 0 — deploy the site first

`web/` is a static landing page plus the privacy policy. **Put it on
`backlogue.chinesepowered.com` before submitting.** Play fetches the privacy URL
during review, and a 404 is an instant hold. The same URL is also the deletion
URL in the Data safety form, so it has to resolve.

There is no `app-ads.txt` and there shouldn't be — the app ships no ad SDK, and
an unbacked `app-ads.txt` is its own small mess.

## Step 1 — the things only a human can do

- **Create the app** in Play Console: name "Backlogue", en-US, App, **Free**.
  Free/paid is permanent; the subscription is unaffected by it.
- **Grant the service account.** Users and permissions → add the service account
  from `../_android/play-service-account.json` with per-app Admin (or: view app
  info, view financial data, manage orders, manage store presence). Every script
  below 404s with "package not found" until this propagates, which takes a few
  minutes and reads exactly like a wrong package name.

## Step 2 — run the scripts

```bash
node scripts/play-setup.mjs        # title, short + full description, contact email
node scripts/play-assets.mjs       # icon, feature graphic, phone screenshots
node scripts/play-iap-setup.mjs    # backlogue_pro_monthly + activate the base plan
node scripts/revenuecat-setup.mjs  # entitlement `pro`, offering `default`, attach the product
```

The listing text lives in `docs/store/listing.md` and is duplicated inside
`play-setup.mjs`. Edit one, edit the other.

Order matters for the last two: RevenueCat can only attach a product Play
already knows about, and a subscription whose **base plan was never activated**
is invisible to the SDK while looking completely fine in the console.

---

## Step 3 — App content answer sheet

Play Console → **App content**. Work down the list; this is every section it
shows for this app.

### Privacy policy

```
https://backlogue.chinesepowered.com/privacy.html
```

Must be live first (Step 0). The same URL goes in the Data safety deletion field
— Play cross-checks nothing, but a reviewer will.

### App access

**All functionality is available without special access.**

There is no login, no account, no invite code, no region gate. Pro is a
*purchase*, not restricted access — this question is about credentials, and
answering "restricted" here gets you asked for test credentials you don't have.

Worth adding to the review notes anyway:

> Backlogue has no account system. The free tier saves 30 games; Backlogue Pro
> lifts that cap and enables release-date notifications. The paywall is reachable
> from the Pro badge in the pile header at any time. A promo code is attached.

### Ads

**No, my app does not contain ads.**

Verified, not assumed: the merged release manifest has no ad SDK, no
`com.google.android.gms.permission.AD_ID`, and no AdMob dependency. If an ad SDK
is ever added this flips, and so does the Data safety form.

### Advertising ID

**No, my app does not use advertising ID.**

Same evidence. This is the question people get wrong by reflex because a push
SDK is installed — but OneSignal 5.1.34 does not pull in
`play-services-ads-identifier`, and the permission is absent from the merged
manifest. Declaring "yes" here when the permission is absent is its own
rejection.

To re-verify after a dependency bump:

```bash
grep -o 'uses-permission[^/]*' \
  composeApp/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml \
  | sort -u
```

### Content rating (IARC questionnaire)

Category: **Utility, Productivity, Communication, or Other** — Backlogue is a
tool *about* games, not a game. Picking a game category invites questions about
in-game content that don't apply.

Answer **No** to all of: violence (all kinds), sexual content, nudity, profanity,
controlled substances, gambling (real, simulated, and social casino), crude
humour, horror/fear, discrimination, extremism.

Then the questions that are *not* automatic:

| Question | Answer | Why |
| --- | --- | --- |
| Does the app let users interact or exchange content? | **No** | There is no social layer, no comments, no shared lists. Sharing a game uses the OS share sheet to send text out of the app. |
| Does the app share the user's location with other users? | **No** | No location is collected at all. |
| Does the app allow purchases of digital goods? | **Yes** | Backlogue Pro. Then select **only** "digital goods" — not cash-convertible, not NFTs, not loot boxes. |
| Does the app provide unfiltered access to internet content? | **No** | Searches hit a fixed catalogue (IGDB) through our own Worker. There is no browser and no arbitrary URL loading. |

**The one judgment call.** Backlogue displays cover art and summary text from
IGDB for whatever the user searches, and that catalogue includes mature-rated
games — a user searching for Doom sees Doom's cover. The app contains no such
content of its own and never surfaces it unprompted, so the direct content
questions above are genuinely No. But if the questionnaire asks whether the app
displays **third-party content you do not moderate**, answer **Yes**. It's true,
it typically lands the rating at Teen instead of Everyone, and Teen costs this
app nothing. Under-rating is a policy strike; over-rating is not.

Expect **Everyone** or **Teen** depending on that last answer. Either is fine.

### Target audience and content

- Age groups: **18 and over** only.
- "Could your app appeal to children?" → **No**.
- Ads in a store listing targeted to children: N/A (no ads).

18+ is the low-friction answer and is what the sibling apps use. **13+ is the
more accurate one** — plenty of people with a backlog are teenagers — and it
costs nothing here because there are no ads to complicate. What it does invite is
Play checking your icon, screenshots and description for child-appeal signals.
Backlogue's artwork is near-black and text-forward, so it would pass. Choose 13+
if you want the accurate declaration; choose 18+ if you want zero chance of a
listing review question eleven days before a deadline.

Do **not** select any band under 13. That pulls the app into the Families policy:
certified ad SDKs, no personalised anything, and a separate review queue.

### Data safety

Covered in Step 4 below — it's a CSV import, not a form you fill by hand.

### News apps

**No.** Not a news app.

### COVID-19 contact tracing and status apps

**No.**

### Government apps

**No.**

### Financial features

**My app doesn't provide any financial features.**

A subscription is not a financial feature. That section means lending, banking,
crypto exchange, insurance, and tax. Selecting anything there triggers a
documentation request you cannot satisfy.

### Health apps

**No.**

### Sections that should not appear

If either of these shows up, something changed in a dependency and needs
investigating before release:

- **Photo and video permissions** — appears only if `READ_MEDIA_IMAGES` or
  `READ_MEDIA_VIDEO` is in the manifest. Neither is.
- **Foreground service permissions** — appears only if a *typed*
  `FOREGROUND_SERVICE_*` permission is declared. The build has plain
  `FOREGROUND_SERVICE` (from WorkManager, via OneSignal) and never starts a
  foreground service, so no declaration is required.

---

## Step 4 — Data safety, by CSV

Play has no API for this form, only a CSV round-trip through the console.

**The file is already written:** `docs/store/data-safety.csv`. Import it at
App content → Data safety → **Import from CSV**, review every answer on the
screens that follow, and save.

If Play's importer rejects the schema — Google renames response ids without
notice — export a fresh CSV and regenerate:

```bash
node scripts/fill-data-safety.mjs <fresh-export.csv> docs/store/data-safety.csv
```

The script reports any response id it didn't recognise and any REQUIRED question
left blank, so a renamed question shows up as a gap rather than a wrong answer.
`docs/store/data-safety-template.csv` is a real export with every value blanked,
which is what the checked-in CSV was generated from.

### What it declares, and why

Three data types, all **collected, not shared**, all for **app functionality**,
all **optional** (the user can avoid every one of them):

| Type | What it actually is |
| --- | --- |
| Device or other IDs | The OneSignal push subscription id, sent to the alert Worker so a notification can reach this device. |
| App activity → Other actions | The IGDB ids of the *unfinished* games in your pile, so the Worker knows which releases to watch. |
| Financial info → Purchase history | RevenueCat holds purchase tokens and entitlement state. The app never sends this itself. |

"Collected, not shared" is right for all three because OneSignal and RevenueCat
are **service providers** processing on our behalf, and Play's definition of
sharing excludes that. "Optional" is right because nothing registers until
notification permission is granted, and purchase state only exists if something
was bought.

### Three things deliberately not declared

- **Search terms.** They pass through the Worker to IGDB and are never written
  down. Play excludes data processed transiently — in memory, kept no longer
  than the request needs — from disclosure entirely.
- **Crash logs and diagnostics.** There is no crash or analytics SDK in the
  build. Checked against the merged manifest: no AppMeasurement, no Crashlytics.
  Firebase Messaging is present, but only as OneSignal's delivery transport.
- **Advertising ID.** Not requested, permission absent. See above.

Also answered: encrypted in transit **yes** (HTTPS throughout), account creation
**none**, external accounts **no**, deletion requests **yes** with the privacy
policy URL.

If you ever add analytics, a crash reporter, or ads, this form is wrong the
moment you do, and Play treats a stale Data safety declaration as a
misrepresentation rather than an oversight.

---

## Step 5 — release

```bash
./gradlew bundleRelease
```

→ `composeApp/build/outputs/bundle/release/composeApp-release.aab`

Signing reads from `local.properties`. Use **forward slashes** in the keystore
path: Java properties eat backslashes, and the failure surfaces as "The
filename, directory name, or volume label syntax is incorrect", which points at
nothing.

Before uploading, check the internal track's highest versionCode and make sure
`composeApp/build.gradle.kts` is past it. Play rejects a duplicate versionCode
with an error that is clear, but only after a full upload.

Then: internal testing → closed/open if you want → production. For the Shipaton
the app must be **first released between 1 Aug and 30 Sep 2026**.

### Before promoting to production

- [ ] Privacy policy URL live and reachable
- [ ] Data safety CSV imported and saved
- [ ] Content rating questionnaire submitted (rating is issued immediately)
- [ ] Target audience saved
- [ ] Store listing: category Entertainment, countries set
- [ ] Screenshots regenerated if the UI changed (`./gradlew screenshots`)
- [ ] A **purchase tested on a real device** with a licence-tester account —
      this is the one thing an emulator cannot do, and the one thing that fails
      silently if the entitlement id is wrong
- [ ] A **promo code** generated for Backlogue Pro, for the Devpost judges

## Rejection traps already handled

- Privacy policy live before review, same URL in the listing and the Data safety
  deletion field.
- No ad SDK, no advertising ID — and both declared as absent rather than left
  blank.
- Notification permission is requested late, only once the pile holds something
  worth an alert. Requesting on first launch is how apps get permanently denied,
  and Play flags it under the notifications policy too.
- Every notification is a genuine state transition on a game the user chose to
  save. No re-engagement nagging, which is what the spam policy targets.
- Purchase state, push id and game ids are the *complete* list of what leaves
  the device, and the privacy policy says so in the same words as the form.
- No user-to-user content, so no UGC moderation requirements.
- `targetSdk 36`, well inside Play's current requirement.

## Still open

- Theme: force dark, or follow system. This gates whether the four store
  screenshots need regenerating.
- Which target-audience band to file (18+ vs 13+, above).
- Promo code, once the subscription is live.
- Purchase flow unverified on real hardware.
