// Fills the Play Console Data safety CSV with Backlogue's answers.
//
// Play accepts this form only as a CSV round-trip through the console UI —
// there is no API for it — so this script never talks to Play. It rewrites an
// export:
//
//   1. Play Console -> App content -> Data safety -> Export to CSV
//   2. node scripts/fill-data-safety.mjs <exported.csv> docs/store/data-safety.csv
//   3. Import the output on the same page, review every answer, save.
//
// A pre-filled docs/store/data-safety.csv is already checked in, generated from
// docs/store/data-safety-template.csv (a real export with every answer blanked).
// Import that one directly if you'd rather not re-run anything. Re-run the
// script against a fresh export only if Play's importer complains — Google
// renames response ids without notice, and the checked-in schema is from
// September 2026.
//
// Nothing is guessed. Where a response id is not recognised the row is left
// blank and named in the report at the end, so a renamed question shows up as a
// gap rather than as a confidently wrong TRUE.
//
// ---------------------------------------------------------------------------
// What Backlogue declares, and why. The reasoning is in
// docs/store/store-submission.md; keep the two in step.
//
//   Device or other IDs      The OneSignal push subscription id. Sent to the
//                            alert Worker so a release alert can reach this
//                            device, and persisted there until the device
//                            re-registers with an empty list.
//
//   App activity ->          The IGDB ids of the unfinished games in the pile,
//   Other actions            sent to the same Worker so it knows which releases
//                            to watch. Persisted for the same reason.
//
//   Financial info ->        RevenueCat holds purchase tokens and entitlement
//   Purchase history         state. The app never sends this itself, but Play
//                            counts a service provider's collection as ours.
//
// Three things deliberately NOT declared:
//
//   Search terms             Play does not count data that is processed
//                            transiently — in memory, kept no longer than the
//                            request needs. The Worker forwards a query to IGDB
//                            and returns the result without writing it down.
//
//   Diagnostics / crash logs There is no crash or analytics SDK in the build.
//                            Verified against the merged release manifest: no
//                            AppMeasurement, no Crashlytics.
//
//   Advertising ID           Not requested. The merged release manifest has no
//                            com.google.android.gms.permission.AD_ID, so this
//                            is also the answer to the separate Advertising ID
//                            declaration under App content.
//
// Everything else is a No: no account system, no ads, no location, no contacts.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const src = process.argv[2] ?? 'docs/store/data-safety-template.csv';
const out = process.argv[3] ?? 'docs/store/data-safety.csv';

if (!existsSync(src)) {
  console.error(`No CSV at ${src}`);
  console.error('Export one first: Play Console -> App content -> Data safety -> Export to CSV');
  process.exit(1);
}

// Where users can ask for server-side deletion. Play requires a URL here, not
// an address, so it points at the privacy policy — which carries the contact.
// This page must be live before review; a 404 here is an instant rejection.
const DELETION_URL = 'https://backlogue-app.vercel.app/privacy.html';

const APP_FUNCTIONALITY = ['PSL_APP_FUNCTIONALITY'];

/**
 * Data type -> how it is handled.
 *
 * Keys are Play's response ids for the data-type checkboxes, which are also the
 * middle segment of every PSL_DATA_USAGE_RESPONSES question. Note
 * PSL_OTHER_APP_ACTIVITY: the label reads "Other actions", but the id says
 * app activity, and getting that wrong silently declares nothing.
 *
 * `required: false` means the user can opt out. All three here are opt-out:
 * nothing is registered until notification permission is granted, and purchase
 * state only exists if something was bought.
 *
 * `shared: false` for all three. OneSignal and RevenueCat are service
 * providers processing on our behalf, which Play excludes from "sharing".
 */
const TYPE_CONFIG = {
  PSL_DEVICE_ID: { shared: false, required: false, purposes: APP_FUNCTIONALITY },
  PSL_OTHER_APP_ACTIVITY: { shared: false, required: false, purposes: APP_FUNCTIONALITY },
  PSL_PURCHASE_HISTORY: { shared: false, required: false, purposes: APP_FUNCTIONALITY },
};
const TYPES = Object.keys(TYPE_CONFIG);

const unrecognised = new Set();

