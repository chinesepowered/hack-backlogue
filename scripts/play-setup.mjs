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
