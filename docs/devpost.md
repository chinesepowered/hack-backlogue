# Backlogue: Devpost project description

Paste into **Project details, description**. Public, and the first thing judges
read. Every factual claim here was checked against the code on 2026-09-28; if
you change the app, check this again, because a RevenueCat developer installs
finalists specifically to verify claims.

House style: no em dashes.

---

## A gaming bucket list that lives in your share sheet

You're three minutes into a review and something looks good. To save it, every other backlog app wants you to leave the video, open the app, search for the game and file it.

Almost nobody does that, which is why almost nobody's backlog is accurate.

Backlogue is a share target. Share the video, the Reddit thread or the Steam page into it, and the game lands in your pile in one tap, without leaving what you were watching.

**Who it's for:** anyone whose list of games they meant to play lives in their head, a notes app, or twenty open browser tabs.

## Everyone else is fighting the wrong battle

Every tracker on the store competes on organising games you have *already* saved: tags, filters, custom lists, sort orders. All of that assumes the list is complete.

It never is. Games get lost in the gap between hearing about one and getting around to filing it, and no amount of organising fixes a gap that happens before the app is even open. So the product is one gesture, and everything else is bookkeeping.

## The hard part is a text parser

A Steam share is easy, because the game's name is sitting in the URL: `/app/1030300/Hollow_Knight_Silksong/`.

A YouTube share is a video title, and video titles are written to be clicked, not parsed: `SILKSONG IS FINALLY HERE! First Impressions | IGN`.

Backlogue strips bracketed tags, 52 noise phrases ("official trailer", "first impressions", "before you buy"), shouted hype words, and a trailing `| Channel`, but only when that tail matches a known outlet, so `Dark Souls | Remastered` survives intact.

It deliberately under-cleans, because search copes with an extra word far better than with a butchered title. When the only way to produce a query is to put back words it had marked as noise, it says so, flags the guess as low confidence, and opens a focused search box instead of pretending it understood.

That file is the least glamorous one in the project and the one everything rests on. It has ten tests built from real share-sheet payloads.

## It remembers where you found it

Every game keeps a line saying where it came from: *"From a YouTube video."* *"From Reddit."* *"From Steam."*

It costs one database column. Six months later it's the difference between a list that reads like a record of your own taste and one that reads like homework.

## Designed against its own genre

For most players a backlog is low-grade guilt. Every "pile of shame" joke is someone telling you their tracker made them feel bad. So Backlogue refuses the genre's usual mechanics.

**No numbers anywhere.** No completion percentage, no "47 unplayed games" counter, no progress rings, no red badges, no overdue states. A status with nothing in it doesn't even get a filter chip, so a new player's filter row is never a row of zeroes.

**"Bounced", not "Abandoned".** A game you tried and didn't click with is Bounced. Other trackers say Dropped or Abandoned, and both read like an accusation about a perfectly reasonable decision. "I bounced off it" is what players actually say, and it puts the mismatch on the game rather than on you.

**Dark-first and art-forward.** Cover art is the most beautiful thing on the screen and we didn't draw it, so the interface stays out of its way. In dark mode the app is near-black. On a light-mode phone it follows the system with a light palette built from the same design tokens. Either way, the one loud colour is reserved for adding a game.

## Alerts that earn their notification

Something has to stay awake to notice when a game you wanted finally gets a release date. A Cloudflare Worker sweeps the watched games every hour and pushes through OneSignal, but only on a real change: a game gained a date, its date moved, or it came out.

The Worker keeps a snapshot of every game between runs. Without it, the obvious implementation re-sends "out now" every hour for a week, which is exactly how an app gets muted and then deleted. The first sighting of a game writes a baseline and sends nothing.

Only unfinished games are watched. A game you've already beaten doesn't need a release alert.

## How it makes money

The core loop is never gated. Saving, organising and rating up to 30 games is free for good. **Backlogue Pro, $1.99 a month through RevenueCat,** removes the cap and turns on release alerts.

A cap of five would convert better, and it would contradict the only thing this app is for. A paywall in the middle of saving a game would wreck the two seconds the whole product exists to protect, so the paywall appears in exactly two places: the Pro badge in the pile header, and the moment the free pile is full. Never on launch, and never mid-capture.

## One Kotlin codebase

Built with Kotlin Multiplatform and Compose Multiplatform. Android and desktop render the same composables, rather than a shared core with two hand-written front ends. The only platform-specific UI is the capture surface, because that's where the operating systems genuinely differ.

The shared Kotlin also compiles and links for iOS. A public GitHub Actions workflow on a macOS runner builds `ComposeApp.framework` with RevenueCat included. What isn't done yet is the Xcode packaging and an App Store release.

## Awards we're entering, and why

- **Next Gen.** A student project, with the full source public and MIT licensed.
- **RevenueCat Design Award.** The design argument is which mechanics were refused. The Design answer points to the details worth noticing.
- **HAMM.** A paywall placed where it can't damage the core loop, and a free tier sized from real backlogs rather than from conversion.
- **Keep Them Coming Back (OneSignal).** Release alerts that only fire on a real change, with snapshotting so nothing ever repeats.
- **Ship Kotlin Everywhere.** One Compose Multiplatform UI on Android and desktop, with the shared code linking for iOS in CI.
- **Influencer Award: Gaming.** A bucket list for saving, organising, completing and rating games that is built, first and foremost, not to feel like a chore.

## Links

- Source, MIT licensed: https://github.com/chinesepowered/hack-backlogue
- iOS build in CI: https://github.com/chinesepowered/hack-backlogue/actions/workflows/ios.yml
- Site and privacy policy: https://backlogue-app.vercel.app/
