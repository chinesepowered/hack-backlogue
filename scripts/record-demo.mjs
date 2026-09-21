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
// Scene 6 shows the paywall and the Pro state, not a store transaction. That
// is the stronger shot anyway - the free-tier argument and the paywall's own
// design are the interesting part - and this image is `google_apis` rather
// than `google_apis_playstore`, so Play billing could not run here regardless.
// ---------------------------------------------------------------------------

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawn } from 'node:child_process';
import { SCENES, SETUP, TAIL_MS, APP_ID } from './demo-scenes.mjs';

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

// Node 24 refuses to execFile a .bat or .cmd directly (the CVE-2024-27980 fix),
// so batch wrappers like avdmanager.bat need shell:true — and then cmd.exe gets
// to see the arguments, which matters because an sdk package id is full of
// semicolons: system-images;android-36;google_apis;x86_64.
const quoteForCmd = (a) => (/[\s;&|<>^"()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);

const sh = (bin, args, opts = {}) => {
  const isBatch = /\.(bat|cmd)$/i.test(bin);
  return execFileSync(
    isBatch ? quoteForCmd(bin) : bin,
    isBatch ? args.map(quoteForCmd) : args,
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...(isBatch ? { shell: true } : {}),
      ...opts,
    },
  );
};

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

  // An emptied-out tag directory survives `sdkmanager --uninstall`, so the
  // presence of system-images/android-36/google_apis/ proves nothing. Only an
  // abi directory holding a system.img is a real image.
  for (const api of readdirSync(base)) {
    for (const tag of readdirSync(join(base, api))) {
      const tagDir = join(base, api, tag);
      if (!statSync(tagDir).isDirectory()) continue;
      for (const abi of readdirSync(tagDir)) {
        if (existsSync(join(tagDir, abi, 'system.img'))) {
          return `system-images;${api};${tag};${abi}`;
        }
      }
    }
  }
  console.error(`No system image installed under ${base}.`);
  console.error('Install one (about 1.5GB):');
  console.error('  sdkmanager "system-images;android-36;google_apis;x86_64"');
  process.exit(1);
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
  // -dns-server is not optional here. The emulator inherits the host resolver by
  // default and on this machine that silently stops resolving, which the app
  // reports as "No connection" while ping to a bare IP still succeeds - so the
  // network looks fine and every search returns nothing.
  const proc = spawn(EMULATOR, [
    '-avd', AVD_NAME, '-no-boot-anim', '-no-snapshot-save',
    '-dns-server', '8.8.8.8,8.8.4.4',
  ], {
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
  // sysui_demo_allowed has to be set first — without it SystemUI drops every
  // demo broadcast on the floor and the status bar just never changes.
  try { adbShell('settings put global sysui_demo_allowed 1'); } catch {}
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

/**
 * Centre of a labelled node, optionally restricted to a band of the screen.
 *
 * Status names are ambiguous: "Bounced" is a filter chip at the top AND the
 * status label printed under every matching row. Taking the first match tapped
 * the row and opened a detail screen, stranding the take there. maxY keeps chip
 * taps in the header.
 */
function centreOfIn(xml, label, { maxY = Infinity, minY = 0 } = {}) {
  // Whole nodes, then both attributes checked inside each one. An alternation
  // like (?:text|content-desc)="([^"]*)" captures whichever comes FIRST and the
  // global match then skips past the other - so a node carrying text="" and
  // content-desc="Remove from pile" only ever reported the empty text, and the
  // button read as missing while sitting in plain view in the dump.
  for (const node of xml.match(/<node\b[^>]*>/g) ?? []) {
    const bounds = node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!bounds) continue;

    const labels = [
      node.match(/\stext="([^"]*)"/)?.[1],
      node.match(/\scontent-desc="([^"]*)"/)?.[1],
    ];
    if (!labels.includes(label)) continue;

    const cy = Math.round((Number(bounds[2]) + Number(bounds[4])) / 2);
    if (cy >= minY && cy <= maxY) {
      return [Math.round((Number(bounds[1]) + Number(bounds[3])) / 2), cy];
    }
  }
  return null;
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

/** Every text node with its bounds. */
function nodes(xml) {
  return [...xml.matchAll(/<node[^>]*text="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)]
    .map((m) => ({
      text: m[1],
      cx: Math.round((+m[2] + +m[4]) / 2),
      cy: Math.round((+m[3] + +m[5]) / 2),
    }));
}

/**
 * The Add button belonging to one specific search result.
 *
 * Every row in the results list has its own "Add", so tapping the first node
 * whose text is "Add" adds the FIRST result regardless of which title was
 * tapped - which on camera means the wrong game lands in the pile. The capture
 * screen also shows the cleaned query as a header whose text usually equals the
 * game title, so the first node matching the title is often that header, which
 * owns no button. Try every candidate and take the one with a button beside it.
 */
function addButtonFor(xml, title) {
  const all = nodes(xml);
  const adds = all.filter((n) => n.text === 'Add');
  if (adds.length === 0) return null;

  for (const target of all.filter((n) => n.text === title)) {
    const nearest = adds
      .slice()
      .sort((a, b) => Math.abs(a.cy - target.cy) - Math.abs(b.cy - target.cy))[0];
    if (Math.abs(nearest.cy - target.cy) <= 220) return [nearest.cx, nearest.cy];
  }
  return null;
}

async function addExact(title, attempts = 8) {
  for (let i = 0; i < attempts; i += 1) {
    const pt = addButtonFor(uiDump(), title);
    if (pt) {
      adbShell(`input tap ${pt[0]} ${pt[1]}`);
      return true;
    }
    await sleep(800);
  }
  console.error(`
  Could not find an Add button for "${title}".`);
  return false;
}

/**
 * Clears whatever system dialog is in the way.
 *
 * Permission prompts and chooser confirmations belong to other processes and
 * sit on top of the app, swallowing taps meant for it. Opening a browser raises
 * YouTube's notification prompt, which is how the first take lost its share
 * sheet entirely.
 */
function dismissDialog() {
  const xml = uiDump();
  for (const label of ['Allow', 'Just once', 'OK', 'Continue', 'Not now', 'No thanks']) {
    const pt = centreOf(xml, label);
    if (pt) {
      adbShell(`input tap ${pt[0]} ${pt[1]}`);
      return label;
    }
  }
  return null;
}

async function tapText(label, { attempts = 6, maxY = Infinity, minY = 0 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const xml = uiDump();
    const pt = centreOfIn(xml, label, { maxY, minY });
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

async function runAction(action, deadline = Infinity) {
  // Every retry loop below is capped by the scene's own deadline. Without that,
  // a tap that cannot find its target burns thirty seconds of a fifteen-second
  // scene and every later scene drifts out of sync with its narration - which
  // is exactly how the first take ended up 171s into a 113s recording.
  const budget = () => Math.max(0, deadline - Date.now());

  if (action.wait) return sleep(Math.min(action.wait, budget()));
  if (action.shell) return void adbShell(action.shell);
  if (action.dismiss) return void dismissDialog();
  if (action.tapXY) return void adbShell(`input tap ${action.tapXY[0]} ${action.tapXY[1]}`);
  if (action.swipe) return void adbShell(`input swipe ${action.swipe.join(' ')}`);
  if (action.removeIfPresent) {
    // The take adds this game on camera, so a previous take's copy has to go
    // first - otherwise the capture screen offers "Already in your pile" and
    // there is no Add button for scene 2 to press.
    adbShell(`am force-stop ${APP_ID}`);
    await sleep(1_500);
    adbShell(`am start -n ${APP_ID}/.MainActivity`);
    await sleep(3_500);
    if (centreOf(uiDump(), action.removeIfPresent)) {
      console.log(`  removing ${action.removeIfPresent} left by an earlier take`);
      if (await tapText(action.removeIfPresent, { attempts: 4 })) {
        await sleep(2_500);
        await tapText('Remove from pile', { attempts: 4 });
        await sleep(2_000);
      }
    }
    adbShell(`am force-stop ${APP_ID}`);
    await sleep(1_000);
    return;
  }
  if (action.tapAny) {
    for (let i = 0; i < 6 && budget() > 0; i += 1) {
      const xml = uiDump();
      for (const label of action.tapAny) {
        const pt = centreOf(xml, label);
        if (pt) {
          adbShell(`input tap ${pt[0]} ${pt[1]}`);
          return;
        }
      }
      if (dismissDialog()) {
        await sleep(900);
        continue;
      }
      await sleep(700);
    }
    if (!action.optional) {
      console.error(`  could not tap any of: ${action.tapAny.join(' / ')}`);
    }
    return;
  }
  if (action.add) {
    const ok = await addExact(action.add);
    if (!ok) console.error('  (continuing — the take will need a retry)');
    return;
  }
  if (action.tap) {
    const ok = await tapText(action.tap, { maxY: action.maxY ?? Infinity, minY: action.minY ?? 0 });
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

  if (SETUP.length) {
    console.log('Setup (before recording starts) …');
    for (const action of SETUP) await runAction(action);
  }

  // One clip per scene, not one long take.
  //
  // screenrecord on this emulator stops at about 87 seconds no matter what
  // --time-limit says, and it reports success when it does - so a 114s take
  // silently came back missing its last three scenes while every scene in the
  // log read as fine. Per-scene clips stay far under that ceiling, and they
  // remove the alignment problem entirely: each clip IS its scene, so the
  // narration cannot drift out of sync with the footage no matter how the
  // device behaves. Each clip is also short enough to re-shoot on its own.
  console.log('Recording one clip per scene …\n');

  const markers = [];
  const started = Date.now();
  for (const [i, scene] of SCENES.entries()) {
    const at = Date.now() - started;
    console.log(`  ${String(at / 1000).padStart(6)}s  ${scene.id}  ${scene.title}`);

    const holdSec = Math.ceil(holds[i] / 1000) + 2;
    const remote = `/sdcard/scene-${scene.id}.mp4`;
    adbShell(`rm -f ${remote}`);
    const rec = spawn(ADB, [
      'shell', 'screenrecord',
      '--size', '720x1600',
      '--bit-rate', '8M',
      '--time-limit', String(holdSec),
      remote,
    ], { stdio: 'ignore' });
    await sleep(900); // let the encoder come up before anything moves

    const sceneEnd = Date.now() + holds[i];
    for (const action of scene.actions) {
      if (Date.now() >= sceneEnd) {
        console.log('        (scene budget spent - remaining actions skipped)');
        break;
      }
      await runAction(action, sceneEnd);
    }
    const left = sceneEnd - Date.now();
    if (left > 0) await sleep(left);

    await new Promise((r) => rec.on('exit', r));
    await sleep(1_500); // let the file finalise on device

    const local = join(WORK, `scene-${scene.id}.mp4`);
    adb('pull', remote, local);

    // Starting and stopping screenrecord back to back sometimes leaves the
    // virtual display busy, and the next scene gets a ~60KB stub with no
    // playable stream. It exits successfully either way, so the only way to
    // notice is to look at what came back.
    const size = Number(adbShell(`stat -c %s ${remote} 2>/dev/null || echo 0`).trim()) || 0;
    if (size < 200_000) {
      console.log(`        clip came back as a ${size}B stub - re-shooting this scene`);
      adbShell(`rm -f ${remote}`);
      await sleep(3_000);
      const retry = spawn(ADB, [
        'shell', 'screenrecord', '--size', '720x1600', '--bit-rate', '8M',
        '--time-limit', String(holdSec), remote,
      ], { stdio: 'ignore' });
      await sleep(Math.min(holds[i], 12_000));
      await new Promise((r) => retry.on('exit', r));
      await sleep(1_500);
      adb('pull', remote, local);
    }

    markers.push({ id: scene.id, title: scene.title, holdMs: holds[i], file: `scene-${scene.id}.mp4` });
    await sleep(1_200); // let the encoder release before the next scene
  }

  writeFileSync(
    join(WORK, 'markers.json'),
    `${JSON.stringify({ startedAt: started, perScene: true, markers }, null, 2)}\n`,
  );

  console.log(`\nClips:   ${markers.length} in ${WORK}`);
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
