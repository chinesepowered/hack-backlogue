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

import { getToken, client, appPath, fail } from './lib/play-api.mjs';

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
