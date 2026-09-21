# Backlogue — Devpost "Additional info" answers

Private to judges and organizers. **A blank field is how you opt out of a
category**, so the blanks below are deliberate. `⚠️` marks anything needing a
value before submitting.

Categories entered: **Ship Kotlin Everywhere · Keep Them Coming Back (OneSignal)
· Influencer: Mr Lewis Blogs Gaming · Next Gen · Design · HAMM · #BuildInPublic
· Grand Prize**.

---

## Attachments and eligibility

**1024 × 1024 uncropped app icon attached?** → Yes — `docs/store/icon-1024.png`.
Rendered opaque RGB with no alpha channel, which App Store Connect rejects only
after upload.

**Screenshot WITHOUT device frames?** → Yes — `docs/screenshots/*.png`, rendered
offscreen at exactly 1179×2556. No frames exist to remove; nothing is composited
over them.

**First released between 1 Aug and 30 Sep 2026?** → ⚠️ **Yes**, once Play review
clears. Never publicly released before the window.

**Employee of RevenueCat or a Shipaton Sponsor?** → No.

**App type (select all that apply)** → Entertainment / Utilities, matching the
store categories.

**RevenueCat project ID** → `projb3ae91a4`

---

## Store URLs

| Field | Value |
| --- | --- |
| Google Play | ⚠️ `https://play.google.com/store/apps/details?id=com.chinesepowered.backlogue` — confirm live before pasting |
| App Store | Blank — iOS out of scope, see below |
| Samsung Galaxy Store | Blank |
| Next Gen repo / student email | https://github.com/chinesepowered/hack-backlogue / `clai74@mail.ccsf.edu` |

**On iOS:** the shared Kotlin **compiles and links for iOS** — CI on a macOS
runner produces `ComposeApp.framework` for `iosSimulatorArm64`, RevenueCat
included, since `purchases-kmp` lives in the `mobile` source set that iOS
compiles. The iOS Swift sources and both Apple targets are in the repo and always
were. What is not done is Xcode project packaging and an App Store release.

Day-to-day development moved to a Windows machine, where Kotlin/Native cannot
build Apple targets at all, so that work went unstarted rather than being
attempted and abandoned. The Shipaton accepts Play Store publication alone, so
nothing here affects eligibility.

## Promo code

⚠️ Generate a Play Console promo code for Backlogue Pro. Per the form's warning,
judges are not required to use it and premium must be demoed **in the first three
minutes of the video** — so show the paywall and an unlocked Pro state early
rather than relying on redemption.

---

## Ship Kotlin Everywhere (JetBrains)

**Android and desktop from one Compose Multiplatform codebase.** Not a shared
core with two front ends — the same composables render on both. The only
platform-specific UI is the capture surface, which is where the operating systems
genuinely differ.

JetBrains state the award counts Android, iOS, desktop and web, and that judges
"reward effective cross-platform development, not platform count alone." What is
worth looking at is *where the seams were drawn*, because that is the real craft
question in KMP:

- **`expect`/`actual` is used exactly twice** — the SQLite driver and the HTTP
  engine. Those are the only two things that genuinely differ. Everything else
  that looks platform-shaped goes through dependency injection instead, which
  keeps shared code free of platform branching. A `PushRegistrar` seam that
  briefly became an `expect`/`actual` was deleted again once it turned out each
  platform module could simply bind its own implementation.
- **RevenueCat publishes no JVM artifact**, so it could not stay in `commonMain`
  once a JVM target existed. It moved to a `mobile` source-set group shared by
  Android and iOS, reached through a `createProAccess` factory. That is a more
  honest structure regardless of the constraint: in-app purchases *are* a phone
  concern, and platforms without a store now get a free-tier implementation
  rather than a link error.
- **The desktop target started as a screenshot renderer.** Compose can rasterise
  offscreen through Skia, so a JVM target was added purely to generate store
  screenshots without an emulator. Giving it a window and a persistent database
  turned it into a genuine second platform for about twenty minutes of work —
  which is itself the strongest argument for Compose Multiplatform we could make.
- **The domain layer imports no framework at all** — no Compose, no Ktor, no
  SQLDelight — so the parser the whole product rests on is tested in plain
  Kotlin, with no device and no network.
