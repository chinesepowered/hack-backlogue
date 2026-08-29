// Sets the Google Play store listing (en-US) for Backlogue.
//
// Idempotent — safe to re-run. The listing text is the source of truth in
// docs/store/listing.md; this file is where it becomes real, so if you edit one
// edit both.
//
// Character limits are enforced locally before the call, because the API's
// rejection for an over-length description does not say which field it was.
//
// Usage: node scripts/play-setup.mjs

import { getToken, client, appPath, commitEdit, fail } from './lib/play-api.mjs';

const LIMITS = { title: 30, shortDescription: 80, fullDescription: 4000 };

const LISTING = {
  language: 'en-US',
  title: 'Backlogue',
  shortDescription: "Save games the moment you find them. Share a video in, it's in your pile.",
  fullDescription: `Every backlog app competes on organising games you've already saved. That's the wrong battle — most games never make it into the list at all.

You're three minutes into a review. Something looks good. To save it, every other app asks you to leave the video, open it, search for the game, and file it. Almost nobody does that. That's why almost nobody's backlog is accurate.

Backlogue lives in your share sheet instead.


SAVE IT WHERE YOU FOUND IT

Share a YouTube video, a Reddit thread, or a Steam page into Backlogue and the game lands in your pile in one tap. You never leave what you were watching.


IT REMEMBERS WHERE IT CAME FROM

Every game keeps a note of where you found it — "From a YouTube video", "From Reddit". Six months later your list reads like a record of your own taste instead of a chore list.


BUILT NOT TO MAKE YOU FEEL BAD

No completion percentage. No "47 unplayed games" counter. No red badges, no overdue states. Games you started and didn't finish are Bounced, not Abandoned — because that's what players actually say, and it puts the mismatch on the game rather than on you.


TRACK WHAT YOU WANT TO TRACK

• Wishlist, Backlog, Playing, Beaten, Bounced
• Rate a game out of 10 when you're done with it
• Filter your pile by status
• Works offline — saving a game never waits on a network


FREE FOREVER, FOR THE PART THAT MATTERS

Saving, organising, rating and sharing up to 30 games is free and always will be. Backlogue Pro lifts the cap and adds a nudge when a wishlisted game finally gets a release date, or the day it lands.`,
};

function checkLimits() {
  const over = Object.entries(LIMITS)
    .filter(([field, max]) => LISTING[field].length > max)
    .map(([field, max]) => `  ${field}: ${LISTING[field].length}/${max}`);
  if (over.length) {
    console.error('Listing fields exceed Play limits:');
    console.error(over.join('\n'));
    process.exit(1);
  }
  for (const [field, max] of Object.entries(LIMITS)) {
    console.log(`  ${field}: ${LISTING[field].length}/${max}`);
  }
}

async function main() {
  checkLimits();

  const api = client(await getToken());
  const edit = await api('POST', appPath('/edits'));
  await api('PUT', appPath(`/edits/${edit.id}/listings/${LISTING.language}`), LISTING);
  const how = await commitEdit(api, edit.id);

  console.log(`\nUpdated ${LISTING.language} listing — ${how}`);
  console.log('\nStill manual in Play Console:');
  console.log('  - App content declarations (privacy policy, ads, target audience)');
  console.log('  - Data safety form — see scripts/fill-data-safety.mjs');
  console.log('  - Category, countries/regions, then roll out the build');
}

main().catch(fail);
