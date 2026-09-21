# Store listing — copy and paste

Every field both stores ask for, pre-written and within the character limits.
Counts are noted where a store enforces one.

Assets live alongside this file:

| File | Use |
| --- | --- |
| `icon-1024.png` | App Store icon, and the source for the Play one. 1024×1024, no alpha, no rounded corners. |
| `icon-512.png` | Play Store icon. 512×512 — Play rejects any other size, including 1024. Downscaled from `icon-1024.png`. |
| `feature-1024x500.png` | Play Store feature graphic (required). |
| `../screenshots/*.png` | 1179×2556, no device frame. Devpost requires ≥1 at this size. |

Regenerate the first two with `node tools/render-store-assets.mjs`, the
screenshots with `./gradlew screenshots`.

---

## Names

**App name (both stores):** `Backlogue`

**App Store subtitle** (30 char limit — this is 29):
```
Every game you meant to play
```

**Play Store short description** (80 char limit — this is 73):
```
Save games the moment you find them. Share a video in, it's in your pile.
```

---

## App Store keywords

100 characters, comma-separated, **no spaces after commas** (spaces waste
characters). This is exactly 99:

```
backlog,game,tracker,wishlist,pile,gaming,list,collection,library,shelf,played,queue,journal
```

Do not repeat the app name — Apple indexes it separately, so "backlogue" here
would be a wasted 9 characters.

---

## Full description

Works for both stores. Play renders line breaks; the App Store does too.

```
Every backlog app competes on organising games you've already saved. That's the
wrong battle — most games never make it into the list at all.

You're three minutes into a review. Something looks good. To save it, every
other app asks you to leave the video, open it, search for the game, and file
it. Almost nobody does that. That's why almost nobody's backlog is accurate.

Backlogue lives in your share sheet instead.


SAVE IT WHERE YOU FOUND IT

Share a YouTube video, a Reddit thread, or a Steam page into Backlogue and the
game lands in your pile in one tap. You never leave what you were watching.


IT REMEMBERS WHERE IT CAME FROM

Every game keeps a note of where you found it — "From a YouTube video", "From
Reddit". Six months later your list reads like a record of your own taste
instead of a chore list.


BUILT NOT TO MAKE YOU FEEL BAD

No completion percentage. No "47 unplayed games" counter. No red badges, no
overdue states. Games you started and didn't finish are Bounced, not Abandoned —
because that's what players actually say, and it puts the mismatch on the game
rather than on you.


TRACK WHAT YOU WANT TO TRACK

• Wishlist, Backlog, Playing, Beaten, Bounced
• Rate a game out of 10 when you're done with it
• Filter your pile by status
• Works offline — saving a game never waits on a network


FREE FOREVER, FOR THE PART THAT MATTERS

Saving, organising, rating and sharing up to 30 games is free and always will
be. Backlogue Pro lifts the cap and adds a nudge when a wishlisted game finally
gets a release date, or the day it lands.
```

---

## What's New (first release)

```
First release. Save games from your share sheet, keep track of what you're
playing, and stop losing the ones you meant to get to.
```

---

## Contact

**Developer contact email (both stores):** `nelson@chinesepowered.com`

Play will not publish without it. `scripts/play-setup.mjs` sets it on the Play
listing; the same address is the data-deletion contact in the privacy policy
below, and the two have to match.

---

## Category and age rating

| Field | Value |
| --- | --- |
| App Store primary category | Entertainment |
| App Store secondary | Utilities |
| Play category | Entertainment |
| Age rating | 4+ / Everyone |

**Age-rating questionnaire:** answer No to everything. There is no user-generated
content shown to other users, no ads, no gambling, no unrestricted web access.

Game summaries come from IGDB, which is third-party content — but it is
descriptive catalogue text, not user content, and it is not shared between users.

---

## Privacy

Both stores need this and both will reject a wrong answer later, so be precise.

**What Backlogue actually collects:**

| Data | Why | Linked to identity? |
| --- | --- | --- |
| OneSignal subscription id | To send release alerts for games you saved | No |
| The IGDB ids of games in your pile | Sent to the alert server so it knows what to watch | No |
| RevenueCat anonymous user id | Purchase state | No |

**What it does not collect:** name, email, contacts, location, photos, browsing
history, advertising identifiers. There is no analytics SDK and no ad SDK.

### App Store privacy answers

- **Data Used to Track You:** None
- **Data Linked to You:** None
- **Data Not Linked to You:** → *Identifiers* (Device ID — the push
  subscription), *Usage Data* (Product Interaction — your saved game ids)

### Play Data Safety answers

**Already written: `data-safety.csv` in this folder.** Play accepts this form
only as a CSV round-trip through the console, so import that file at App content
→ Data safety → Import from CSV. Regenerate with
`node scripts/fill-data-safety.mjs` only if Play rejects the schema.

Three types, all **collected, not shared**, all for *App functionality*, all
**optional** (the user can avoid every one):

- **Device or other IDs** — the OneSignal push subscription id
- **App activity → Other actions** — the IGDB ids of unfinished games in the pile
- **Financial info → Purchase history** — RevenueCat's purchase tokens and
  entitlement state

Not declared: search terms (processed transiently, never stored), diagnostics
and crash logs (no such SDK in the build), advertising ID (no `AD_ID`
permission in the merged manifest).

Also: encrypted in transit **yes**, account creation **none**, deletion requests
**yes** pointing at the privacy policy URL.

The reasoning behind each answer, plus every other App content section, is in
[store-submission.md](store-submission.md).

### Privacy policy

Both stores require a **public URL**, not a file. `web/` is **deployed**, so
this resolves now:

```
https://backlogue-app.vercel.app/privacy.html
```

It must be live before submitting. Play fetches it during review, and the same
URL is the deletion-request URL in the Data safety form, so a 404 fails twice.

The contact address in the policy (`nelson@chinesepowered.com`) has to match the
developer contact email set by `scripts/play-setup.mjs`.

---

## In-app purchase setup

Create these in App Store Connect and Play Console **before** RevenueCat can
import them.

| Field | Value |
| --- | --- |
| Product id (both stores) | `backlogue_pro_monthly` |
| Second product (optional) | `backlogue_pro_yearly` |
| Type | Auto-renewing subscription |
| Display name | Backlogue Pro |
| Description | An unlimited pile, and alerts when a game you want finally gets a date. |

Then in RevenueCat: entitlement id **`pro`** exactly, offering id **`default`**
exactly. Both are hardcoded in `ProLimits` — a typo here is a paywall that
silently never unlocks.

**Pricing suggestion:** $1.99/mo or $9.99/yr. Low enough that the free tier
feels generous rather than bait, which is the whole design argument.

---

## Screenshot captions

Optional on both stores, but they lift conversion. If you add text overlays:

1. `01-pile.png` → **"Everything you meant to play"**
2. `02-empty.png` → **"Share a video in. That's it."**
3. `03-playing.png` → **"Filter to what you're actually playing"**
4. `04-detail.png` → **"Rate it when you're done"**

---

## Before you submit

- [ ] Screenshots regenerated after any UI change (`./gradlew screenshots`)
- [ ] Icon has no alpha channel — already true of `icon-1024.png`, verify if you
      edit it, and re-cut `icon-512.png` from it
- [ ] Privacy policy URL is live and public
- [ ] A **promo code** generated for Devpost judges so they can reach Pro
- [ ] Purchase tested on a real device, not a simulator
