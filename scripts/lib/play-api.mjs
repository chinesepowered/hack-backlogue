// Shared Google Play Developer API (androidpublisher v3) plumbing.
//
// The sibling Expo projects keep this block inlined in every script so each one
// is copy-pasteable on its own. There are four scripts here and the block is
// ~60 lines, so it lives in one place instead; the tradeoff is that copying a
// single script to another repo now means copying this file too.
//
// Auth is a Google Cloud service account with access to the Play Console
// account. Resolution order:
//   1. GOOGLE_APPLICATION_CREDENTIALS (path to the JSON)
//   2. ../_android/play-service-account.json  (outside the repo, never committed)
//
// The service account must be granted access in Play Console → Users and
// permissions, AND the app record must already exist. Until both are true every
// call 404s, which reads like a wrong package name and is not.
//
// No dependencies — plain fetch and node:crypto. Node 18+.
// On corporate networks: NODE_OPTIONS=--use-system-ca

import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE = 'com.chinesepowered.backlogue';

export function repoRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
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

export async function getToken() {
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

const ROOT = 'https://androidpublisher.googleapis.com/androidpublisher/v3';

/** Call any androidpublisher path. `path` is absolute from /v3. */
export function client(token) {
  return async function api(method, path, body) {
    const res = await fetch(`${ROOT}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const detail = json?.error ? `${json.error.status}: ${json.error.message}` : text;
      const err = new Error(`${method} ${path} failed — ${res.status} ${detail}`);
      err.status = res.status;
      err.body = json;
      throw err;
    }
    return json;
  };
}

/** Paths under this app, for convenience. */
export const appPath = (suffix = '') => `/applications/${PACKAGE}${suffix}`;

/**
 * Commits an edit, falling back to a review-less commit.
 *
 * A draft app (one that has never been published) cannot send changes for
 * review, and the API expresses that as a 400/403 rather than something more
 * specific — so the fallback is not optional for a first run.
 */
export async function commitEdit(api, editId) {
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

export function fail(err) {
  console.error(err.message ?? err);
  process.exit(1);
}
