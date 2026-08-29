// Creates Backlogue Pro as an auto-renewing subscription on Google Play, then
// activates its base plan.
//
// This is a different API from the sibling projects' gem packs. Those are
// one-time products (monetization.onetimeproducts); a subscription is
// monetization.subscriptions, and it has an extra step people miss: a base plan
// upserts as DRAFT and is not purchasable until explicitly activated.
//
//   backlogue_pro_monthly   Backlogue Pro   $1.99/month   base plan: monthly
//
// PRICING — carried over from the sibling repo, where it was learned the
// expensive way:
//
// `newRegionsConfig` alone is NOT enough. It only prices regions Google adds to
// Play *after* the product is created; every region that already existed gets no
// price and no availability, so the product is unpurchasable almost everywhere.
// A run that set only newRegionsConfig produced a product that was ACTIVE and
// looked correct while being purchasable in exactly one country.
//
// So the USD price is expanded through `pricing:convertRegionPrices`, which
// returns a locally-appropriate price for every Play region, and those are
// written explicitly as regionalConfigs. newRegionsConfig is kept as well so
// future regions still inherit a sane price.
//
// Currency assignments move between regions versions (Bulgaria was BGN at
// 2022/02 and EUR at 2025/03), and mixing versions fails the whole write with
// INVALID_ARGUMENT — so the version is read back off the conversion response
// rather than hardcoded.
//
// PATCH with allowMissing acts as an upsert, so this is idempotent.
//
// PREREQUISITE: Play will not accept in-app products until an APK/AAB carrying
// com.android.vending.BILLING has been uploaded to some track. Upload the
// bundle to Internal testing first or every call here 404s.
//
// Usage: node scripts/play-iap-setup.mjs

import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Google Play Developer API (androidpublisher v3) plumbing.
//
// Deliberately inlined rather than shared, so this file can be copied into
// another app repo on its own. The sibling projects do the same; a script that
// needs a lib/ alongside it stops being portable across repos that share no
// package.
//
// Auth: a Google Cloud service account with access to the Play Console account.
//   1. GOOGLE_APPLICATION_CREDENTIALS (path to the JSON)
//   2. ../_android/play-service-account.json  (outside the repo, never committed)
//
// The service account must be granted access in Play Console -> Users and
// permissions AND the app record must exist. Until both are true every call
// 404s, which reads like a wrong package name and is not.
//
// Node 18+. On corporate networks: NODE_OPTIONS=--use-system-ca
// ---------------------------------------------------------------------------

const PACKAGE = 'com.chinesepowered.backlogue';

function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}

