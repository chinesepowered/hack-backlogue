# Demo video — script and pipeline

Two minutes maximum, and the rules say **judges are not required to watch past
it**. So the running order is not "tour of the app"; it is the one thing no
competitor can film, first, and everything else earns its place after.

The narration text lives in `scripts/demo-scenes.mjs` and is the source of
truth — this file explains the shape. Edit there, describe here.

## The pipeline

```bash
node scripts/narrate.mjs        # 1. ElevenLabs -> docs/video/narration/*.mp3
node scripts/record-demo.mjs    # 2. emulator take, paced to the voice
node scripts/compose-demo.mjs   # 3. mux -> docs/video/backlogue-demo.mp4
```

**Narration is rendered first and the footage is paced to it**, not the reverse.
Writing hold times by hand and hoping the voice fits is how a demo ends up with
a sentence still playing over the next scene. Each scene holds for
`max(minMs, narrationLength + 600ms)`.

Before the first real take, calibrate once:

```bash
node scripts/record-demo.mjs --probe
```

That boots, installs, and prints every string the accessibility tree exposes.
Scene actions tap widgets **by their on-screen text**, so this is how you find
out what to write in `{tap: '...'}`. Compose's semantics do not always surface
the label you see, and a tap that misses is a wasted take.

Credentials: `ELEVENLABS_API_KEY`, or `../_elevenlabs/backlogue.env`, outside the
repo like `../_android` and `../_revenuecat`. Voice is `ELEVENLABS_VOICE` (name
or id); unset, it takes the first young-female voice the account has.
`node scripts/narrate.mjs --voices` lists them.

## Why an emulator rather than rendering it

Compose rasterises the real composables offscreen through Skia — that is how the
store screenshots are made, with no device at all. It **cannot draw Android's
share sheet**, which belongs to another process. The share sheet is the first
fifteen seconds and the whole pitch, so it has to be real.

The share is triggered with a bare `ACTION_SEND` intent and no component, so
Android shows its **own chooser** with Backlogue in it. That is a genuine system
share sheet, not a recreation.

## Scene 6 shows the product, not a transaction

The paywall and the Pro state are the shot: the thirty-game free tier, the
argument for where the paywall is *not*, and the paywall's own design. That is
what the HAMM and Design categories are looking at, and it is the strongest
thirty seconds monetization gets.

A store sheet would be the least interesting thing that could be on screen, and
this emulator image is `google_apis` rather than `google_apis_playstore`, so
Play billing could not run here in any case.

Verifying a real purchase on real hardware is a separate pre-submission step —
see the checklist in `docs/devpost-additional.md`. Do it before submitting, and
then every claim in the entry is one you have watched work.

## The running order

| # | Scene | Starts | Narration | On screen |
| --- | --- | --- | --- | --- |
| 1 | The gesture | 0:00 | 15.0s | Chrome on a YouTube watch page → system share sheet → Backlogue → the game lands |
| 2 | It landed | 0:15 | 8.3s | The pile, new game at top, provenance line under it |
| 3 | The parser | 0:25 | 19.0s | The messy shared title, and what it became |
| 4 | Against its genre | 0:45 | 16.7s | Scroll the pile, filter chips, a Bounced game |
| 5 | Alerts | 1:02 | 13.9s | A wishlisted game with no date, then a notification arrives |
| 6 | Pro | 1:16 | 16.1s | Settings → paywall → the unlocked Pro state |
| 7 | One codebase | 1:33 | 9.4s | Desktop build, same screens |
| 8 | Close | 1:44 | 3.0s | The pile, wordmark |

Rendered narration totals **101.4s**, so the take runs about **111s** —
comfortably under the two-minute cap, with roughly 9s of headroom.
Scene 3 is the longest line at 19.0s; trim it first if anything needs to go.

`compose-demo.mjs` warns if the finished file runs over, and `narrate.mjs` warns
if the narration alone passes 1:55.

Scene 7's desktop footage is captured separately (`./gradlew :composeApp:run`
plus any screen recorder) and cut in by hand. It is the only shot the emulator
cannot produce, and it is fifteen seconds.

## The narration

Written to be *spoken*: short sentences, no stacked em-dashes, no parentheticals.
The prose in `docs/devpost.md` is good writing and bad voiceover.

> **1.** You're three minutes into a review, and something looks good. Every
> other backlog app wants you to leave the video, open the app, and search for
> the game. So almost nobody does. Backlogue is just a share target.
>
> **2.** One tap, and it's saved, without leaving what you were watching. And it
> remembers where you found it. From a YouTube video.
>
> **3.** That share was titled "Silksong is finally here, first three hours,
> IGN". The hard part of this app is a text parser that strips the hype and
> keeps the title. When it is not sure, it says so and opens a search box
> instead of guessing.
>
> **4.** A backlog is guilt made visible. So there is no completion percentage
> here. No unplayed counter. No red badges. And a game you did not click with is
> not Abandoned, it is Bounced. That puts the mismatch on the game, not on you.
>
> **5.** For the games with no date yet, a Cloudflare Worker watches the
> catalogue and pushes through OneSignal. But only when something actually
> changed. A date appeared. A date moved. Or it is out.
>
> **6.** Saving, organising and rating thirty games is free, forever. Pro lifts
> the cap and turns on those alerts. The paywall never appears during a capture,
> because interrupting those two seconds would break the only thing this app is
> for.
>
> **7.** It is one Kotlin codebase. Android and desktop render the same Compose
> Multiplatform screens, and the shared code links for iOS too.
>
> **8.** Backlogue. Every game you meant to play.

About 250 words. At a normal narration pace that is roughly 1:40 of speech.

**Listen for "IGN" in scene 3.** Text-to-speech reads three-letter strings as
either letters or a word depending on the model, and "ig-nn" would be a bad
fifteenth second. If it comes out wrong, write it as `I.G.N.` in
`demo-scenes.mjs` and re-render that one scene:

```bash
node scripts/narrate.mjs 03-parser
```

## Music

Off unless `docs/video/music.mp3` exists. The rules are explicit that the video
"must not include third-party trademarks or copyrighted music/material unless
you have permission to use it" — so anything put there has to be licensed or
original. Narration alone is fine and is the safer default.

## Upload

YouTube or Vimeo, **publicly playable**. Unlisted is acceptable as long as the
link plays without a login; private is not. Then paste the URL into the Devpost
draft — see `docs/devpost-submission.md`.
