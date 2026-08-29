// Uploads Backlogue's listing graphics to Google Play.
//
//   docs/store/icon-1024.png          -> icon              (1024x1024, no alpha)
//   docs/store/feature-1024x500.png   -> featureGraphic    (1024x500, required)
//   docs/screenshots/*.png            -> phoneScreenshots  (in filename order)
//
// Regenerate the sources first if the UI changed:
//   ./gradlew screenshots
//   node tools/render-store-assets.mjs
//
// Idempotent: existing images of each type are deleted before upload, otherwise
// re-running appends duplicates until Play rejects the edit for having too many.
//
// Play rejects an icon with an alpha channel, and does it at upload with a
// message about the image format rather than about transparency — so the
// channel count is checked locally first.
//
// Usage: node scripts/play-assets.mjs

import { readFileSync, existsSync, readdirSync } from 'node:fs';
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

const LANGUAGE = 'en-US';
const ROOT = repoRoot();

const IMAGES = [
  { type: 'icon', file: resolve(ROOT, 'docs/store/icon-1024.png'), expect: [1024, 1024] },
  { type: 'featureGraphic', file: resolve(ROOT, 'docs/store/feature-1024x500.png'), expect: [1024, 500] },
];
const SHOTS_DIR = resolve(ROOT, 'docs/screenshots');

/** Minimal PNG header read — width, height and colour type from the IHDR. */
function pngInfo(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    colorType: buf.readUInt8(25), // 6 = RGBA, 2 = RGB
  };
}

function verify(file, expect) {
  if (!existsSync(file)) throw new Error(`missing: ${file}`);
  const info = pngInfo(readFileSync(file));
  if (expect && (info.width !== expect[0] || info.height !== expect[1])) {
    throw new Error(`${file} is ${info.width}x${info.height}, expected ${expect.join('x')}`);
  }
  return info;
}

async function main() {
  // Fail before touching the API if an asset is wrong — a half-applied edit is
  // more annoying to unpick than a refused one.
  for (const img of IMAGES) {
    const info = verify(img.file, img.expect);
    if (img.type === 'icon' && info.colorType === 6) {
      throw new Error('icon-1024.png has an alpha channel; Play rejects that. Re-run tools/render-store-assets.mjs');
    }
    console.log(`  ok  ${img.type}  ${info.width}x${info.height}  colorType ${info.colorType}`);
  }

  const shots = existsSync(SHOTS_DIR)
    ? readdirSync(SHOTS_DIR).filter((f) => f.endsWith('.png')).sort()
    : [];
  if (shots.length < 2) throw new Error(`Play needs at least 2 phone screenshots, found ${shots.length}`);
  for (const s of shots) {
    const info = verify(resolve(SHOTS_DIR, s));
    console.log(`  ok  screenshot ${s}  ${info.width}x${info.height}`);
  }

  const token = await getToken();
  const api = client(token);

  const upload = async (editId, type, file) => {
    const res = await fetch(
      `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${PACKAGE}` +
        `/edits/${editId}/listings/${LANGUAGE}/${type}?uploadType=media`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
        body: readFileSync(file),
      },
    );
    if (!res.ok) throw new Error(`upload ${type} failed — ${res.status} ${await res.text()}`);
  };

  const edit = await api('POST', appPath('/edits'));

  for (const img of IMAGES) {
    await api('DELETE', appPath(`/edits/${edit.id}/listings/${LANGUAGE}/${img.type}`)).catch(() => {});
    await upload(edit.id, img.type, img.file);
    console.log(`uploaded ${img.type}`);
  }

  await api('DELETE', appPath(`/edits/${edit.id}/listings/${LANGUAGE}/phoneScreenshots`)).catch(() => {});
  for (const s of shots) {
    await upload(edit.id, 'phoneScreenshots', resolve(SHOTS_DIR, s));
    console.log(`uploaded screenshot ${s}`);
  }

  const how = await commitEdit(api, edit.id);
  console.log(`\n${IMAGES.length} graphics + ${shots.length} screenshots — ${how}`);
}

main().catch(fail);