function loadCredentials() {
  const explicit = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const fallback = resolve(repoRoot(), '..', '_android', 'play-service-account.json');
  const path = explicit ?? fallback;
  if (!existsSync(path)) {
    console.error(`Service account JSON not found at ${path}`);
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS or place it at ../_android/play-service-account.json');
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

async function getToken() {
  const creds = loadCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const signature = createSign('RSA-SHA256').update(input).sign(creds.private_key);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${input}.${b64url(signature)}`,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OAuth token request failed: ${JSON.stringify(json)}`);
  return json.access_token;
}

const API_ROOT = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const appPath = (suffix = '') => `/applications/${PACKAGE}${suffix}`;

function client(token) {
  return async function api(method, path, body) {
    const res = await fetch(`${API_ROOT}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const detail = json?.error ? `${json.error.status}: ${json.error.message}` : text;
      const err = new Error(`${method} ${path} failed - ${res.status} ${detail}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  };
}

/**
 * Commits an edit, falling back to a review-less commit.
 *
 * A draft app (never published) cannot send changes for review, and the API
 * expresses that as a 400/403 rather than anything specific - so the fallback
 * is not optional on a first run.
 */
async function commitEdit(api, editId) {
  try {
    await api('POST', appPath(`/edits/${editId}:commit`));
  } catch (err) {
    if (err.status === 400 || err.status === 403) {
      await api('POST', appPath(`/edits/${editId}:commit?changesNotSentForReview=true`));
      return 'committed without review (app is still a draft)';
    }
    throw err;
  }
  return 'committed';
}

function fail(err) {
  console.error(err.message ?? err);
  process.exit(1);
}

const PRODUCT_ID = 'backlogue_pro_monthly';
const BASE_PLAN_ID = 'monthly';
const PRICE_USD = { currencyCode: 'USD', units: '1', nanos: 990000000 }; // $1.99

// Fallback only — the live value comes back from convertRegionPrices.
const REGIONS_VERSION_FALLBACK = '2025/03';

const LISTING = {
  languageCode: 'en-US',
  title: 'Backlogue Pro',            // max 55
  description: 'An unlimited pile, and alerts when a game you want gets a date.', // max 80
};

async function convertPrices(api) {
  const res = await api('POST', appPath('/pricing:convertRegionPrices'), {
    price: PRICE_USD,
  });
  const version = res?.regionVersion?.version ?? REGIONS_VERSION_FALLBACK;
  const converted = res?.convertedRegionPrices ?? {};

  const regionalConfigs = Object.entries(converted).map(([regionCode, entry]) => ({
    regionCode,
    newSubscriberAvailability: true,
    price: entry.price,
  }));

  return { version, regionalConfigs };
}

async function main() {
  const api = client(await getToken());

  console.log('Converting $1.99 into every Play region…');
  const { version, regionalConfigs } = await convertPrices(api);
  console.log(`  regions version ${version}, ${regionalConfigs.length} regions priced`);

  if (regionalConfigs.length < 100) {
    console.error(`\nOnly ${regionalConfigs.length} regions came back — expected ~170.`);
    console.error('Refusing to write a product that would be unpurchasable in most of the world.');
    process.exit(1);
  }

  const body = {
    productId: PRODUCT_ID,
    listings: [LISTING],
    basePlans: [
      {
        basePlanId: BASE_PLAN_ID,
        state: 'DRAFT',
        regionalConfigs,
        // Regions Play adds later inherit a converted price rather than nothing.
        otherRegionsConfig: {
          usdPrice: PRICE_USD,
          eurPrice: { currencyCode: 'EUR', units: '1', nanos: 990000000 },
          newSubscriberAvailability: true,
        },
        autoRenewingBasePlanType: {
          billingPeriodDuration: 'P1M',
          gracePeriodDuration: 'P7D',
          // Give a failed payment a chance to recover before revoking access.
          accountHoldDuration: 'P30D',
          resubscribeState: 'RESUBSCRIBE_STATE_ACTIVE',
        },
      },
    ],
  };

  console.log(`Upserting subscription ${PRODUCT_ID}…`);
  await api(
    'PATCH',
    appPath(
      `/subscriptions/${PRODUCT_ID}` +
        `?updateMask=listings,basePlans` +
        `&allowMissing=true` +
        `&regionsVersion.version=${encodeURIComponent(version)}`,
    ),
    body,
  );

  console.log(`Activating base plan ${BASE_PLAN_ID}…`);
  try {
    await api(
      'POST',
      appPath(`/subscriptions/${PRODUCT_ID}/basePlans/${BASE_PLAN_ID}:activate`),
      { packageName: undefined, productId: PRODUCT_ID, basePlanId: BASE_PLAN_ID },
    );
    console.log('  activated');
  } catch (err) {
    // Re-running against an already-active plan is success, not failure.
    if (/already active/i.test(err.message)) console.log('  already active');
    else throw err;
  }

  console.log('\nDone. Next: node scripts/revenuecat-setup.mjs to import it into RevenueCat.');
  console.log('Entitlement must be exactly "pro" and offering exactly "default" —');
  console.log('both are hardcoded in ProLimits, and a typo is a paywall that never unlocks.');
}

main().catch(fail);
