# Build in Public — Snag

Posts for the #BuildInPublic award (1st $30k / 2nd $20k / 3rd $10k — the largest
pool after the Grand Prize).

---

## Read this before posting anything

**What the award actually rewards.** The brief asks for "the most interesting
development journey" with "compelling lessons learned or clever ideas that came
from engaging with the community." Two consequences:

1. **A launch announcement is not a journey.** Judges are reading a body of
   work across two months. Consistency beats any single post.
2. **Engagement is scored, not just broadcast.** The forum-research posts below
   are not marketing — they are the part of the entry that most entrants skip.
   Real questions, real answers, real changes to the product because of them.

**The rule that protects you:** never post that something works before you have
watched it work. This project has already produced a green build in which the
paywall button did nothing, alerts registered nowhere, and an API method was
dead code. A "just shipped alerts 🎉" post that turns out to be false is worse
than silence, and screenshots of a simulator are not proof.

**Placeholders.** Anything in `[SQUARE BRACKETS]` is yours to fill. Do not post
a number you have not measured.

**Cadence.** 3–4 posts a week beats daily filler. Aim for: one build detail,
one design decision, one community interaction per week, plus milestones.

**Threading.** Number the main thread (`Snag devlog #1`, `#2`, …) so a judge can
follow it in order. That single habit makes a scattered feed legible.

---

## Platform notes — read the rules before you post