- **Screens are state-in, callbacks-out.** The ViewModel-bound versions delegate
  to pure content composables, which is what makes the offscreen renderer able to
  draw the real screens without a database or a coroutine that has had time to
  emit.

**Community contribution:** two Compose Multiplatform 1.11 findings written up
for the Kotlin community — `components-resources` no longer publishing for
`iosX64` (which fails with an error that never mentions the Intel simulator as
the cause), and `compose.material3` not bundling icons-core the way the Android
artifact does, making `materialIconsExtended` the only source of `Icons` while
being pinned upstream at 1.7.3.

## Keep Them Coming Back (OneSignal)

A Cloudflare Worker runs an hourly cron sweep over the games people are watching
and pushes through OneSignal only on a genuine state transition: a watched game
**gained** a release date, its date **moved**, or it **came out**.

Three design decisions worth attention, all of them about *not* sending:

1. **Snapshotting is the whole trick.** The Worker records each game's state
   between runs. Without it, the obvious implementation re-sends "out now" every
   hour for a week — precisely the behaviour that gets an app muted and then
   deleted. First sight of a game writes a baseline and sends nothing at all.
2. **Only unresolved games register.** A game already beaten or bounced off needs
   no release alert, and registering the whole pile would make the sweep do work
   for every game anyone ever added.
3. **Permission is requested late, and only once there is a reason.** The prompt
   fires the first time the pile contains something worth being notified about —
   never on first launch, which is how apps get permanently denied.

The bar every notification has to clear: *would the player be glad it arrived?*
A backlog tracker has infinite excuses to nag — "you have 47 unplayed games!" —
and every one of them makes the pile feel like a debt, which is the exact failure
this product is designed around. The restraint is the feature.

**Integration:** `PushRegistrar` wraps the OneSignal Android SDK behind an
interface. `AlertSync` mirrors the unresolved half of the pile to the Worker's
`/v1/watch`, debounced so three quick additions become one registration. The
subscription id is polled briefly after start, because OneSignal registers
asynchronously and asking too early fails invisibly until the next pile change.
Delivery goes out through the OneSignal REST API from the Worker's scheduled
handler, batched by game so one release fans out to every watcher in a single
call.

## Influencer Award — Mr Lewis Blogs Gaming

The brief asks for a gaming bucket-list app judged on how effectively users can
organise, complete, rate and share games, and on whether managing a backlog
"feels enjoyable rather than another chore."

Backlogue treats the second half as the actual design problem, and it drove every
decision worth naming:

- **No completion percentage anywhere.** No progress rings, no unplayed counter,
  no red badges, no overdue states. Those are the mechanics that convert a
  collection into an obligation. Counts appear only inside the filter chips,
  where the player went looking for them.
- **"Bounced", not "Abandoned".** A game you gave four hours and didn't click
  with is Bounced. Every other tracker frames that entirely reasonable decision
  as a personal failure.
- **Provenance on every entry.** "From a YouTube video." One database column, and
  it is what turns a list into a record of your taste rather than a chore list.
- **Capture is the product.** The organising features exist because a backlog app
  needs them; the share target is why the list is accurate in the first place.

Five statuses — Wishlist, Backlog, Playing, Beaten, Bounced. Rating is 1–10 and
only appears once a game is *resolved*, because asking someone to score a game
they haven't finished is how trackers fill up with noise. Sharing a game out
produces a card built from the same design system, so what gets posted looks like
the app rather than a screenshot of a list.

## Next Gen (student)

Student email `clai74@mail.ccsf.edu` (City College of San Francisco). Repo
https://github.com/chinesepowered/hack-backlogue,
MIT licensed.

Judged on the code, so what is worth reading:

- **`ShareTextParser`** — the parser the product rests on, with ten tests written
  against real share-sheet payloads, including the case where every word is noise
  and the fallback has to reinstate the words it just stripped rather than hand
  the user an empty search box.
- **The domain layer imports no framework**, deliberately, so it is testable
  without a device or a network.