/** Decides the value for one row, or null to leave it blank. */
function answer(qid, rid) {
  if (qid === 'PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA') return 'TRUE';
  if (qid === 'PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT') return 'TRUE';
  if (qid === 'PSL_HAS_OUTSIDE_APP_ACCOUNTS') return 'FALSE';
  if (qid === 'PSL_SUPPORTED_ACCOUNT_CREATION_METHODS') {
    return rid === 'PSL_ACM_NONE' ? 'TRUE' : null;
  }
  if (qid === 'PSL_SUPPORT_DATA_DELETION_BY_USER') {
    // Single choice: tick Yes, leave the two No variants blank. Yes is honest —
    // the policy gives an address, and uninstalling ends registration outright
    // because the Worker drops a device that re-registers with an empty list.
    if (rid === 'DATA_DELETION_YES') return 'TRUE';
    if (rid === 'DATA_DELETION_NO' || rid === 'DATA_DELETION_NO_AUTO_DELETED') return null;
    unrecognised.add(`${qid} -> ${rid}`);
    return null;
  }
  if (qid === 'PSL_DATA_DELETION_URL') return DELETION_URL;

  // The data-type checkboxes: "which of these does your app collect?"
  if (qid.startsWith('PSL_DATA_TYPES_')) return TYPES.includes(rid) ? 'TRUE' : null;

  // Per-type handling questions. Only the three declared types have answers;
  // every other type's rows stay blank, which is how Play encodes "not collected".
  const usage = qid.match(/^PSL_DATA_USAGE_RESPONSES:([A-Z0-9_]+):(.+)$/);
  if (!usage) return null;

  const [, type, part] = usage;
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return null;

  switch (part) {
    case 'PSL_DATA_USAGE_COLLECTION_AND_SHARING':
      // Two independent checkboxes, Collected and Shared.
      if (rid === 'PSL_DATA_USAGE_ONLY_COLLECTED') return 'TRUE';
      if (rid === 'PSL_DATA_USAGE_ONLY_SHARED') return cfg.shared ? 'TRUE' : null;
      unrecognised.add(`${qid} -> ${rid}`);
      return null;

    case 'PSL_DATA_USAGE_EPHEMERAL':
      // False for all three: the Worker persists the subscription id and the
      // watched game ids, and RevenueCat persists purchase state.
      return 'FALSE';

    case 'DATA_USAGE_USER_CONTROL':
      if (rid === 'PSL_DATA_USAGE_USER_CONTROL_OPTIONAL') return cfg.required ? null : 'TRUE';
      if (rid === 'PSL_DATA_USAGE_USER_CONTROL_REQUIRED') return cfg.required ? 'TRUE' : null;
      unrecognised.add(`${qid} -> ${rid}`);
      return null;

    case 'DATA_USAGE_COLLECTION_PURPOSE':
      return cfg.purposes.includes(rid) ? 'TRUE' : null;

    case 'DATA_USAGE_SHARING_PURPOSE':
      return cfg.shared && cfg.purposes.includes(rid) ? 'TRUE' : null;

    default:
      return null;
  }
}

const lines = readFileSync(src, 'utf8').split(/\r?\n/);
let filled = 0;

const result = lines.map((line, i) => {
  if (i === 0 || line.trim() === '') return line; // header, trailing newline

  // Columns 1-4 are unquoted ids; only the human-readable label (column 5) can
  // contain commas, so splitting the first four by comma is safe.
  const m = line.match(/^([A-Z0-9_:]+),([A-Z0-9_]*),([^,]*),([A-Z_]+),/);
  if (!m) return line;

  const value = answer(m[1], m[2]);
  if (value === null) return line;

  filled += 1;
  return line.replace(/^([A-Z0-9_:]+,[A-Z0-9_]*,)[^,]*(,)/, `$1${value}$2`);
});

writeFileSync(out, result.join('\n'));

console.log(`Filled ${filled} response values -> ${out}`);
console.log(`Declared: ${TYPES.join(', ')}`);

if (unrecognised.size > 0) {
  console.log('\nResponse ids this script did not recognise (answer these by hand in the UI):');
  for (const u of unrecognised) console.log(`  ${u}`);
}

// A REQUIRED question left blank fails the import, and Play's error does not
// say which row. Catch it here instead.
const blanks = result.filter((l) => /^[A-Z0-9_:]+,[A-Z0-9_]*,,REQUIRED,/.test(l));
if (blanks.length > 0) {
  console.log('\nStill-blank REQUIRED questions (fix before importing):');
  for (const b of blanks) console.log(`  ${b.split(',')[0]}`);
} else {
  console.log('\nNo REQUIRED question left blank.');
}
