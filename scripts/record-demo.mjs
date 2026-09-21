// Records the Devpost demo on an Android emulator: one continuous take, paced
// to the narration that narrate.mjs already rendered.
//
//   node scripts/narrate.mjs          # first — the video is timed to the voice
//   node scripts/record-demo.mjs      # -> docs/video/_work/take.mp4 + markers.json
//   node scripts/compose-demo.mjs     # mux narration over the take
//
// Useful flags:
//   --probe        boot, install, then dump the UI tree and exit. Run this once
//                  before the first real take: scene actions address widgets by
//                  their on-screen text, and this is how you find out what text
//                  the accessibility tree actually exposes.
//   --no-install   skip reinstalling the APK
//   --keep         leave the emulator running afterwards
//   --avd <name>   use a specific AVD
//
// ---------------------------------------------------------------------------
// Why an emulator and not offscreen rendering.
//
// Compose can rasterise the real composables offscreen through Skia — that is
// how the store screenshots are made, with no device at all. It cannot draw
// Android's share sheet, because that is system UI belonging to another
// process. The share sheet is the first fifteen seconds and the entire pitch,
// so it has to be real. Everything downstream of it could have been rendered,
// but mixing the two sources means matching status bar, scale and motion
// blur across a cut, for footage nobody would grade differently.
//
// What is NOT real here: the Play purchase. This image is `google_apis`, not
// `google_apis_playstore`, so there is no Play Store and billing cannot run.
// The paywall is shown and the Pro state is reached through the debug path.
// Say so in the judges' notes rather than implying a purchase was made.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { SCENES, TAIL_MS, APP_ID } from './demo-scenes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORK = resolve(ROOT, 'docs', 'video', '_work');
const TIMING_FILE = resolve(ROOT, 'docs', 'video', 'narration-timing.json');
const APK = resolve(ROOT, 'composeApp', 'build', 'outputs', 'apk', 'release', 'composeApp-release.apk');

const AVD_NAME = argValue('--avd') ?? 'backlogue-demo';
const DEVICE_PROFILE = 'pixel_7';

const SDK = process.env.ANDROID_HOME
  ?? process.env.ANDROID_SDK_ROOT
  ?? join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');

const exe = (p) => (process.platform === 'win32' ? `${p}.bat` : p);
const ADB = join(SDK, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const EMULATOR = join(SDK, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');
const AVDMANAGER = join(SDK, 'cmdline-tools', 'latest', 'bin', exe('avdmanager'));

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const has = (flag) => process.argv.includes(flag);

const sh = (bin, args, opts = {}) =>
  execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });

const adb = (...args) => sh(ADB, args);
const adbShell = (cmd) => adb('shell', cmd);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(msg) {
  console.error(`\n${msg}`);
  process.exit(1);
}

// --- emulator lifecycle ----------------------------------------------------

function avdExists() {
  return sh(EMULATOR, ['-list-avds']).split(/\r?\n/).map((s) => s.trim()).includes(AVD_NAME);
}

/** The installed system image, e.g. system-images;android-36;google_apis;x86_64. */
function findSystemImage() {
  const base = join(SDK, 'system-images');
  if (!existsSync(base)) fail(`No system images under ${base}. Install one in Android Studio.`);

  for (const api of readdirSync(base)) {
    for (const tag of readdirSync(join(base, api))) {
      for (const abi of readdirSync(join(base, api, tag))) {
        if (statSync(join(base, api, tag, abi)).isDirectory()) {
          return `system-images;${api};${tag};${abi}`;
        }
      }
    }
  }
  fail(`No system image found under ${base}.`);
}

