# Backlogue — Devpost "Additional info" answers

Private to judges and organizers. **A blank field is how you opt out of a
category**, so the blanks below are deliberate. `⚠️` marks anything needing a
value before submitting.

Categories entered: **Ship Kotlin Everywhere (strongest) · Keep Them Coming Back
(OneSignal) · Influencer: Mr Lewis Blogs Gaming · Next Gen · Design · HAMM**.

See [portfolio conflicts](#portfolio-conflicts--decide-before-submitting) before
filling anything in — three categories overlap with the other entries.

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

**RevenueCat project ID** → ⚠️ `[FILL]` — a separate project from Work Capy's
`proj9c2e2619`.

---

## Store URLs

| Field | Value |
| --- | --- |
| Google Play | ⚠️ `https://play.google.com/store/apps/details?id=com.chinesepowered.backlogue` — confirm live before pasting |
| App Store | Blank — **iOS is out of scope**, see below |
| Samsung Galaxy Store | Blank |
| Next Gen repo / student email | ⚠️ `[REPO URL]` / `clai74@mail.ccsf.edu` |

**Why no iOS:** the build machine is Windows, and Kotlin/Native's iOS targets
require the Xcode toolchain, which is macOS-only. The Shipaton accepts Play Store
publication alone, so this costs no eligibility. The iOS sources are written and
in the repo; they have simply never been compiled, and the entry does not claim
otherwise.

## Promo code

⚠️ Generate a Play Console promo code for Backlogue Pro. Per the form's warning,
judges are not required to use it and premium must be demoed **in the first three
minutes of the video** — so show the paywall and an unlocked Pro state early
rather than relying on redemption.

---

## Ship Kotlin Everywhere (JetBrains) — the strongest entry

**Android and desktop from one Compose Multiplatform codebase.** Not a shared
core with two front ends — the same composables render on both. The only
platform-specific UI is the capture surface, which is where the OSes genuinely
differ.

JetBrains state the award counts Android, iOS, desktop and web, and that judges
"reward effective cross-platform development, not platform count alone." What is
worth looking at is *where the seams were drawn*, because that is the actual
craft question in KMP:

- **`expect`/`actual` is used exactly twice** — the SQLite driver and the HTTP
  engine. Those are the only two things that genuinely differ. Everything else
  that looks platform-shaped is handled by dependency injection instead, which
  keeps the shared code free of platform branching.
- **RevenueCat publishes no JVM artifact**, so it could not live in `commonMain`
  once a JVM target existed. It moved into a `mobile` source-set group shared by
  Android and iOS, reached through a `createProAccess` factory. That is a more
  honest structure regardless of the constraint: in-app purchases *are* a phone
  concern, and platforms without a store now get a free-tier implementation
  rather than a link error.
- **The desktop target started as a screenshot renderer.** Compose can rasterise
  offscreen through Skia, so a JVM target was added purely to generate store
  screenshots without an emulator. Giving it a window and a persistent database
  turned it into a real second platform for almost nothing — which is itself the
  argument for Compose Multiplatform.
- **The domain layer imports no framework at all** — no Compose, no Ktor, no
  SQLDelight — so the parser that the whole product rests on is tested with plain
  Kotlin, no device and no network.

Community contribution: two Compose Multiplatform 1.11 findings written up for
the Kotlin Slack — `components-resources` no longer publishing for `iosX64`
(which fails with an error that never mentions the Intel simulator), and
`compose.material3` not bundling icons-core the way the Android artifact does,
so `materialIconsExtended` is the only source of `Icons` and is pinned upstream
at 1.7.3.

## Keep Them Coming Back (OneSignal)

**This is the entry no other project in the portfolio can make** — Work Capy
blanked this category for having no push server. Backlogue has one.

A Cloudflare Worker runs an hourly cron sweep over the games people are watching
and pushes through OneSignal only on a genuine state transition: a watched game
**gained** a release date, its date **moved**, or it **came out**.

Three design decisions worth the judges' attention, all of them about *not*
sending:

1. **Snapshotting is the whole trick.** The Worker records each game's state
   between runs. Without it, the obvious implementation re-sends "out now" every
   hour for a week — precisely the behaviour that gets an app muted and then
   deleted. First sight of a game writes a baseline and sends nothing at all.
2. **Only unresolved games register.** A game you have already beaten or bounced
   off needs no release alert, and registering the whole pile would make the
   sweep do work for every game anyone ever added.
3. **Permission is requested late, and only once there is a reason.** The prompt
   fires the first time the pile contains something worth being notified about —
   never on first launch, which is how apps get permanently denied.

The bar every notification has to clear: *would the player be glad it arrived?* A
backlog tracker has infinite excuses to nag — "you have 47 unplayed games!" —
and every one of them makes the pile feel like a debt, which is the exact failure
the product is designed around.

**Integration:** `PushRegistrar` wraps the OneSignal Android SDK behind an
interface; `AlertSync` mirrors the unresolved half of the pile to the Worker's
`/v1/watch`, debounced so three quick additions are one registration. The
subscription id is polled briefly after start, because OneSignal registers
asynchronously and asking too early fails invisibly until the next pile change.

⚠️ **Honest caveat:** this is wired end to end and compiles, but the full
round-trip has not yet been observed on a physical device. Verify before
submitting — see the note in the video section.

## Influencer Award — Mr Lewis Blogs Gaming

The brief asks for a gaming bucket-list app judged on how effectively users can
organise, complete, rate and share games, and on whether managing a backlog
"feels enjoyable rather than another chore."

Backlogue takes the second half of that as the actual design problem, and it
drove every decision worth naming:

- **No completion percentage anywhere.** No progress rings, no unplayed counter,
  no red badges, no overdue states. Those are the mechanics that convert a
  collection into an obligation. Counts appear only inside the filter chips.
- **"Bounced", not "Abandoned".** A game you gave four hours and didn't click
  with is Bounced. Every other tracker frames that reasonable decision as a
  personal failure.
- **Provenance on every entry.** "From a YouTube video." One database column, and
  it is what turns a list into a record of your taste.
- **Capture is the product.** The organising features exist because a backlog app
  needs them; the share target is why the list is accurate in the first place.

The five statuses are Wishlist, Backlog, Playing, Beaten, Bounced. Rating is
1–10 and only appears once a game is *resolved* — asking someone to score a game
they haven't finished is how trackers fill up with noise.

## Next Gen (student)

⚠️ Student email `clai74@mail.ccsf.edu` (City College of San Francisco). Repo `[REPO URL]`,
MIT licensed.

Judged on the code, so what is worth reading:

- **`ShareTextParser`** — the parser the product rests on, with ten tests written
  against real share-sheet payloads, including the case where every word is noise
  and the fallback has to reinstate the words it just stripped.
- **The domain layer imports no framework**, deliberately, so it is testable
  without a device.
- **Commit history is the actual document.** Every non-obvious decision is argued
  in the commit that made it, including the ones that were wrong and got
  reverted — the Compose Multiplatform coordinate migration that had to be backed
  out because the artifacts are not published at 1.11.1, for instance.
- **A self-audit that found three features which compiled perfectly and did
  nothing**: a paywall button that only closed the sheet, a push system that
  existed entirely server-side, and an API method nothing called. All three
  fixed; the episode is documented rather than quietly cleaned up.

## RevenueCat Design Award

⚠️ Overlaps with Work Capy — see [portfolio conflicts](#portfolio-conflicts--decide-before-submitting).

- **The palette is an argument.** A backlog is guilt made visible for most
  players. Near-black and deferential, because cover art is the most beautiful
  thing on screen and we didn't draw it. The only urgent colour in the system is
  the accent, reserved for adding a game.
- **The empty state teaches the gesture** rather than apologising for having no
  data — it is the first thing every new user and every judge sees.
- **Cover art placeholders are deterministic per title**, so a pile of art-less
  games still reads as a set of distinct objects instead of a column of identical
  grey boxes.
- **Motion is doing real work.** The most important half-second in the app is
  after a share: the user is still inside YouTube and needs to believe the game
  landed before they go back to watching.

## HAMM Award

⚠️ Overlaps with Work Capy, whose case is stronger — see below.

Free tier of 30 games, one Pro subscription lifting the cap and adding release
alerts. The argument is the boundary rather than the price:

**The core loop is never gated.** A cap at five would convert better and would
contradict the only thing this app is for. The paywall appears in exactly two
places — when the free pile is full, and from settings. Never on launch, never
during a capture, because interrupting the two seconds between "that looks good"
and "it's saved" destroys the product.

**Thirty was chosen from what real backlogs look like, not from what converts.**

⚠️ Revenue figures: none. Not published at time of writing.

---

## Portfolio conflicts — decide before submitting

Three categories overlap with the other entries. Flagging rather than guessing:

| Award | Conflict | Suggestion |
| --- | --- | --- |
| **#BuildInPublic** | Work Capy's sheet says "one builder narrative across all our entries — Full Clear carries it." Backlogue has a full post plan written (`socials.md`) built on real material: the CMP `iosX64` finding, the offscreen-Skia screenshot trick, and the audit that found three dead features. | Pick one. If Full Clear keeps it, `socials.md` still runs as ordinary devlog and forum research — the community posts feed the Influencer and Kotlin entries regardless. |
| **Design** | Work Capy entered it. | Work Capy's case is more visually striking — an animated capybara beats a restrained dark palette in a screenshot. Backlogue's case is an *argument* about designing against a genre. Entering both splits your own vote; if you only want one, Work Capy is the safer pick. |
| **HAMM** | Work Capy entered it, is launched, has a real revenue model and actual figures. Backlogue has made $0 and isn't published. | Let Work Capy carry it. Backlogue's HAMM case is honest but empty. |

Backlogue is uncontested on **Kotlin**, **OneSignal**, **Influencer: Gaming**, and
**Next Gen** — and those are where its entry is genuinely strongest.

## Categories deliberately left blank

| Award | Why |
| --- | --- |
| **Catvertising** | Backlogue serves no ads at all. There is nothing to demonstrate, and adding ads to a paid-tier utility to qualify would be transparent. |
| **Best Game** | It is a tool for gamers, not a game. Secret Fantasy holds that slot. |
| **Peace Prize** | Carried by Full Clear and CapyDuo. |
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
> and rather than ship a shallow version we left it out and cut the claim from
> the paywall. The paywall previously advertised custom lists and a year-in-review
> that did not exist; both lines were deleted rather than rushed.
>
> **The repo is the write-up.** Every non-obvious decision is argued in the commit
> that made it, including the reverted ones.

## Interested in the RevenueCat Growth Fund?

⚠️ `[Yes / No]`

---

## Before you paste

- [ ] Play listing live; URL confirmed
- [ ] Repo public (Next Gen judges the code)
- [ ] Demo video: share into the app in the first 15 seconds, Pro shown within 3 minutes
- [ ] Promo code generated
- [ ] RevenueCat project ID filled
- [ ] Portfolio conflicts resolved — don't enter Design/HAMM/BuildInPublic twice by accident
- [ ] **OneSignal round-trip verified on a real device** before claiming it works