- **Commit history is the actual document.** Every non-obvious decision is argued
  in the commit that made it, including the ones that were wrong and got
  reverted — the Compose Multiplatform coordinate migration backed out because
  those artifacts are not published at 1.11.1, for instance.
- **A self-audit that found three features which compiled perfectly and did
  nothing**: a paywall button that only closed the sheet, a push system that
  existed entirely server-side, and an API method nothing called. All three
  fixed, and the episode is documented rather than quietly cleaned up. The
  lesson — that a compiler cannot check integrations — is the most useful thing
  this project produced.

## RevenueCat Design Award

The brief asks for craft regardless of business potential. The craft argument
here is that **the palette is an argument**, not a decoration.

- **A backlog is guilt made visible.** Every "pile of shame" joke is a user
  telling you their tracker made them feel bad. So the design is built against
  its own genre: near-black and deferential, because cover art is the most
  beautiful thing on the screen and we didn't draw it. The interface gets out of
  its way.
- **One urgent colour in the entire system.** The accent is reserved for the
  single genuinely happy action — adding a game. Nothing else in the app is
  allowed to shout, and there is no red anywhere.
- **The empty state teaches the gesture** rather than apologising for having no
  data. It is the first thing every new user and every judge sees, and a brand
  new pile is empty by definition, so it gets treated as a designed screen rather
  than a fallback.
- **Cover art placeholders are deterministic per title.** IGDB has no art for
  unannounced games and a freshly added title renders before its image arrives,
  so the fallback is a tinted panel with the game's initials, hashed from the
  name. A pile of art-less games still reads as a set of distinct objects instead
  of a column of identical grey boxes.
- **Motion is doing real work.** The most important half-second in the app is
  after a share: the user is still inside YouTube, thumb still moving, and needs
  to believe the game landed safely before going back to watching.
- **Colour never carries meaning alone.** Status is always labelled as well as
  tinted, because two of the five hues sit close enough to confuse a
  red-green colourblind player, and status is the primary thing being read.

Worth comparing the pile against any other backlog tracker side by side. The
difference is not styling; it is which mechanics were refused.

## HAMM Award

The award asks for the smartest *use* of RevenueCat, and the smart decision here
was where to draw the line rather than how hard to push it.

**The core loop is never gated.** Adding, organising, rating and sharing up to 30
games is free forever. A cap at five would convert better — and would contradict
the only thing this app is for. The paywall appears in exactly two places: when
the Pro badge in the pile header, and the moment the free pile is full. Never
on launch, never during a
capture, because interrupting the two seconds between "that looks good" and
"it's saved" destroys the product.

**Thirty was chosen from what real backlogs look like, not from what converts.**
Median wishlists sit far below it; anyone who hits the cap is a committed user
rather than a curious one, which means the paywall only ever appears to someone
who already knows what the app is worth.

**Pro sells the things that only matter once you already care** — an uncapped
pile and release alerts. It deliberately does not sell anything that makes the
free experience worse.

**The claims were cut to match the product.** The paywall previously advertised
custom lists and a year-in-review. Neither existed, so both lines were deleted
rather than shipped shallow. Selling a feature that does not exist is the one
thing that would actually sink a store review.

**RevenueCat integration:** entitlements are read through a `ProAccess`
interface, so view models never see purchase plumbing and the UI runs against a
stub with no store connection. Entitlement state is pushed rather than polled via
`PurchasesDelegate`, so a renewal or refund that happens while the app is
backgrounded revokes Pro without needing a relaunch. Purchase outcomes separate
*cancelled* from *failed* — backing out of a store sheet is not an error, and
showing one for it is the fastest way to make a paywall feel hostile.

⚠️ Before submitting: run one Experiment (monthly-first vs annual-first) and
enable Customer Center. Both are cheap and both are concrete evidence of using
the platform rather than just its SDK.

## #BuildInPublic

The journey is documented in `socials.md` and, more usefully, in the commit
history — every non-obvious decision argued in the commit that made it.

The lessons that actually generalise:

**A compiler cannot check integrations.** A self-audit found three features that
compiled perfectly, passed tests, and did nothing: the paywall's "Get Pro" button
only closed the sheet, push notifications existed entirely server-side so no
device could ever receive one, and the API method for registering alerts was dead
code. Green build, three dead features, each one two correct halves that were
never joined.

