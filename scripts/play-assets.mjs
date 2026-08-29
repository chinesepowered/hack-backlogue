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
import { resolve } from 'node:path';
import { getToken, appPath, client, commitEdit, repoRoot, fail, PACKAGE } from './lib/play-api.mjs';

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
