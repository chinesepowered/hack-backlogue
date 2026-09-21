// Seeds the emulator with a lived-in pile, so the demo take has something to
// show. Run after installing, before record-demo.mjs.
//
//   node scripts/seed-demo.mjs            # clear, then seed
//   node scripts/seed-demo.mjs --keep     # add to whatever is already there
//
// Every game is added through the REAL capture path — an ACTION_SEND intent
// carrying the kind of text a share actually produces — rather than by writing
// rows into the database. Two reasons:
//
//   1. Provenance is derived from the shared text, so a seeded row would say
//      "From search" and scene 2's whole payoff is the line reading "From a
//      YouTube video". A database seed cannot produce that without lying.
//   2. It exercises the parser and the Worker on the way in, which is a free
//      end-to-end check every time the demo is rebuilt.
//
// The `pick` field matters. IGDB returns near-duplicates - searching Elden Ring
// surfaces "Elden Ring Nightreign" first, and Disco Elysium surfaces the Game
// Boy Edition - so tapping the first result gives a pile full of odd editions.
// Each entry names the exact title to tap.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const APP_ID = 'com.chinesepowered.backlogue';
const CAPTURE = `${APP_ID}/.capture.CaptureActivity`;
const MAIN = `${APP_ID}/.MainActivity`;

const SDK = process.env.ANDROID_HOME
  ?? process.env.ANDROID_SDK_ROOT
  ?? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');