| Platform | Reality |
| --- | --- |
| **r/patientgamers** | Your single best audience — the subreddit is *literally* people with backlogs. Also strict: no self-promotion. Only post genuine discussion, never a link to the app. |
| **r/Games** | Bans self-promotion outright. Do not post the app. Read-only for research. |
| **r/gamingsuggestions** | More permissive, but it's a request sub — you'd be off-topic. Skip. |
| **r/backlog, r/gamecollecting** | Small, on-topic, friendly to tools. Good for the research posts. |
| **r/androiddev, r/Kotlin** | Receptive to technical devlogs, hostile to marketing. Lead with the technical finding, mention the app once at the end. |
| **Kotlin Slack (#multiplatform)** | The KMP findings below are genuinely useful there. This also feeds the JetBrains award — "contributions to the KMP community" is explicitly in its criteria. |
| **Hacker News** | Save for Show HN at launch. One shot, don't waste it early. |
| **Bluesky / X** | Your main devlog home. Bluesky's gaming community is unusually responsive to indie tools. |
| **Discord** | Any gaming server you're *already* a member of. Dropping into a new server to promote reads as spam and usually is. |

**Always disclose** that you're building the thing when asking for input. "I'm
building a backlog app and I'm stuck on X" is welcome almost everywhere.
Pretending to be a neutral researcher and revealing the app later is the one
move that will get you flamed.

---

# Part 1 — Community research posts

These come **first**, before you have much to show. They're research, and the
answers should visibly change the product. When one does, post about the change
and credit the thread — that loop is the award.

### R1. r/patientgamers — the core question

> **Title:** How do you actually track your backlog? (and does tracking it make it worse?)
>
> I've been keeping a list of games I want to play for about [N] years, in
> [Notion / a Steam wishlist / my head], and I've realised the list itself has
> started to feel like a chore. Opening it feels like opening a to-do list I'm
> behind on.
>
> Curious how this sub handles it, because you're the people most likely to have
> thought about it:
>
> 1. Where does a game actually go when you first hear about it? Wishlist, a
>    note, a screenshot, nowhere?
> 2. Do you track what you've finished, or only what's pending?
> 3. Has any tracker ever made your backlog feel *better* rather than more
>    accusing?
>
> I ask partly because I'm building a small app around this and I keep coming
> back to the same problem: every design I try starts to look like homework.

*Why this works: it opens with a real problem, asks a question the sub loves, and
discloses the app in the last line without linking it.*

### R2. r/patientgamers or r/backlog — the naming question

> **Title:** What do you call the games you started and didn't finish?
>
> Not "dropped" exactly — I mean the ones where you gave it four hours and it
> just wasn't for you. No hard feelings, no intention to return.
>
> Most trackers call this "Abandoned" or "Dropped" and both of those land like
> an accusation. The phrase I hear most from actual players is "I bounced off
> it," which puts the mismatch on the game rather than on you.
>
> Is "Bounced" what you'd want to see, or does it read as too cute? Genuinely
> torn, and it's a one-word decision I'll be stuck with.

*This one is real — it's a decision already made in the code, and it's the kind
of small, human question forums answer enthusiastically.*

### R3. r/patientgamers — the moment of discovery

> **Title:** Where were you when you last added a game to your wishlist?
>
> Oddly specific question, but: think about the last game you added to a
> wishlist or a list somewhere. What were you doing right before?
>
> My bet is most of you were watching a video, reading a thread, or someone
> mentioned it in a Discord — and that the actual "go to the store page and
> wishlist it" step happened later, if at all.
>
> If that's right, then most of us are losing games between hearing about them
> and saving them. I'm trying to find out how big that gap really is.

### R4. r/androiddev — technical, with a genuine question

> **Title:** Share-sheet target that has to guess a game name from a YouTube title — how paranoid should the parsing be?
>
> Building a share target: you're watching a game video, hit Share, and the game
> lands in your list without you typing anything.
>
> The hard part isn't the Activity, it's that a YouTube share arrives as
> `"🔥 SILKSONG IS FINALLY HERE - First 3 Hours | IGN"` plus a URL, and I need a
> search query out of that. Steam is easy — the slug is right there in
> `/app/1030300/Hollow_Knight_Silksong/`. Video titles are a mess.
>
> Current approach: strip bracketed tags, strip a known list of noise phrases
> ("official trailer", "review", "first impressions"…), drop shouted hype words,
> and only cut a trailing `| Channel` when the tail matches a known outlet — so
> "Dark Souls | Remastered" survives.
>
> My question: I bias hard toward *under*-cleaning, on the theory that the search
> backend tolerates extra words better than a butchered title. Is that the right
> instinct, or have people found the opposite?

### R5. Kotlin Slack `#multiplatform` — genuinely useful, not promotional

> Ran into something worth flagging for anyone on Compose Multiplatform 1.11:
> `components-resources` no longer publishes for `iosX64`, so if your project
> still lists the Intel simulator target, dependency resolution fails with a
> "doesn't target all platforms" error that doesn't obviously point at the
> Intel simulator as the cause.
>
> Dropping `iosX64` and keeping `iosArm64` + `iosSimulatorArm64` fixes it, and
> costs nothing unless you're supporting Intel Macs.
>
> Also: `compose.material3` on CMP does **not** bring in icons-core the way the
> Android artifact does — `materialIconsExtended` is the only source of `Icons`,
> and it's pinned upstream at 1.7.3. Worth knowing before you plan to drop it
> for APK size.

*This is the post that also serves the JetBrains award, whose criteria mention
contributions to the KMP community.*

---

# Part 2 — The devlog thread

Post in order. Each is written to stand alone if a judge lands on it cold.

### D1. Opening — the thesis

> Snag devlog #1
>
> Building a gaming backlog app for #Shipaton2026, and starting from an
> uncomfortable premise: **a backlog tracker is guilt made visible.**
>
> Every "pile of shame" joke is a user telling you their tracker made them feel
> bad. So I'm designing against the genre's own instincts — no completion
> percentage, no "47 unplayed games" counter, no red badges, no overdue states.
>
> If it reads like a to-do list, I've failed.
>
> Building in public for the next [N] weeks. #BuildInPublic #KotlinMultiplatform

### D2. The actual insight

> Snag devlog #2
>
> Every backlog app competes on organising games. I think that's the wrong
> battle — the games never make it into the list in the first place.
>
> You're three minutes into a review, something looks good, and the app asks you
> to leave the video, open it, search, and file it. Nobody does that. That's why
> nobody's backlog is accurate.
>
> So Snag lives in the share sheet. Share the video into it and the game is
> saved before the video finishes buffering.
>
> The whole product is that one gesture. Everything else is bookkeeping.

### D3. The provenance feature

> Snag devlog #3
>
> Shipped a feature that costs one database column and might be the whole app:
> every game remembers **where you found it**.
>
> "Hollow Knight: Silksong — snagged from a YouTube video, March 4."
>
> Six months later that reads like a record of your own taste. The same row
> without it reads like homework. One column.
>
> [SCREENSHOT: 01-pile.png]

### D4. The naming decision — credit the community

> Snag devlog #4
>
> Asked r/patientgamers what they call games they started and didn't finish.
> Overwhelming answer: *"I bounced off it."*
>
> So the status is **Bounced**, not "Abandoned" or "Dropped". Those two words
> frame a completely reasonable decision as a personal failure. "Bounced" puts
> the mismatch on the game.
>
> Small word. Changes how the whole screen feels.
>
> [LINK TO THE THREAD]

*Only post this once you've actually run R2 and the answers support it. If they
don't, post that instead — "I was wrong about this" is better content.*

### D5. The KMP finding

> Snag devlog #5
>
> Compose Multiplatform gotcha that cost me an hour, for the next person:
>
> CMP 1.11 stopped publishing `components-resources` for `iosX64`. If your
> project still targets the Intel simulator, resolution fails with an error that
> never mentions the Intel simulator.
>
> Drop `iosX64`, keep `iosArm64` + `iosSimulatorArm64`. Every Mac that matters
> is Apple Silicon now.
>
> #KotlinMultiplatform

### D6. The screenshot trick — the cleverest thing in the build

> Snag devlog #6
>
> Needed App Store screenshots. No Mac free, no KVM on my build box, so no
> emulator and no simulator.
>
> Turns out Compose can lay out and rasterise **entirely offscreen** through
> Skia. So `./gradlew screenshots` renders the real composables straight to PNG
> at exactly 1179×2556 — no device, no emulator, no device frame.
>
> Better than a mock-up too: these come from the shipping composables, so they
> physically cannot drift from the app.
>
> [SCREENSHOT: 01-pile.png + 04-detail.png side by side]

### D7. The best lesson in the whole build

> Snag devlog #7
>
> Today I audited my own project and found three features that compiled
> perfectly and did absolutely nothing:
>
> → The paywall's "Get Pro" button only closed the sheet. No purchase call.
> → Push notifications existed entirely server-side. The app had no SDK, never
>    registered, never could receive one.
> → The API method for registering alerts was dead code. Nothing called it.
>
> Green build. Passing tests. Three dead features.
>
> **Lesson: a compiler cannot check integrations.** Every one of these was two
> correct halves that were never joined. I now keep a list of "wired on one
> side only" and check it by hand.

*This is your strongest post. It's specific, it's a real mistake, and the lesson
generalises — which is exactly what the brief asks for.*

### D8. The monetization decision

> Snag devlog #8
>
> Free tier is 30 games. I picked that number from what real backlogs look
> like, not from what converts.
>
> The temptation is to cap at 5 and gate the core loop. But the whole product
> thesis is that managing a backlog should feel enjoyable, and a paywall in the
> middle of saving a game contradicts that in the most direct way possible.
>
> So snagging, organising, rating and sharing are free forever. Pro sells the
> things that only matter once you already care — an uncapped pile, and alerts
> when a wishlisted game finally gets a date.
>
> Might be leaving money on the table. Pretty sure it's the right call.

### D9. A bug worth showing

> Snag devlog #9
>
> Nice little self-inflicted bug: my filter chips derived their counts from the
> already-filtered list.
>
> So the moment you filtered to "Playing", every other status counted zero, the
> row hid those chips, and the only way back was the All button.
>
> Counts have to outlive the filter that's reading them. Obvious in hindsight;
> invisible in code review because both halves looked right.

### D10. Design, for the design award

> Snag devlog #10
>
> The palette question for a backlog app: how do you visualise something most
> people feel bad about?
>
> Answer I landed on — build it like a gallery, not a ledger. Near-black so the
> cover art carries the screen. No red anywhere. The only urgent colour in the
> entire system is the accent, and it's reserved for the one genuinely happy
> action: snagging something new.
>
> [SCREENSHOT: 03-playing.png]

### D11. Honest progress post

> Snag devlog #11
>
> Status, honestly:
>
> ✅ Android app building and running
> ✅ Share-sheet capture working end to end
> ✅ Backend deployed, alerts firing
> ⚠️ iOS compiles but [STATUS]
> ❌ [WHATEVER IS ACTUALLY BROKEN TODAY]
>
> [N] days to the deadline. The iOS half is the risk — shared Kotlin is written,
> but writing it and compiling it are different sports.

*Judges notice honesty. A feed of nothing but wins reads as marketing.*

---

# Part 3 — Launch

### L1. Ship post

> Snag is live. 🎣
>
> A gaming bucket list built around the moment you *discover* a game, not the
> moment you get around to filing it.
>
> Share a YouTube video, a Reddit thread, or a Steam page into Snag and the game
> is in your pile in one tap — remembering where you found it.
>
> iOS: [LINK]
> Android: [LINK]
>
> Built with Kotlin Multiplatform for #Shipaton2026. [N] weeks, [N] devlogs, one
> genuinely embarrassing bug. 🧵 of what I learned ↓

### L2. Show HN

> **Title:** Show HN: Snag – A gaming backlog app that lives in your share sheet
>
> Every backlog tracker competes on organising games. I think the real failure
> is earlier: games never make it into the list, because saving one means
> leaving the video you're watching, opening an app, and searching.
>
> Snag is an Android/iOS share target. Share a video, thread, or store page into
> it and the game is saved — the interesting part being the parser that turns
> `"🔥 SILKSONG IS FINALLY HERE | IGN"` into a usable search query. Steam URLs
> resolve exactly from the slug; video titles get de-noised with a bias toward
> under-cleaning.
>
> Built with Compose Multiplatform (one shared UI, both platforms). Source is
> open: [REPO LINK]
>
> Happy to talk about the KMP experience — including the bit where I rendered
> App Store screenshots offscreen through Skia because I had no emulator
> available.

### L3. r/patientgamers follow-up — close the loop

> **Title:** Following up: I asked this sub how you track your backlog, and then built the thing
>
> A few weeks ago I asked how people here actually track backlogs, and whether
> tracking makes it worse. The answers changed three things:
>
> 1. **"Bounced" instead of "Abandoned."** Multiple people used that exact word.
> 2. **No completion percentage.** Several of you said progress bars are what
>    make a backlog feel like a debt. There isn't one anywhere in the app.
> 3. **[THIRD THING THEY ACTUALLY TOLD YOU]**
>
> Not going to link it here since that's against the rules — but thank you, the
> input genuinely changed the design.

*Check the current rules before posting. If linking is allowed with a flair, use
it; if not, the post still works without a link and reads far better for it.*

---

# Part 4 — Reusable pieces

**Bio / pinned:**
> Building Snag — a gaming bucket list that lives in your share sheet. Kotlin
> Multiplatform, iOS + Android. Building in public for #Shipaton2026.

**Hashtags:** `#BuildInPublic #Shipaton2026 #KotlinMultiplatform #ComposeMultiplatform #IndieDev #GameDev`
Two or three per post. Six reads as spam.

**The one-liner:** *Snag it now, play it later.*

**The pitch, three lengths:**
- **7 words:** A gaming bucket list for the share sheet.
- **1 sentence:** Snag saves games at the moment you discover them — share a video or thread into it and the game lands in your pile in one tap, remembering where you found it.
- **1 paragraph:** Every backlog app competes on organising games, but the real failure happens earlier: saving a game means leaving the video you're watching, opening an app, and searching for it. Almost nobody does that, which is why almost nobody's backlog is accurate. Snag lives in the share sheet instead, and records where each game came from — so the list reads like a record of your taste instead of a chore list.

---

## Tracking

Keep a running list of what you post, where, and what came back. The submission
asks you to demonstrate a journey, and reconstructing two months of posts from
memory on September 29th is miserable.

| Date | Platform | Post | Link | Response |
| --- | --- | --- | --- | --- |
| | | | | |
