// Muxes the narration over the emulator take and encodes the final upload.
//
//   node scripts/narrate.mjs        # 1. voice
//   node scripts/record-demo.mjs    # 2. footage, paced to the voice
//   node scripts/compose-demo.mjs   # 3. this -> docs/video/backlogue-demo.mp4
//
// Each scene's mp3 is delayed to the marker record-demo.mjs wrote for that
// scene, then all of them are mixed onto one track. Nothing is re-timed here:
// if a line lands late, fix the scene's minMs and re-record rather than nudging
// offsets, or the two files stop describing the same video.
//
// Flags:
//   --preview   fast encode, for checking sync before committing to a slow one
//   --no-music  omit the bed even if one exists (default is to use it if found)
//
// A music bed is optional and OFF unless docs/video/music.mp3 exists. The rules
// are explicit that the video "must not include third-party trademarks or
// copyrighted music/material unless you have permission to use it", so anything
// dropped there has to be licensed or original. Narration alone is fine.

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIDEO_DIR = resolve(ROOT, 'docs', 'video');
const WORK = join(VIDEO_DIR, '_work');
const TAKE = join(WORK, 'take.mp4');
const MARKERS = join(WORK, 'markers.json');
const NARRATION = join(VIDEO_DIR, 'narration');
const MUSIC = join(VIDEO_DIR, 'music.mp3');
const OUT = join(VIDEO_DIR, 'backlogue-demo.mp4');

const has = (f) => process.argv.includes(f);

function fail(msg) {
  console.error(`\n${msg}`);
  process.exit(1);
}

if (!existsSync(TAKE)) fail(`No take at ${TAKE}\n  node scripts/record-demo.mjs`);
if (!existsSync(MARKERS)) fail(`No markers at ${MARKERS}\n  node scripts/record-demo.mjs`);

const { markers } = JSON.parse(readFileSync(MARKERS, 'utf8'));

const clips = markers
  .map((m) => ({ ...m, file: join(NARRATION, `${m.id}.mp3`) }))
  .filter((m) => {
    if (existsSync(m.file)) return true;
    console.warn(`  no narration for ${m.id} — that scene will play silent`);
    return false;
  });

if (clips.length === 0) fail('No narration clips found.\n  node scripts/narrate.mjs');

// --- build the filter graph ------------------------------------------------

const inputs = ['-i', TAKE, ...clips.flatMap((c) => ['-i', c.file])];
const parts = [];
const mixLabels = [];

clips.forEach((c, i) => {
  const src = i + 1; // input 0 is the video
  // adelay wants one value per channel; the mp3s are mono or stereo, and
  // `all=1` applies the delay to every channel without having to know which.
  parts.push(`[${src}:a]adelay=${c.atMs}:all=1[n${i}]`);
  mixLabels.push(`[n${i}]`);
});

let audioOut = '[voice]';
parts.push(
  `${mixLabels.join('')}amix=inputs=${clips.length}:normalize=0:dropout_transition=0[voice]`,
);

const useMusic = existsSync(MUSIC) && !has('--no-music');
if (useMusic) {
  inputs.push('-i', MUSIC);
  const musicIdx = clips.length + 1;
  // Duck the bed well under the voice, and fade it out at the end.
  parts.push(`[${musicIdx}:a]volume=0.12,afade=t=out:st=100:d=6[bed]`);
  parts.push('[voice][bed]amix=inputs=2:normalize=0:duration=first[mixed]');
  audioOut = '[mixed]';
}

// Loudness normalise so the upload does not arrive quiet; -16 LUFS is the
// level YouTube targets, so normalising here avoids YouTube doing it for us.
parts.push(`${audioOut}loudnorm=I=-16:TP=-1.5:LRA=11[aout]`);

const preview = has('--preview');
const args = [
  '-y',
  ...inputs,
  '-filter_complex', parts.join(';'),
  '-map', '0:v',
  '-map', '[aout]',
  '-c:v', 'libx264',
  '-preset', preview ? 'veryfast' : 'slow',
  '-crf', preview ? '28' : '19',
  '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-shortest',
  OUT,
];

mkdirSync(VIDEO_DIR, { recursive: true });

console.log(`Composing ${clips.length} narration clips over the take …`);
for (const c of clips) {
  console.log(`  ${String(c.atMs / 1000).padStart(6)}s  ${c.id}`);
}
if (useMusic) console.log('  + music bed (docs/video/music.mp3)');

try {
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' });
} catch (err) {
  console.error(err.stderr?.split('\n').slice(-25).join('\n') ?? err.message);
  fail('ffmpeg failed.');
}

const probe = execFileSync(
  'ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'default=nw=1', OUT],
  { encoding: 'utf8' },
);
const seconds = Number(probe.match(/duration=([\d.]+)/)?.[1] ?? 0);

console.log(`\n${OUT}`);
console.log(`  ${seconds.toFixed(1)}s`);

if (seconds > 120) {
  console.log('\n  WARNING: over two minutes. The rules cap essential footage at 2:00 and');
  console.log('  say judges are not required to watch past it. Trim a scene.');
} else {
  console.log('  Within the two-minute cap.');
}

console.log('\nBefore uploading, watch it once for:');
console.log('  - the share sheet actually appearing in the first 15 seconds');
console.log('  - narration not overrunning into the next scene');
console.log('  - "IGN" pronounced as letters, not as a word');
console.log('\nThen: upload to YouTube as PUBLIC or UNLISTED-but-playable, and put the');
console.log('URL in the Devpost draft (docs/devpost-submission.md).');
