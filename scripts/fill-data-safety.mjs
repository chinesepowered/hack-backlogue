// Fills the Play Console Data safety CSV with Backlogue's answers.
//
// Play accepts this form only as a CSV round-trip through the console UI —
// there is no API for it — so this script does not talk to Play at all. It
// rewrites an export in place:
//
//   1. Play Console -> App content -> Data safety -> Export to CSV
//      (always start from a FRESH export; Google renames the schema without
//      notice, and a stale export imports as garbage)
//   2. node scripts/fill-data-safety.mjs <exported.csv> [out.csv]
//   3. Import the output on the same page, review every answer, save.
//
// The still-blank REQUIRED list printed at the end is the checklist for
// anything the schema renamed since this was written. Nothing is guessed: where
// an answer depends on a response id this script does not recognise, it leaves
// the row blank and tells you, rather than writing a wrong TRUE.
//
// What Backlogue declares, and why (see docs/store/listing.md#privacy):
//
//   Device or other IDs   the OneSignal push subscription id, sent to the alert
//                         server so release alerts can reach this device.
//                         Collected, not shared, opt-in (push permission).
//   App activity          the IGDB ids of games in your pile, sent to the same
//   (other actions)       server so it knows which releases to watch.
//   Purchase history      RevenueCat processes purchase tokens server-side as
//                         our service provider. Not in the app's own network
//                         traffic, but Play counts a service provider as
//                         collection — the sibling projects declare it too.
//
// There is no analytics SDK, no ad SDK, and no account system, so everything
// else is a No.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const src = process.argv[2] ?? 'docs/store/data-safety-export.csv';
const out = process.argv[3] ?? 'docs/store/data-safety.csv';

if (!existsSync(src)) {
  console.error(`No CSV at ${src}`);
  console.error('Export one first: Play Console -> App content -> Data safety -> Export to CSV');
  process.exit(1);
}

const APP_FUNCTIONALITY = ['PSL_APP_FUNCTIONALITY'];

/** type -> { shared, required, purposes }. `required: false` = user can opt out. */
const TYPE_CONFIG = {
  PSL_DEVICE_ID: { shared: false, required: false, purposes: APP_FUNCTIONALITY },
  PSL_OTHER_ACTIONS: { shared: false, required: false, purposes: APP_FUNCTIONALITY },
  PSL_PURCHASE_HISTORY: { shared: false, required: false, purposes: APP_FUNCTIONALITY },
};
const TYPES = Object.keys(TYPE_CONFIG);

// Questions whose response ids are picked by suffix rather than by exact name,
// because those ids are the part of the schema that keeps being renamed.
const unrecognised = new Set();

const lines = readFileSync(src, 'utf8').split(/\r?\n/);
let filled = 0;

const result = lines.map((line) => {
  const m = line.match(
    /^([A-Z0-9_:]+),([A-Z0-9_]*),([^,]*),(REQUIRED|MAYBE_REQUIRED|OPTIONAL|MULTIPLE_CHOICE|SINGLE_CHOICE),/,
  );
  if (!m) return line;
  const [, qid, rid] = m;
  let value = null;

  if (qid === 'PSL_SUPPORTED_ACCOUNT_CREATION_METHODS') value = rid === 'PSL_ACM_NONE' ? 'TRUE' : null;
  else if (qid === 'PSL_HAS_OUTSIDE_APP_ACCOUNTS') value = 'FALSE';
  else if (qid === 'PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA') value = 'TRUE';
  else if (qid === 'PSL_DATA_COLLECTION_ENCRYPTED_IN_TRANSIT') value = 'TRUE';
  else if (qid === 'PSL_SUPPORT_DATA_DELETION_BY_USER') {
    // Backlogue answers yes: the privacy policy gives a contact address, and
    // uninstalling stops registration outright. Only the affirmative option is
    // ticked; if this export spells it differently, it stays blank and shows up
    // in the checklist below.
    if (/_YES$/.test(rid)) value = 'TRUE';
    else if (/_NO$/.test(rid)) value = 'FALSE';
    else unrecognised.add(`${qid} -> ${rid}`);
  } else if (qid.startsWith('PSL_DATA_TYPES_') && TYPES.includes(rid)) value = 'TRUE';
  else {
    const usage = qid.match(/^PSL_DATA_USAGE_RESPONSES:([A-Z0-9_]+):(.+)$/);
    if (usage && TYPES.includes(usage[1])) {
      const cfg = TYPE_CONFIG[usage[1]];
      const part = usage[2];
      if (part === 'PSL_DATA_USAGE_COLLECTION_AND_SHARING') {
        // This question appears once per mode; the rid names the mode. A
        // collected-only type must answer FALSE on the sharing row.
        if (/SHAR/.test(rid)) value = cfg.shared ? 'TRUE' : 'FALSE';
        else value = 'TRUE';
      } else if (part === 'PSL_DATA_USAGE_EPHEMERAL') value = 'FALSE';
      else if (part === 'DATA_USAGE_USER_CONTROL') {
        // Required = the user cannot turn it off. Push is permission-gated and
        // the pile sync follows it, so every type here is optional.
        if (/_REQUIRED$/.test(rid)) value = cfg.required ? 'TRUE' : null;
        else if (/_OPTIONAL$/.test(rid)) value = cfg.required ? null : 'TRUE';
        else unrecognised.add(`${qid} -> ${rid}`);
      } else if (part === 'DATA_USAGE_COLLECTION_PURPOSE')
        value = cfg.purposes.includes(rid) ? 'TRUE' : null;
      else if (part === 'DATA_USAGE_SHARING_PURPOSE')
        value = cfg.shared && cfg.purposes.includes(rid) ? 'TRUE' : null;
    }
  }

  if (value === null) return line;
  filled += 1;
  return line.replace(/^([A-Z0-9_:]+,[A-Z0-9_]*,)([^,]*)(,)/, `$1${value}$3`);
});

writeFileSync(out, result.join('\n'));
console.log(`Filled ${filled} response values -> ${out}`);
console.log(`Declared: ${TYPES.join(', ')}`);

if (unrecognised.size > 0) {
  console.log('\nResponse ids this script did not recognise (answer these by hand):');
  for (const u of unrecognised) console.log(`  ${u}`);
}

// Preflight: REQUIRED questions still blank will fail the import — list them.
const blanks = result.filter((l) => /^[A-Z0-9_:]+,[A-Z0-9_]*,,(REQUIRED),/.test(l));
if (blanks.length > 0) {
  console.log('\nStill-blank REQUIRED questions (check these):');
  for (const b of blanks) console.log(`  ${b.split(',')[0]}`);
}
