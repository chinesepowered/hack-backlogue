// Registers Backlogue Pro in RevenueCat via the REST API v2.
//
// Sets up, idempotently:
//   - Product  backlogue_pro_monthly:monthly  against the Play Store app, as a
//     `subscription`
//   - Entitlement  pro   <- attached to that product
//   - Offering  default  with a package containing it
//
// Unlike the sibling gem-pack projects, all three are required here. The app
// reads entitlement `pro` to decide whether the pile is capped, and calls
// `awaitOfferings()` and buys the current offering's first package — so a
// missing offering is a Get Pro button that resolves to "nothing to buy", and a
// misnamed entitlement is a purchase that completes and unlocks nothing.
//
// Both ids are hardcoded in ProLimits.kt:
//   EntitlementId = "pro"      OfferingId = "default"
// If you change them there, change them here, and vice versa. There is no
// runtime error for a mismatch — just a paywall that silently never unlocks.
//
// A Play *subscription* is identified to RevenueCat as
// `subscriptionId:basePlanId`, not by the subscription id alone — the bare id
// is rejected with a 422 that spells the format out. One Play subscription with
// several base plans is therefore several RevenueCat products. One-time
// products (the gem packs in the sibling repos) do use the bare id, which is
// why this is easy to get wrong when copying a script across.
//
// Product type matters and cannot be changed after creation: RevenueCat accepts
// subscription, one_time, consumable, non_consumable and
// non_renewing_subscription. `subscription` is correct for an auto-renewing
// Play base plan. The update endpoint rejects a type change, so a product
// created wrong must be deleted and recreated.
//
// PREREQUISITE: the product must already exist on Play — RevenueCat imports it,
// it does not create it. Run scripts/play-iap-setup.mjs first.
//
// Auth: a *secret* v2 API key (sk_…). NEVER commit or ship it. The key and the
// project id are both read from the environment, falling back to
// ../_revenuecat/backlogue.env then ../_revenuecat/.env (outside the repo):
//   REVENUECAT_SECRET_KEY   sk_… from RevenueCat -> Project settings -> API keys
//   REVENUECAT_PROJECT_ID   proj… from the same page
//
// Usage: node scripts/revenuecat-setup.mjs

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLAY_PRODUCT_ID = 'backlogue_pro_monthly';
const BASE_PLAN_ID = 'monthly';
// What RevenueCat calls the product. See the note above about the format.
const STORE_IDENTIFIER = `${PLAY_PRODUCT_ID}:${BASE_PLAN_ID}`;
const ENTITLEMENT_ID = 'pro';
const OFFERING_ID = 'default';
const PACKAGE_ID = 'monthly';

/**
 * Reads a setting from the environment, else from the out-of-repo env files.
 *
 * Both values live in the same file, so they are looked up the same way — a key
 * that resolves while the project id does not is a confusing way to fail.
 */
function setting(name) {
  if (process.env[name]) return process.env[name].trim();
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const file of ['backlogue.env', '.env']) {
    const envPath = resolve(repoRoot, '..', '_revenuecat', file);
    if (existsSync(envPath)) {
      const match = readFileSync(envPath, 'utf8').match(new RegExp(`^${name}=(.+)$`, 'm'));
      if (match) return match[1].trim();
    }
  }
  return null;
}

const KEY = setting('REVENUECAT_SECRET_KEY');
if (!KEY) {
  console.error('Set REVENUECAT_SECRET_KEY or put it in ../_revenuecat/backlogue.env');
  process.exit(1);
}

const PROJECT = setting('REVENUECAT_PROJECT_ID');
if (!PROJECT) {
  console.error('Set REVENUECAT_PROJECT_ID (RevenueCat dashboard → Project settings)');
  console.error('or put it in ../_revenuecat/backlogue.env');
  process.exit(1);
}

const BASE = `https://api.revenuecat.com/v2/projects/${PROJECT}`;

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} — ${res.status} ${json?.message ?? text}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

/** POST that treats "already exists" as success, so re-runs are no-ops. */
async function ensure(label, path, body) {
  try {
    await api('POST', path, body);
    console.log(`  created ${label}`);
  } catch (err) {
    if (err.status === 409 || /already exists|duplicate/i.test(err.message)) {
      console.log(`  exists  ${label}`);
      return;
    }
    throw err;
  }
}

async function main() {
  const apps = await api('GET', '/apps');
  const play = apps.items?.find((a) => a.type === 'play_store');
  if (!play) {
    console.error('No Play Store app configured in this RevenueCat project.');
    console.error('Add one (bundle id com.chinesepowered.backlogue) in the dashboard first.');
    process.exit(1);
  }
  console.log(`Play app: ${play.id}`);

  console.log('Product:');
  await ensure(STORE_IDENTIFIER, '/products', {
    store_identifier: STORE_IDENTIFIER,
    app_id: play.id,
    type: 'subscription',
    display_name: 'Backlogue Pro',
  });

  const products = await api('GET', '/products');
  const product = products.items?.find((p) => p.store_identifier === STORE_IDENTIFIER);
  if (!product) throw new Error(`product ${STORE_IDENTIFIER} not found after creation`);

  if (product.type !== 'subscription') {
    console.error(`\nProduct exists with type "${product.type}", expected "subscription".`);
    console.error('Type cannot be patched — delete it in the dashboard and re-run.');
    process.exit(1);
  }

  console.log('Entitlement:');
  await ensure(ENTITLEMENT_ID, '/entitlements', {
    lookup_key: ENTITLEMENT_ID,
    display_name: 'Pro',
  });

  const ents = await api('GET', '/entitlements');
  const ent = ents.items?.find((e) => e.lookup_key === ENTITLEMENT_ID);

  console.log('Attach product to entitlement:');
  await ensure(
    `${STORE_IDENTIFIER} -> ${ENTITLEMENT_ID}`,
    `/entitlements/${ent.id}/actions/attach_products`,
    { product_ids: [product.id] },
  );

  console.log('Offering:');
  // `is_current` is read-only on create — passing it is a 400. The first
  // offering in a project comes back current anyway, which is what the app
  // needs, so this only has to be checked rather than set.
  await ensure(OFFERING_ID, '/offerings', {
    lookup_key: OFFERING_ID,
    display_name: 'Default',
  });

  const offerings = await api('GET', '/offerings');
  const offering = offerings.items?.find((o) => o.lookup_key === OFFERING_ID);
  if (!offering.is_current) {
    console.error(`\nOffering ${OFFERING_ID} exists but is not the current one.`);
    console.error('The app buys the current offering\'s first package, so make it current');
    console.error('in the RevenueCat dashboard — there is no v2 endpoint for it.');
    process.exit(1);
  }

  console.log('Package:');
  await ensure(PACKAGE_ID, `/offerings/${offering.id}/packages`, {
    lookup_key: PACKAGE_ID,
    display_name: 'Monthly',
  });

  const packages = await api('GET', `/offerings/${offering.id}/packages`);
  const pkg = packages.items?.find((p) => p.lookup_key === PACKAGE_ID);

  console.log('Attach product to package:');
  await ensure(
    `${STORE_IDENTIFIER} -> ${PACKAGE_ID}`,
    `/packages/${pkg.id}/actions/attach_products`,
    { products: [{ product_id: product.id, eligibility_criteria: 'all' }] },
  );

  console.log('\nDone. Copy the Play *public* SDK key (goog_…) from the dashboard into');
  console.log('local.properties as REVENUECAT_ANDROID_KEY, then rebuild.');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