const ADB = join(SDK, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');

const adb = (...args) =>
  execFileSync(ADB, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const adbShell = (cmd) => adb('shell', cmd);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * The pile, as a judge should first see it: mixed sources, all five statuses,
 * and enough rows to scroll. Silksong is deliberately absent — it is added live
 * in scene 1 and has to land at the top of an existing pile, not into a void.
 */
const SEED = [
  {
    share: 'Elden Ring - Story Trailer https://www.youtube.com/watch?v=AKXiKBnzpBQ',
    pick: 'Elden Ring',
    status: 'Beaten',
  },
  {
    // A Reddit slug that is just the game name. "outer_wilds_is_incredible"
    // parses to a sentence, which resolves to nothing - the parser correctly
    // refuses to guess, but that is the fallback path, not the seed path.
    share: 'Outer Wilds https://www.reddit.com/r/patientgamers/comments/abc123/outer_wilds/',
    pick: 'Outer Wilds',
    status: 'Beaten',
  },
  {
    share: 'https://store.steampowered.com/app/632470/Disco_Elysium/',
    pick: 'Disco Elysium',
    status: 'Bounced',
  },
  {
    // "Early Access Launch" is not in the noise list and survives into the
    // query, which finds nothing. "Official Launch Trailer" is, and does not.
    share: 'Hades II - Official Launch Trailer https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    pick: 'Hades II',
    status: 'Playing',
  },
  {
    share: 'https://store.steampowered.com/app/413150/Stardew_Valley/',
    pick: 'Stardew Valley',
    status: 'Backlog',
  },
  {
    // "Announce Trailer" leaves "Blue Prince Announce" - the noise list strips
    // "Trailer" but not "Announce Trailer". Worth fixing in ShareTextParser.
    share: 'Blue Prince - Official Trailer https://www.youtube.com/watch?v=xvFZjo5PgG0',
    pick: 'Blue Prince',
    status: 'Wishlist',
  },
  {
    share: 'https://store.steampowered.com/app/367520/Hollow_Knight/',
    pick: 'Hollow Knight',
    status: 'Beaten',
  },
];

/**
 * The screen, or '' if the dump failed.
 *
 * The file is removed first on purpose. uiautomator fails routinely while the
 * UI is still settling, and the earlier version of this caught that and then
 * cat'd the PREVIOUS dump - so taps were computed from stale coordinates and
 * landed on whatever now occupied that spot. That is how an exact-match tap on
 * "Elden Ring" managed to add "Elden Ring Nightreign".
 */
function uiDump() {
  try { adbShell('rm -f /sdcard/seed.xml'); } catch { /* fine */ }
  let out = '';
  try { out = adbShell('uiautomator dump /sdcard/seed.xml 2>&1'); } catch { return ''; }
  if (!/dumped to/i.test(out)) return '';
  try { return adbShell('cat /sdcard/seed.xml'); } catch { return ''; }
}

/**
 * Android's runtime permission dialogs belong to another process and will
 * happily swallow a tap meant for the app. `pm clear` resets granted
 * permissions, so the notification prompt reappears on the first seeded game.
 */
function dismissSystemDialogs(xml) {
  for (const label of ['Allow', 'Don’t allow', "Don't allow", 'OK']) {
    const pt = centreOf(xml, label);
    if (pt) {
      adbShell(`input tap ${pt[0]} ${pt[1]}`);
      return true;
    }
  }
  return false;
}

function centreOf(xml, label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = xml.match(
    new RegExp(`<node[^>]*text="${esc}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`),
  );
  if (!m) return null;
  const [, x1, y1, x2, y2] = m.map(Number);
  return [Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2)];
}

/** Every text node with its bounds. */
function nodes(xml) {
  return [...xml.matchAll(/<node[^>]*text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)]
    .map((m) => ({
      text: m[1],
      x1: +m[2], y1: +m[3], x2: +m[4], y2: +m[5],
      cx: Math.round((+m[2] + +m[4]) / 2),
      cy: Math.round((+m[3] + +m[5]) / 2),
    }));
}

/**
 * The Add button belonging to a specific result row.
 *
 * Every row in the results list carries its own "Add", so tapping the first
 * node whose text is "Add" always adds the FIRST result no matter which title
 * was tapped. That is how a pile meant to hold Elden Ring and Disco Elysium
 * ended up with Elden Ring Nightreign and Disco Elysium: Game Boy Edition -
 * and the run reported success each time, because an Add really was tapped.
 *
 * Rows are matched by vertical proximity rather than by walking the tree: the
 * dump is flat, and a row's title and its button share a y band.
 */
function addButtonFor(xml, title) {
  const all = nodes(xml);

  // The capture screen shows the cleaned query as a header, and that text is
  // usually identical to the game title - so the first node matching `title` is
  // often the header, which has no Add button anywhere near it. Consider every
  // candidate and take the one that actually owns a button.
  const candidates = all.filter((n) => n.text === title);
  if (candidates.length === 0) return null;

  const adds = all.filter((n) => n.text === 'Add');
  if (adds.length === 0) return null;

  for (const target of candidates) {
    const nearest = adds
      .slice()
      .sort((a, b) => Math.abs(a.cy - target.cy) - Math.abs(b.cy - target.cy))[0];
    // A row is ~200px tall at this density; further away is a different row.
    if (Math.abs(nearest.cy - target.cy) <= 220) return [nearest.cx, nearest.cy];
  }
  return null;
}

/** Picks `title` out of the results and adds that exact game. */
async function addExact(title, attempts = 8) {
  for (let i = 0; i < attempts; i += 1) {
    const xml = uiDump();
    if (xml) {
      const pt = addButtonFor(xml, title);
      if (pt) {
        adbShell(`input tap ${pt[0]} ${pt[1]}`);
        return true;
      }
      if (dismissSystemDialogs(xml)) {
        await sleep(1_200);
        continue;
      }
    }
    await sleep(900);
  }
  return false;
}

async function tapText(label, attempts = 8) {
  for (let i = 0; i < attempts; i += 1) {
    const xml = uiDump();
    if (xml) {
      const pt = centreOf(xml, label);
      if (pt) {
        adbShell(`input tap ${pt[0]} ${pt[1]}`);
        return true;
      }
      if (dismissSystemDialogs(xml)) {
        await sleep(1_200);
        continue;
      }
    }
    await sleep(800);
  }
  return false;
}

/**
 * Backs out of CaptureActivity and confirms it is actually gone.
 *
 * One KEYCODE_BACK plus a fixed sleep is not enough: the activity sometimes
 * survives it, the next share is delivered to the instance already on screen,
 * and the dump then shows the PREVIOUS game's results. That failure reads
 * exactly like "IGDB has no match for this title" and is nothing of the kind.
 */
async function closeCapture() {
  for (let i = 0; i < 5; i += 1) {
    let top = '';
    try { top = adbShell('dumpsys activity activities | grep -m1 topResumedActivity'); } catch {}
    if (!/CaptureActivity/.test(top)) return true;
    adbShell('input keyevent KEYCODE_BACK');
    await sleep(1_200);
  }
  return false;
}

function visibleText(xml) {
  return [...new Set([...xml.matchAll(/text="([^"]+)"/g)].map((m) => m[1]))];
}

async function addOne(entry, index, total) {
  const label = `[${index + 1}/${total}] ${entry.pick}`;
  process.stdout.write(`${label.padEnd(34)} `);

  // force-stop rather than trusting a BACK press. A CaptureActivity that
  // survives gets the next share delivered into the instance already on screen,
  // and the dump then shows the PREVIOUS game - a failure that reads exactly
  // like "IGDB has no match" and is nothing of the kind.
  adbShell(`am force-stop ${APP_ID}`);
  await sleep(1_500);
  adbShell(
    `am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT ${JSON.stringify(entry.share)} -n ${CAPTURE}`,
  );
  await sleep(8_000);

  if (!(await addExact(entry.pick))) {
    console.log('NO EXACT MATCH');
    console.log(`    got: ${visibleText(uiDump()).slice(0, 6).join(' | ')}`);
    await closeCapture();
    return false;
  }
  await sleep(2_500);

  // CaptureActivity has no finish() after an add, so back out by hand.
  await closeCapture();

  // Status lives on the detail screen, reached from the pile.
  adbShell(`am start -n ${MAIN}`);
  await sleep(2_500);

  if (entry.status !== 'Wishlist') {
    if (!(await tapText(entry.pick))) {
      console.log(`added, but could not open detail (pile: ${visibleText(uiDump()).slice(0, 8).join(' | ')})`);
      return true;
    }
    await sleep(2_000);
    if (!(await tapText(entry.status))) {
      console.log(`added, but could not set ${entry.status}`);
      adbShell('input keyevent KEYCODE_BACK');
      return true;
    }
    await sleep(1_200);
    adbShell('input keyevent KEYCODE_BACK');
    await sleep(1_200);
  }

  console.log(`ok -> ${entry.status}`);
  return true;
}

async function main() {
  const keep = process.argv.includes('--keep');

  if (adb('devices').split(/\r?\n/).filter((l) => /\tdevice$/.test(l)).length === 0) {
    console.error('No device. Boot the emulator first:');
    console.error('  node scripts/record-demo.mjs --probe');
    process.exit(1);
  }

  if (!keep) {
    console.log('Clearing app data …');
    adbShell(`pm clear ${APP_ID}`);
    await sleep(1_500);
    // pm clear revokes runtime permissions too, so the notification prompt
    // comes back and swallows the first tap meant for the app. Granting it up
    // front is only right for seeding - the take itself should show the prompt
    // arriving at the moment the app decides to ask for it.
    try { adbShell(`pm grant ${APP_ID} android.permission.POST_NOTIFICATIONS`); } catch {}
  }

  if (process.argv.includes('--probe')) {
    console.log('Probing what each share actually resolves to …\n');
    for (const entry of SEED) {
      adbShell(
        `am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT ${JSON.stringify(entry.share)} -n ${CAPTURE}`,
      );
      await sleep(6_500);
      const xml = uiDump();
      const titles = visibleText(xml).filter((t) => t.length > 2 && !/^\d{4}$/.test(t));
      const exact = titles.includes(entry.pick) ? 'EXACT OK' : 'NO MATCH';
      console.log(`${entry.pick.padEnd(20)} ${exact}`);
      console.log(`  -> ${titles.join(' | ')}`);
      await closeCapture();
    }
    return;
  }

  // --only lets a failed game be retried without re-running the whole seed,
  // which takes about five minutes.
  const onlyIdx = process.argv.indexOf('--only');
  const wanted = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;
  const list = wanted ? SEED.filter((e) => e.pick === wanted) : SEED;
  if (wanted && list.length === 0) {
    console.error(`No seed entry called "${wanted}".`);
    console.error(`Known: ${SEED.map((e) => e.pick).join(', ')}`);
    process.exit(1);
  }

  console.log(`Seeding ${list.length} games through the real capture path …\n`);
  let ok = 0;
  for (const [i, entry] of list.entries()) {
    if (await addOne(entry, i, list.length)) ok += 1;
  }

  adbShell(`am start -n ${MAIN}`);
  await sleep(2_500);
  const labels = visibleText(uiDump());

  console.log(`\n${ok}/${SEED.length} seeded.`);
  console.log(`Pile shows: ${labels.filter((l) => l.length < 40).join(' | ')}`);
  console.log('\nNext: node scripts/record-demo.mjs');
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