function createAvd() {
  const image = findSystemImage();
  console.log(`Creating AVD ${AVD_NAME} from ${image}`);
  if (!existsSync(AVDMANAGER)) {
    fail(
      `avdmanager not found at ${AVDMANAGER}.\n` +
        'Install "Android SDK Command-line Tools (latest)" in Android Studio → SDK Manager → SDK Tools,\n' +
        `or create an AVD named ${AVD_NAME} by hand in Device Manager.`,
    );
  }
  sh(AVDMANAGER, ['create', 'avd', '-n', AVD_NAME, '-k', image, '-d', DEVICE_PROFILE, '--force'], {
    input: 'no\n',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

async function bootEmulator() {
  if (adb('devices').split(/\r?\n/).some((l) => /^emulator-\d+\s+device$/.test(l.trim()))) {
    console.log('Emulator already running.');
    return null;
  }

  if (!avdExists()) createAvd();

  console.log(`Booting ${AVD_NAME} …`);
  const proc = spawn(EMULATOR, ['-avd', AVD_NAME, '-no-boot-anim', '-no-snapshot-save'], {
    detached: true,
    stdio: 'ignore',
  });
  proc.unref();

  const deadline = Date.now() + 240_000;
  while (Date.now() < deadline) {
    try {
      if (adbShell('getprop sys.boot_completed').trim() === '1') {
        await sleep(4_000); // let the launcher settle before the first tap
        console.log('Booted.');
        return proc;
      }
    } catch {
      /* device not up yet */
    }
    await sleep(3_000);
  }
  fail('Emulator did not finish booting within four minutes.');
}

function prepareDevice() {
  // A demo take must not be interrupted by the OS. These are emulator-only and
  // are not restored — the AVD is disposable.
  const quiet = [
    'settings put global window_animation_scale 1',
    'settings put global transition_animation_scale 1',
    'settings put global animator_duration_scale 1',
    'settings put secure immersive_mode_confirmations confirmed',
    'settings put global heads_up_notifications_enabled 1',
    'svc wifi enable',
  ];
  for (const cmd of quiet) {
    try { adbShell(cmd); } catch { /* best effort */ }
  }
  // Demo clock: a fixed, tidy status bar beats whatever time the take happens at.
  try { adbShell('am broadcast -a com.android.systemui.demo -e command enter'); } catch {}
  try {
    adbShell('am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0942');
    adbShell('am broadcast -a com.android.systemui.demo -e command battery -e level 82 -e plugged false');
    adbShell('am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4');
    adbShell('am broadcast -a com.android.systemui.demo -e command notifications -e visible false');
  } catch {}
}

function install() {
  if (!existsSync(APK)) {
    fail(`No APK at ${APK}\n  ./gradlew :composeApp:assembleRelease`);
  }
  console.log('Installing APK …');
  try { adb('uninstall', APP_ID); } catch { /* not installed */ }
  adb('install', '-r', '-g', APK); // -g grants runtime permissions, incl. notifications
}

// --- driving the UI --------------------------------------------------------

function uiDump() {
  adbShell('uiautomator dump /sdcard/ui.xml >/dev/null 2>&1 || true');
  return adbShell('cat /sdcard/ui.xml');
}

/** Every text and content-desc currently on screen, for --probe and for errors. */
function visibleLabels(xml) {
  const out = new Set();
  for (const m of xml.matchAll(/(?:text|content-desc)="([^"]+)"/g)) out.add(m[1]);
  return [...out];
}

function centreOf(xml, label) {
  // Match a node whose text or content-desc equals the label, then its bounds.
  const re = new RegExp(
    `<node[^>]*(?:text|content-desc)="${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`,
  );
  const m = xml.match(re);
  if (!m) return null;
  const [, x1, y1, x2, y2] = m.map(Number);
  return [Math.round((x1 + x2) / 2), Math.round((y1 + y2) / 2)];
}

async function tapText(label, { attempts = 6 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const xml = uiDump();
    const pt = centreOf(xml, label);
    if (pt) {
      adbShell(`input tap ${pt[0]} ${pt[1]}`);
      return true;
    }
    await sleep(700);
  }
  const labels = visibleLabels(uiDump());
  console.error(`\n  Could not find "${label}" on screen. Visible labels:`);
  console.error(`    ${labels.join(' | ')}`);
  console.error('  Fix the scene in scripts/demo-scenes.mjs, or use {tapXY:[x,y]}.');
  return false;
}

async function runAction(action) {
  if (action.wait) return sleep(action.wait);
  if (action.shell) return void adbShell(action.shell);
  if (action.tapXY) return void adbShell(`input tap ${action.tapXY[0]} ${action.tapXY[1]}`);
  if (action.swipe) return void adbShell(`input swipe ${action.swipe.join(' ')}`);
  if (action.tap) {
    const ok = await tapText(action.tap);
    if (!ok) console.error('  (continuing — the take will need a retry)');
    return;
  }
  if (action.manual) {
    console.log(`\n  >>> MANUAL: ${action.manual}`);
    console.log('  >>> Recording is live. Do it now.\n');
    return sleep(6_000);
  }
}

// --- the take --------------------------------------------------------------

function sceneHold(scene, timing) {
  const spoken = timing[scene.id]?.ms;
  return spoken ? Math.max(scene.minMs, spoken + TAIL_MS) : scene.minMs;
}

async function main() {
  mkdirSync(WORK, { recursive: true });

  if (!existsSync(TIMING_FILE)) {
    fail(`No narration timings at ${TIMING_FILE}\n  node scripts/narrate.mjs   (run this first)`);
  }
  const timing = JSON.parse(readFileSync(TIMING_FILE, 'utf8'));

  await bootEmulator();
  prepareDevice();
  if (!has('--no-install')) install();

  if (has('--probe')) {
    adbShell(`monkey -p ${APP_ID} -c android.intent.category.LAUNCHER 1`);
    await sleep(4_000);
    const xml = uiDump();
    writeFileSync(join(WORK, 'ui-probe.xml'), xml);
    console.log('\nLabels the accessibility tree exposes right now:\n');
    for (const l of visibleLabels(xml)) console.log(`  ${l}`);
    console.log(`\nFull tree: ${join(WORK, 'ui-probe.xml')}`);
    console.log('Use these strings in the {tap: ...} actions in scripts/demo-scenes.mjs.');
    return;
  }

  const holds = SCENES.map((s) => sceneHold(s, timing));
  const totalMs = holds.reduce((a, b) => a + b, 0);
  console.log(`\nTake length: ${(totalMs / 1000).toFixed(1)}s across ${SCENES.length} scenes`);
  if (totalMs > 120_000) {
    console.log('  WARNING: over two minutes. Judges are not required to watch past it.');
  }

  const limit = Math.ceil(totalMs / 1000) + 3;
  console.log(`Recording (screenrecord --time-limit ${limit}) …\n`);

  // --time-limit rather than killing the process: stopping screenrecord cleanly
  // from the host is unreliable on Windows, and a truncated mp4 has no moov box
  // and will not play at all.
  const rec = spawn(ADB, [
    'shell', 'screenrecord', '--bit-rate', '12M', '--time-limit', String(limit), '/sdcard/take.mp4',
  ], { stdio: 'ignore' });

  await sleep(1_500); // let the encoder start before the first action

  const markers = [];
  const started = Date.now();
  for (const [i, scene] of SCENES.entries()) {
    const at = Date.now() - started;
    markers.push({ id: scene.id, title: scene.title, atMs: at, holdMs: holds[i] });
    console.log(`  ${String(at / 1000).padStart(6)}s  ${scene.id}  ${scene.title}`);

    const sceneEnd = Date.now() + holds[i];
    for (const action of scene.actions) await runAction(action);
    const left = sceneEnd - Date.now();
    if (left > 0) await sleep(left);
  }

  await new Promise((r) => rec.on('exit', r));
  await sleep(1_500); // let the file finalise on device

  const take = join(WORK, 'take.mp4');
  adb('pull', '/sdcard/take.mp4', take);
  writeFileSync(join(WORK, 'markers.json'), `${JSON.stringify({ startedAt: started, markers }, null, 2)}\n`);

  console.log(`\nTake:    ${take}`);
  console.log(`Markers: ${join(WORK, 'markers.json')}`);

  if (!has('--keep')) {
    try { adb('emu', 'kill'); } catch {}
    console.log('\nEmulator stopped. Delete the AVD when done:');
    console.log(`  ${AVDMANAGER} delete avd -n ${AVD_NAME}`);
  }

  console.log('\nNext: node scripts/compose-demo.mjs');
}

main().catch((err) => {
  console.error(err.stack ?? err.message ?? err);
  process.exit(1);
});