**Store screenshots without an emulator.** No KVM on the build box and no Mac, so
no emulator and no simulator. Compose can lay out and rasterise entirely
offscreen through Skia — `./gradlew screenshots` renders the real composables to
PNG at exactly 1179×2556. Better than a mock-up, because they come from the
shipping composables and physically cannot drift from the app.

**Errors that point nowhere near their cause**, collected as they happened:
Android Studio's bundled JDK 25 being rejected by the Android Gradle Plugin with
a message consisting solely of `25.0.2`; backslashes in a `local.properties` file
silently eaten by Java properties escaping and surfacing as "The filename,
directory name, or volume label syntax is incorrect"; Compose Multiplatform 1.11
dropping `components-resources` for `iosX64` and failing with an error that never
mentions the Intel simulator.

**Community research that changed the product.** The forum posts in `socials.md`
are written to ask real questions of r/patientgamers — the subreddit that is
literally people with backlogs — and the answers are meant to change the design
visibly, with the change credited back to the thread.

⚠️ Link the post thread before submitting.

## Grand Prize

Judged on traction and growth momentum during the event. Backlogue's honest
argument is not audience size but **shareability of the core gesture**: the
product is a share target, so every use of it happens inside another app where
other people are already watching. The demo is fifteen seconds long and every
other backlog tracker is structurally incapable of filming it.

⚠️ Fill in install and retention figures before submitting if any exist.

---

## Categories deliberately left blank

| Award | Why |
| --- | --- |
| **Catvertising** | Backlogue serves no ads at all. There is nothing to demonstrate, and bolting ads onto a paid-tier utility to qualify would be transparent. |
| **Best Game** | A tool for gamers, not a game. |
| **Peace Prize** | The anti-guilt design is a genuine wellbeing argument, but it is not in the same category as entries doing accessibility or mental-health work, and stretching for it would read as spray-and-pray. |
| **Best App for Galaxy** | No Galaxy Store build. Samsung IAP cannot be tested without physical Galaxy hardware, and RevenueCat's Galaxy support does not reach the KMP SDK. |
| Noise · Replit · Layers · Funnel Vision | Not applicable. |

## Additional notes for the judges

> **Two platforms, one UI.** Android and desktop render the same Compose
> Multiplatform composables. The desktop build is deliberately the free tier —
> there is no store and no notification service on that platform, so purchases
> and push resolve to honest no-ops rather than buttons that fail.
>
> **The notification restraint is the feature.** The Worker snapshots every
> watched game between hourly runs specifically so "out now" fires once instead
> of every hour for a week, and permission is never requested until the pile
> contains something worth alerting on.
>
> **Deliberately not built:** price-drop alerts. IGDB carries no pricing data,
> and rather than ship a shallow version we left it out — and cut the claim from
> the paywall rather than leave it selling something absent.
>
> **The repo is the write-up.** Every non-obvious decision is argued in the
> commit that made it, including the reverted ones.

## Interested in the RevenueCat Growth Fund?

No.

---

## Before you paste

- [ ] Play listing live; URL confirmed
- [ ] Make **hack-backlogue** public (Next Gen judges the code) — not the
      older `hack-ship` repo, which still holds pre-rewrite history and
      should stay private
- [ ] Demo video: share into the app in the first 15 seconds, Pro shown within 3 minutes
- [ ] Promo code generated
- [x] RevenueCat project ID filled
- [ ] One RevenueCat Experiment running + Customer Center enabled (HAMM)
- [ ] Build-in-public thread linked
- [x] **OneSignal verified end to end** on an Android 36 emulator: the device
      obtained a subscription id, `AlertSync` registered it against the Worker
      (`watch:c81a169f… -> [11737]`, with the reverse index and sweep list
      written), and a notification sent through the OneSignal REST API was
      received and displayed by the device.
- [ ] **Verify a purchase on a real device before submitting.** This is the one
      claim still resting on the compiler. It cannot be tested on an emulator —
      it needs a Play-signed-in account — and this project has already produced
      three features that compiled perfectly and did nothing. Do not claim the
      paywall works until you have watched a purchase unlock Pro.
