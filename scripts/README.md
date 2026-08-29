# Store automation

Dependency-free Node scripts (18+, plain `fetch`) that drive the Google Play and
RevenueCat APIs. No iOS equivalents — Backlogue does not ship on iOS, see
[setup.md](../setup.md).

> **These have never been executed.** They were written against the published API
> shapes but there is no Play app and no service account on this machine to run
> them against. Expect to fix a field name or two on the first run, and read the
> error rather than assuming the script is right. Everything else in this repo is
> verified; this directory is not.

## Order

The dependencies between these are real and each one 404s or errors unhelpfully
if run early.

| # | Step | Blocked by |
| --- | --- | --- |
| 1 | Create the app in Play Console (manual) | — |
| 2 | Upload the AAB to **Internal testing** (manual) | 1 |
| 3 | `node scripts/play-setup.mjs` — listing text | 1 |
| 4 | `node scripts/play-assets.mjs` — icon, feature graphic, screenshots | 1 |
| 5 | `node scripts/play-iap-setup.mjs` — the subscription | **2** |
| 6 | `node scripts/revenuecat-setup.mjs` — product, entitlement, offering | 5 |
| 7 | Put the `goog_` key in `local.properties`, rebuild | 6 |

**Step 2 is not optional and not obvious.** Play refuses to create in-app
products until it has seen an upload carrying `com.android.vending.BILLING`. The
bundle already has it (RevenueCat's SDK merges it in), but until something is
uploaded, step 5 fails in a way that looks like a wrong package name.

## Credentials

Nothing here reads a committed secret.

| Script | Needs | Where |
| --- | --- | --- |
| `play-*.mjs` | Google Cloud service account JSON with Play Console access | `GOOGLE_APPLICATION_CREDENTIALS`, else `../_android/play-service-account.json` |
| `revenuecat-setup.mjs` | RevenueCat **secret** v2 key (`sk_…`) + project id | `REVENUECAT_SECRET_KEY` / `REVENUECAT_PROJECT_ID`, else `../_revenuecat/backlogue.env` |

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

**`play-iap-setup.mjs`** carries a pricing lesson from the sibling repo:
`newRegionsConfig` alone prices only regions Play adds *later*, leaving the
product unpurchasable in every existing one while still showing as ACTIVE. The
script expands the USD price through `pricing:convertRegionPrices` and refuses
to write if fewer than 100 regions come back.

A subscription base plan also upserts as **DRAFT** and is not purchasable until
activated — the script does that, but if you create one by hand in the console,
remember it.

**`revenuecat-setup.mjs`** creates an entitlement and an offering, which the
sibling gem-pack projects deliberately skip. Backlogue needs both: the app gates
on entitlement `pro` and purchases the current offering's first package. A
mismatch produces no error, just a paywall that never unlocks. Both ids are
hardcoded in `ProLimits.kt`.

**`play-assets.mjs`** deletes existing images of each type before uploading,
because Play appends otherwise and eventually rejects the edit. It also checks
the icon has no alpha channel locally, since Play's rejection for that talks
about image format rather than transparency.

## Not automated

- **Data safety form** — Play only accepts it as a CSV round-trip through the
  console UI. Answers are written out in
  [docs/store/listing.md](../docs/store/listing.md#privacy).
- **App content declarations** — privacy policy URL, ads (none), target
  audience, content rating questionnaire.
- **Rollout** — promoting a build from Internal testing to Production is
  deliberately left manual.
