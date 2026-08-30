# Backlogue — Devpost project description

Paste into **Project details → description**. Public, and the first thing judges
read.

---

## A gaming bucket list that lives in your share sheet

You're three minutes into a review. Something looks good. To save it, every other
backlog app asks you to leave the video, open the app, search for the game, and
file it.

Almost nobody does that. That's why almost nobody's backlog is accurate.

Backlogue is a share target. Share the video, the thread, or the store page into
it and the game is in your pile in one tap, without leaving what you were
watching.

## Everyone is fighting the wrong battle

Every tracker on the store competes on organising games you have *already* saved
— tags, filters, custom lists, sort orders. All of that assumes the list is full.

The list is never full. Games are lost in the gap between hearing about one and
getting around to filing it, and no amount of organising fixes a gap that
happens before the app is even open.

So the entire product is one gesture, and everything else is bookkeeping.

## The hard part is a text parser

A Steam share is easy — the game name is sitting in the URL:
`/app/1030300/Hollow_Knight_Silksong/`.

A YouTube share is this:

> `🔥 SILKSONG IS FINALLY HERE — First 3 Hours | IGN`

Backlogue strips bracketed tags, fifty-odd noise phrases ("official trailer",
"first impressions", "before you buy"), shouted hype words, and a trailing
`| Channel` — but **only** when the tail matches a known outlet, so
`Dark Souls | Remastered` survives intact.

It biases hard toward *under*-cleaning, on the theory that search tolerates extra
words far better than it tolerates a butchered title. When it can only produce a
result by putting back words it had classified as noise, it says so, marks the
guess low-confidence, and opens a focused search field instead of pretending it
understood.

That file is the least glamorous in the project and the one the whole product
rests on. It has ten tests written against real share-sheet payloads.

## It remembers where you found it

Every game keeps a note of where it came from. *"Hollow Knight: Silksong — from a
YouTube video."*

That costs one database column, and six months later it is the difference between
a list that reads like a record of your own taste and a list that reads like
homework. It is the feature people will screenshot.

## Designed against its own genre

The thing this app visualises is, for most players, a source of low-grade guilt.
Every "pile of shame" joke is a user telling you their tracker made them feel bad.

So Backlogue is built against the genre's instincts:

**No completion percentage.** No progress rings, no "47 unplayed games" counter,
no red badges, no overdue states. Those are the mechanics that turn a collection
into an obligation. Counts appear only inside the filter chips, where you went
looking for them.

**Near-black and art-forward.** Cover art is the most beautiful thing on the
screen and we didn't draw it, so the interface gets out of its way. The only
urgent colour in the entire system is the accent, and it is reserved for the one
genuinely happy action: adding a game.

**"Bounced", not "Abandoned".** Games you started and didn't finish are Bounced.
Every other tracker calls this Dropped or Abandoned, and both land like an
accusation about a perfectly reasonable decision. *"I bounced off it"* is what
players actually say, and it puts the mismatch on the game rather than on you.

## Alerts that earn their notification

Something has to be awake when you aren't, to notice that a game you wanted
finally got a release date. A Cloudflare Worker sweeps the games people are
watching on an hourly cron and pushes through OneSignal — but only on a genuine
transition: a game gained a date, its date moved, or it came out.

The Worker snapshots every game between runs, which is the part that makes it
bearable. Without it the obvious implementation re-sends "out now" every hour for
a week, and that is exactly the kind of notification that gets an app muted and
then deleted. First sight of a game writes a baseline and sends nothing.

Only unresolved games are registered. A game you already beat needs no release
alert.

## The monetization argument

**The core loop is never gated.** Adding, organising, rating and sharing up to 30
games is free forever. The permission prompt for notifications isn't even shown
until you have something in your pile worth being notified about — asking on
first launch is how apps get permanently denied.

Pro lifts the cap and adds the release alerts. That's it.

**A cap at five would convert better.** It would also contradict the only thing
this app is for. A paywall in the middle of saving a game destroys the two
seconds the entire product exists to protect, so the paywall appears in exactly
two places: when the free pile is full, and from settings. Never on launch, never
mid-capture.

Thirty was chosen from what real backlogs actually look like, not from what
converts.

## One Kotlin codebase, two platforms

Compose Multiplatform — Android and desktop share the *same UI*, not a shared
core with two hand-written front ends. The only platform-specific code is the
capture surface, because that is genuinely where the operating systems differ.

Desktop isn't a token second target either. A lot of game discovery happens in a
browser tab on a PC, and a backlog that only exists on your phone is one you have
to remember to open.

One consequence worth naming: the desktop build ships as the free tier by
construction. There is no store and no notification service on that platform, so
purchases and push resolve to honest no-ops rather than broken buttons.

## A trick that might be useful to someone else

Store screenshots normally need an emulator or a device. Compose can lay out and
rasterise **entirely offscreen through Skia**, so `./gradlew screenshots` renders
the real composables straight to PNG at exactly 1179×2556 — no emulator, no
device, no simulator.

Better than a mock-up, too: they come from the shipping composables, so they
physically cannot drift from the app.

## Open source

The whole thing: app, Worker, design system, and the parser.
https://github.com/chinesepowered/hack-backlogue

---

⚠️ **Live on Google Play.** Desktop build available as a release asset.
