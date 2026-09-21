// Joins the per-scene clips and their narration into the upload.
//
//   node scripts/narrate.mjs        # 1. voice
//   node scripts/record-demo.mjs    # 2. one clip per scene, paced to the voice
//   node scripts/compose-demo.mjs   # 3. this -> docs/video/backlogue-demo.mp4
//
// Each scene is built independently and the scenes are concatenated, so audio
// and video cannot drift: scene N's narration plays over scene N's footage by
// construction rather than by landing on a computed offset.
//
// That is the whole reason for per-scene clips. A single long take needs every
// line placed at a wall-clock offset, and this emulator's screenrecord stops at
// about 87 seconds while reporting success - so a 114s take came back missing
// its last three scenes with nothing in the log to say so, and every narration
// line after the truncation played over the wrong picture.
//
// Flags:
//   --preview   fast encode, for checking sync before a slow one
//   --no-music  omit the bed even if one exists (default is to use it if found)
//
// A music bed is optional and OFF unless docs/video/music.mp3 exists. The rules
// are explicit that the video "must not include third-party trademarks or
// copyrighted music/material unless you have permission to use it", so anything
// dropped there has to be licensed or original. Narration alone is fine.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_DIR = resolve(ROOT, 'docs', 'video');
const WORK = join(VIDEO_DIR, '_work');
const MARKERS = join(WORK, 'markers.json');
const NARRATION = join(VIDEO_DIR, 'narration');
const MUSIC = join(VIDEO_DIR, 'music.mp3');
const OUT = join(VIDEO_DIR, 'backlogue-demo.mp4');

const has = (f) => process.argv.includes(f);
const preview = has('--preview');

function fail(msg) {
  console.error(`\n${msg}`);
  process.exit(1);
}

function ffmpeg(args) {
  try {
    execFileSync('ffmpeg', ['-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
  } catch (err) {
    console.error(err.stderr?.split('\n').slice(-20).join('\n') ?? err.message);
    fail('ffmpeg failed.');
  }
}

function durationOf(file) {
  return Number(
    execFileSync('ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { encoding: 'utf8' }).trim(),
  );
}

if (!existsSync(MARKERS)) fail(`No markers at ${MARKERS}\n  node scripts/record-demo.mjs`);
const { markers, perScene } = JSON.parse(readFileSync(MARKERS, 'utf8'));
if (!perScene) {
  fail('These markers are from the old single-take recorder.\n  node scripts/record-demo.mjs');
}

mkdirSync(VIDEO_DIR, { recursive: true });

// --- build each scene on its own -------------------------------------------

const built = [];
console.log(`Building ${markers.length} scenes …\n`);

for (const m of markers) {
  const clip = join(WORK, m.file);
  if (!existsSync(clip)) fail(`Missing clip ${clip}\n  node scripts/record-demo.mjs`);

  const voice = join(NARRATION, `${m.id}.mp3`);
  const hasVoice = existsSync(voice);
  if (!hasVoice) console.warn(`  ${m.id}: no narration, scene plays silent`);

  // The scene lasts as long as its narration needs, with the recorded hold as
  // a floor. Clips come back a little short of their hold because the encoder
  // starts late, so the last frame is held rather than cutting early.
  const clipSeconds = durationOf(clip);
  const voiceSeconds = hasVoice ? durationOf(voice) : 0;
  const seconds = Math.max(m.holdMs / 1000, voiceSeconds + 0.6);

  if (!(clipSeconds > 0.5)) {
    fail(`${m.file} is ${clipSeconds || 0}s - screenrecord produced a stub.\n`
      + '  Re-record: node scripts/record-demo.mjs --no-install --keep');
  }

  // The emulator's encoder runs behind real time, so a clip holds all of its
  // scene's action in about three quarters of the wall-clock duration. Stretched
  // per scene rather than across the whole video: each clip IS one scene, so
  // scaling it to that scene's length restores real-time pacing without any
  // error carrying into the next scene.
  const factor = seconds / clipSeconds;
  const out = join(WORK, `built-${m.id}.mp4`);
  const filters = [
    `[0:v]scale=720:1600:force_original_aspect_ratio=decrease,`
      + `pad=720:1600:(ow-iw)/2:(oh-ih)/2,setsar=1,`
      + `setpts=PTS*${factor.toFixed(6)},fps=30,`
      + `tpad=stop_mode=clone:stop_duration=${seconds.toFixed(3)},`
      + `trim=0:${seconds.toFixed(3)},setpts=PTS-STARTPTS[v]`,
  ];

  const inputs = ['-i', clip];
  if (hasVoice) {
    inputs.push('-i', voice);
    // Pad the voice out to the full scene so every scene's audio and video are
    // exactly the same length; concat demands that.
    filters.push(`[1:a]aresample=48000,apad,atrim=0:${seconds.toFixed(3)},asetpts=PTS-STARTPTS[a]`);
  } else {
    inputs.push('-f', 'lavfi', '-t', seconds.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo');
    filters.push('[1:a]asetpts=PTS-STARTPTS[a]');
  }

  ffmpeg([
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'medium', '-crf', preview ? '28' : '20',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    out,
  ]);

  console.log(
    `  ${m.id.padEnd(18)} clip ${clipSeconds.toFixed(1)}s  voice ${voiceSeconds.toFixed(1)}s`
      + `  -> ${seconds.toFixed(1)}s`,
  );
  built.push(out);
}

// --- concatenate ------------------------------------------------------------

const listFile = join(WORK, 'concat.txt');
writeFileSync(listFile, `${built.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n')}\n`);

const joined = join(WORK, 'joined.mp4');
ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', joined]);

// --- music bed and loudness -------------------------------------------------

const useMusic = existsSync(MUSIC) && !has('--no-music');
const total = durationOf(joined);

if (useMusic) {
  ffmpeg([
    '-i', joined, '-i', MUSIC,
    '-filter_complex',
    `[1:a]volume=0.12,afade=t=out:st=${Math.max(0, total - 6).toFixed(1)}:d=6[bed];`
      + '[0:a][bed]amix=inputs=2:normalize=0:duration=first[m];'
      + '[m]loudnorm=I=-16:TP=-1.5:LRA=11[aout]',
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    OUT,
  ]);
} else {
  // -16 LUFS is what YouTube targets; normalising here means YouTube does not.
  ffmpeg([
    '-i', joined,
    '-filter_complex', '[0:a]loudnorm=I=-16:TP=-1.5:LRA=11[aout]',
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    OUT,
  ]);
}

const seconds = durationOf(OUT);
console.log(`\n${OUT}`);
console.log(`  ${seconds.toFixed(1)}s`);
if (useMusic) console.log('  + music bed (docs/video/music.mp3)');

if (seconds > 120) {
  console.log('\n  WARNING: over two minutes. The rules cap essential footage at 2:00 and');
  console.log('  say judges are not required to watch past it. Trim a scene.');
} else {
  console.log('  Within the two-minute cap.');
}

console.log('\nBefore uploading, watch it once for:');
console.log('  - the share sheet actually appearing in the first 15 seconds');
console.log('  - the paywall appearing in the Pro scene');
console.log('  - "Silksong" and "IGDB" pronounced sensibly');
console.log('\nThen: upload to YouTube as PUBLIC or UNLISTED-but-playable, and put the');
console.log('URL in the Devpost draft (docs/devpost-submission.md).');
