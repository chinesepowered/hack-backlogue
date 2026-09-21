# Devpost submission — the form, field by field

The draft exists. This maps every field on the RevenueCat Shipaton 2026
submission form to its answer, so finishing it is mechanical.

| | |
| --- | --- |
| Project | https://devpost.com/software/backlogue |
| Project id | `1437666` |
| Submission id | `1191707` |
| Status | **Submitted** 2026-09-21 18:27 EDT — editable until the deadline |
| Devpost account | Nelson Lai · `clai74@mail.ccsf.edu` (id 8820504) |
| Hackathon | `revenuecat-shipaton-2026` |
| Submissions close | **2026-10-01 06:45 UTC** = Sep 30, 11:45pm PDT |
| Winners announced | 2026-10-21 |

Already filled by MCP: name, tagline, description, Built With, links, and the
**demo video**.

| | |
| --- | --- |
| Video | https://www.youtube.com/watch?v=3Wbm6W8L_PI (public) |
| Site | https://backlogue-app.vercel.app/ |

YouTube classified the upload as a **Short** — it is vertical and under three
minutes, which is the rule. `youtube.com/shorts/3Wbm6W8L_PI` and
`youtube.com/watch?v=3Wbm6W8L_PI` are the same video; the watch form is the one
given to Devpost because it is what oembed returns an embeddable player for.

---

## The Next Gen path is a genuine safety net

Straight from the submission requirements, verbatim:

> **Students competing for the Next Gen Award** follow a different,
> lower-friction path: submit a video and source code instead of a published
> store listing. No paid Apple or Google developer account required.

That is worth understanding precisely, because our own docs had assumed Next Gen
was just "the other categories, plus a repo link":

- **Next Gen needs: video + public repo + student email.** Nothing else.
- **Every other category needs the app fully published** to App Store, Play, or
  Galaxy by the deadline.

So if Play review does not clear in time, the submission is still live and still
competing — for Next Gen only. That converts "we miss the whole hackathon" into
"we miss six of seven categories", which is a much better worst case than the one
`SUBMISSION.md` was written against.

It does not reduce the urgency of publishing. It removes the cliff.

---

## Required fields

| Id | Field | Answer |
| --- | --- | --- |
| 27378 | Includes App Icon | ✅ — attach `docs/store/icon-1024.png` |
| 27379 | Includes screenshot | ✅ — attach from `docs/screenshots/` |
| 27382 | What type of app did you build? | **Android** only |
| 28118 | RevenueCat project ID | `projb3ae91a4` |

On 27382: the options are iOS / Android / Mac. There is no Windows or Linux
desktop option, so the JVM desktop build cannot be declared here. Say it in the
Ship Kotlin Everywhere answer and the judges' notes instead.

Icon and screenshot are **file uploads and cannot be done over MCP** — they
attach on the web form. The checkboxes above only assert that you did.

## Optional but ours

| Id | Field | Answer |
| --- | --- | --- |
| 27380 | First version released Aug 1 – Sep 30 2026? | ✅ once Play publishes |
| 27381 | Employee of RevenueCat or a sponsor? | ☐ No |
| 27384 | Google Play URL | ⚠️ `https://play.google.com/store/apps/details?id=com.chinesepowered.backlogue` — only once live |
| 27793 | (Next Gen) repo URL | `https://github.com/chinesepowered/hack-backlogue` |
| 27792 | (Next Gen) student email | `clai74@mail.ccsf.edu` |
| 28375 | Minor entrant consent | ✅ — true via the "does not include a Minor Entrant" branch |
| 28135 | Promo code | ⚠️ generate once the subscription is live |
| 27791 | Opt in to the Growth Fund | ☐ No |

## Long-form answers — all drafted in `devpost-additional.md`

| Id | Award | Section to paste from |
| --- | --- | --- |
| 28121 | Ship Kotlin Everywhere | *Ship Kotlin Everywhere (JetBrains)* |
| 28129 | Keep Them Coming Back | *Keep Them Coming Back (OneSignal)* |
| 28128 | OneSignal App ID | `5c4fb51b-9266-4ba7-90e7-2c381417c858` |
| 27943 | Influencer category | **Gaming — Mr Lewis Blogs Gaming** |
| 27944 | Influencer description | *Influencer Award — Mr Lewis Blogs Gaming* |
| 27391 | Design Award | *RevenueCat Design Award* |
| 27388 | HAMM | *HAMM Award* |
| 27390 | Build in Public — how it helped | *#BuildInPublic* |
| 28119 | Build in Public — links | ⚠️ thread URL still missing |
| 27387 | Grand Prize — growth since launch | *Grand Prize* |
| 27392 | Notes for the judges | *Additional notes for the judges* |

**One wording conflict to handle in 28121.** The field's own prompt says
"Explain what is shared across **iOS and Android**." Our entry is Android +
desktop. The honest framing, which the drafted answer already takes: the shared
Kotlin compiles and links for iOS (CI on a macOS runner produces
`ComposeApp.framework`, RevenueCat included), Android and desktop ship from the
same composables, and what is missing is Xcode packaging — not shared code.
Lead with where the seams were drawn, since JetBrains state judges "reward
effective cross-platform development, not platform count alone."

## Deliberately blank

| Id | Award | Why |
| --- | --- | --- |
| 27383 | App Store URL | No iOS release |
| 28117 | Galaxy Store URL | No Galaxy build |
| 27389 | Peace Prize | Anti-guilt design is real but not in the same category as accessibility or mental-health entries |
| 27795 | Catvertising | No ads at all |
| 27794 | Best Game | A tool for gamers, not a game |
| 28125 | Best App for Galaxy | No Galaxy build |
| 28123-4 | Most Viral (Noise) | Not used |
| 28126-7 | Idea to Income (Replit) | Not used |
| 28130 | Growth Loop (Layers) | Not used |
| 28132-4 | Funnel Vision (Stripe) | Not used |

A blank field is how you opt out of a category, so these blanks are deliberate
rather than unfinished.

---

## Submitted — and what still has to change

The entry is in. Devpost allows re-submitting to update it until the deadline,
so the remaining items are edits, not blockers.

**1. Make `hack-backlogue` public.** ⚠️ It is private right now, and Next Gen is
judged on the source. The repo URL is already in the entry (field 27793) and in
the project links, so today it 404s for a judge. History was scanned before
submitting: 389 blobs, no `sk_`/`os_v2_app_`/`AIza`/`ghp_` keys, no private key
blocks, and no keystore, `local.properties`, `.env` or service-account file was
ever tracked. The only committed credentials are the RevenueCat `goog_` public
SDK key and the OneSignal App ID, both of which are client-side by design.

**Leave `hack-ship` private.** It still holds the pre-rewrite history.

**2. Play Store URL** (field 27384) and **first-release confirmation**
(field 27380). Both were left blank because the app is on internal testing, not
production — ticking 27380 today would be a false statement. Fill both in after
the rollout, then re-submit.

**3. Promo code** (field 28135) — needs the subscription live.

**4. Build-in-public links** (field 28119) — needs a public post to link.

Only item 1 affects Next Gen. Items 2-4 affect the other six categories.
