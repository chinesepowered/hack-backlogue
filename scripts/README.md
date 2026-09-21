# Store automation

Dependency-free Node scripts (18+, plain `fetch`) that drive the Google Play and
RevenueCat APIs. No iOS equivalents — Backlogue does not ship on iOS, see
[setup.md](../setup.md).

> **Run status.** All four have now been run against the live
> `com.chinesepowered.backlogue` app and work. Three things needed fixing on
> that first run, and are fixed here: the Play listing icon is 512×512 and not
> 1024, RevenueCat identifies a Play subscription as `subscriptionId:basePlanId`
> and not by the subscription id alone, and `is_current` is read-only when
> creating an offering. `fill-data-safety.mjs` has been exercised against a
> real Play export schema, and its output is checked in at
> `docs/store/data-safety.csv`, ready to import.

## Order

The dependencies between these are real and each one 404s or errors unhelpfully
if run early.

| # | Step | Blocked by |
| --- | --- | --- |
| 1 | Create the app in Play Console (manual) | — |
| 2 | Upload the AAB to **Internal testing** (manual) | 1 |
| 3 | `node scripts/play-setup.mjs` — listing text + contact email | 1 |
| 4 | `node scripts/play-assets.mjs` — icon, feature graphic, screenshots | 1 |
| 5 | `node scripts/fill-data-safety.mjs` — Data safety CSV | 1 |
| 6 | `node scripts/play-iap-setup.mjs` — the subscription | **2** |
| 7 | `node scripts/revenuecat-setup.mjs` — product, entitlement, offering | 6 |
| 8 | Put the `goog_` key in `local.properties`, rebuild | 7 |

**Step 2 is not optional and not obvious.** Play refuses to create in-app
products until it has seen an upload carrying `com.android.vending.BILLING`. The
bundle already has it (RevenueCat's SDK merges it in), but until something is
uploaded, step 6 fails in a way that looks like a wrong package name.

## Credentials

Nothing here reads a committed secret.

| Script | Needs | Where |
| --- | --- | --- |
| `play-*.mjs` | Google Cloud service account JSON with Play Console access | `GOOGLE_APPLICATION_CREDENTIALS`, else `../_android/play-service-account.json` |
| `revenuecat-setup.mjs` | RevenueCat **secret** v2 key (`sk_…`) + project id | `REVENUECAT_SECRET_KEY` / `REVENUECAT_PROJECT_ID`, else `../_revenuecat/backlogue.env` |
| `fill-data-safety.mjs` | nothing — it only rewrites a CSV | — |

On the machine these were last run from, the Play service account is the one the
sibling projects share, at `../_android/revenuecat-key.json` rather than the
default filename — so every Play call needs the env var:

```
GOOGLE_APPLICATION_CREDENTIALS=../_android/revenuecat-key.json node scripts/play-setup.mjs
```

The `../_android` and `../_revenuecat` fallbacks sit outside the repo on
purpose, matching the sibling projects. A secret key is not the same thing as
the `goog_` public SDK key that ships in the app — the secret one can create and
delete products and must never reach a binary.

For the service account: Google Cloud console → new service account → grant it
the Android Publisher role, then invite it in Play Console → Users and
permissions. It stays 404 until *both* halves are done.

On a corporate network, `NODE_OPTIONS=--use-system-ca` if TLS fails.

## Why each script repeats the auth block

Every `play-*.mjs` carries its own copy of the service-account JWT signing and
the `api()` wrapper — about sixty duplicated lines each. That is deliberate, and
it matches the sibling projects.

These scripts get copied between app repos that share no package: `play-setup.mjs`
in the Secret Fantasy repo says outright *"when IAP lands, copy the subscription
setup from mobile-aidetect"*. A script that needs a `lib/` next to it stops being
copyable. Deduplicating costs the one property these files are actually
optimised for.

The tradeoff is real though: a fix to the auth block has to be applied four
times here, and copies in other repos will drift. Given how rarely that code
changes, and how often these get copied, portability wins.

## Notes worth reading before running

**`play-assets.mjs`** deletes existing images of each type before uploading,
because Play appends otherwise and eventually rejects the edit. It also checks
the icon has no alpha channel locally, since Play's rejection for that talks
about image format rather than transparency.

The listing icon is **512×512** and Play rejects anything else — the 1024 the
App Store wants comes back as `Invalid dimensions - expected width: [512]`. So
`docs/store/icon-512.png` is a downscale of `icon-1024.png`, which stays the
source. Re-cut it if you change the icon.

**`fill-data-safety.mjs`** does not talk to Play — the form has no API and only
round-trips as a CSV. Export from Play Console → App content → Data safety →
Export to CSV, run the script on it, import the result back. Always start from a
fresh export; Google renames the schema, and the script prints anything it did
not recognise instead of guessing an answer.

**`play-iap-setup.mjs`** carries a pricing lesson from the sibling repo:
`newRegionsConfig` alone prices only regions Play adds *later*, leaving the
product unpurchasable in every existing one while still showing as ACTIVE. The
script expands the USD price through `pricing:convertRegionPrices` and refuses
to write if fewer than 100 regions come back. On the live run that came back as
173 regions.

A subscription base plan also upserts as **DRAFT** and is not purchasable until
activated — the script does that, but if you create one by hand in the console,
remember it.

**`revenuecat-setup.mjs`** creates an entitlement and an offering, which the
sibling gem-pack projects deliberately skip. Backlogue needs both: the app gates
on entitlement `pro` and purchases the current offering's first package. A
mismatch produces no error, just a paywall that never unlocks. Both ids are
hardcoded in `ProLimits.kt`.

Two API shapes bite when copying this from a gem-pack repo. A Play subscription
is `subscriptionId:basePlanId` to RevenueCat — `backlogue_pro_monthly:monthly`,
not `backlogue_pro_monthly` — while a one-time product uses the bare id. And
`is_current` cannot be passed when creating an offering; the first offering in a
project is current already, so the script checks it rather than setting it.

## Not automated

- **App content declarations** — every section is answered, with reasoning, in
  [../docs/store/store-submission.md](../docs/store/store-submission.md):
  privacy policy URL, ads (none), advertising ID (none), target
  audience, content rating questionnaire.
- **Rollout** — promoting a build from Internal testing to Production is
  deliberately left manual.
