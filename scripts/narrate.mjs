// Renders the demo narration to audio with ElevenLabs, one mp3 per scene, and
// measures each one so the video can be paced to the voice rather than guessed.
//
// Run this FIRST — record-demo.mjs reads the timings this writes.
//
//   node scripts/narrate.mjs                 # render every scene
//   node scripts/narrate.mjs --voices        # list the voices on the account
//   node scripts/narrate.mjs 03-parser       # re-render one scene after an edit
//
// Output: docs/video/narration/<scene>.mp3 + docs/video/narration-timing.json
//
// ---------------------------------------------------------------------------
// Credentials. Never committed, matching ../_android and ../_revenuecat:
//   1. ELEVENLABS_API_KEY
//   2. ../_elevenlabs/backlogue.env   (KEY=value lines)
//
// Voice: ELEVENLABS_VOICE takes a name or a voice id. Unset, it takes the best
// young female narration voice the account actually has. Voice ids are not
// stable across accounts, and hardcoding one is how this script would fail on
// someone else's machine with a 404 that explains nothing.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { SCENES } from './demo-scenes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'docs', 'video', 'narration');
const TIMING = resolve(ROOT, 'docs', 'video', 'narration-timing.json');

const API = 'https://api.elevenlabs.io/v1';

// Preferred narration voices, best first, matched by NAME PREFIX. Library
// names carry a descriptor ("Riley - Engaging Young Female Voice"), so an
// exact-equality match finds none of them. Falls back to ranking by label.
const PREFERRED = ['Cherie', 'Riley', 'Danielle', 'Sarah', 'Jessica', 'Laura'];

// For a product demo, a narration or advertisement voice beats a conversational
// one, which beats a social-media one.
const USE_CASE_RANK = ['narrative_story', 'advertisement', 'entertainment_tv', 'conversational', 'social_media'];

// eleven_multilingual_v2 is the quality model; the turbo variants are for
// latency, which a batch of eight offline clips does not care about.
const MODEL_ID = process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2';

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;

  const envFile = resolve(ROOT, '..', '_elevenlabs', 'backlogue.env');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?ELEVENLABS_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '');
    }
  }

  console.error('No ElevenLabs API key.');
  console.error('  set ELEVENLABS_API_KEY, or put it in ../_elevenlabs/backlogue.env');
  process.exit(1);
}

async function listVoices(key) {
  const res = await fetch(`${API}/voices`, { headers: { 'xi-api-key': key } });
  if (!res.ok) {
    throw new Error(`GET /voices failed - ${res.status} ${await res.text()}`);
  }
  const { voices } = await res.json();
  return voices ?? [];
}

const labelsOf = (v) => Object.values(v.labels ?? {}).map((x) => String(x).toLowerCase());

/** Young + female is a hard filter; use case breaks the tie. -1 means unusable. */
function scoreVoice(v) {
  const labels = labelsOf(v);
  if (!labels.includes('female') || !labels.includes('young')) return -1;
  const rank = USE_CASE_RANK.findIndex((u) => labels.includes(u));
  return 100 - (rank === -1 ? USE_CASE_RANK.length : rank);
}

function findByName(voices, wanted) {
  const norm = wanted.toLowerCase();
  return (
    voices.find((v) => v.voice_id === wanted)
    ?? voices.find((v) => v.name?.toLowerCase() === norm)
    ?? voices.find((v) => v.name?.toLowerCase().startsWith(norm))
    ?? voices.find((v) => v.name?.toLowerCase().includes(norm))
  );
}

function pickVoice(voices, wanted) {
  if (wanted) {
    const hit = findByName(voices, wanted);
    if (hit) return hit;
    // An id for a voice outside the account library still works with the TTS
    // endpoint, so pass it through rather than refusing.
    if (/^[A-Za-z0-9]{20,}$/.test(wanted)) return { voice_id: wanted, name: `(id ${wanted})` };
    console.error(`No voice named or id'd "${wanted}" on this account.`);
    console.error('Run: node scripts/narrate.mjs --voices');
    process.exit(1);
  }

  for (const name of PREFERRED) {
    const hit = findByName(voices, name);
    if (hit && scoreVoice(hit) > 0) return hit;
  }

  const ranked = voices
    .map((v) => [scoreVoice(v), v])
    .filter(([n]) => n > 0)
    .sort((a, b) => b[0] - a[0]);
  if (ranked.length) return ranked[0][1];

  console.error('No young female voice on this account. Pick one explicitly:');
  console.error('  node scripts/narrate.mjs --voices');
  process.exit(1);
}

async function speak(key, voiceId, text, outPath) {
  const res = await fetch(`${API}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      // Stability low-ish and style at 0 keeps narration even rather than
      // performed; a demo voiceover that emotes fights the footage.
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
    }),
  });

  if (!res.ok) {
    throw new Error(`TTS failed for ${outPath} — ${res.status} ${await res.text()}`);
  }
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
}

/** Duration in ms, via ffprobe. */
function durationMs(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
    { encoding: 'utf8' },
  );
  return Math.round(parseFloat(out.trim()) * 1000);
}

async function main() {
  const key = apiKey();
  const args = process.argv.slice(2);

  if (args.includes('--voices')) {
    const voices = await listVoices(key);
    console.log(`${voices.length} voices on this account:\n`);
    for (const v of voices) {
      const labels = Object.values(v.labels ?? {}).join(', ');
      console.log(`  ${v.name.padEnd(18)} ${v.voice_id}  ${labels}`);
    }
    return;
  }

  const only = args.find((a) => !a.startsWith('--'));
  const voices = await listVoices(key);
  const voice = pickVoice(voices, process.env.ELEVENLABS_VOICE);

  console.log(`Voice: ${voice.name} (${voice.voice_id})`);
  if (voice.labels) console.log(`       ${Object.values(voice.labels).join(', ')}`);
  console.log(`Model: ${MODEL_ID}\n`);

  mkdirSync(OUT_DIR, { recursive: true });

  const timing = existsSync(TIMING) ? JSON.parse(readFileSync(TIMING, 'utf8')) : {};
  const scenes = only ? SCENES.filter((s) => s.id === only) : SCENES;
  if (only && scenes.length === 0) {
    console.error(`No scene "${only}". Known: ${SCENES.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  let words = 0;
  for (const scene of scenes) {
    const out = resolve(OUT_DIR, `${scene.id}.mp3`);
    process.stdout.write(`  ${scene.id} … `);
    await speak(key, voice.voice_id, scene.narration, out);
    const ms = durationMs(out);
    timing[scene.id] = { ms, words: scene.narration.split(/\s+/).length };
    words += timing[scene.id].words;
    console.log(`${(ms / 1000).toFixed(1)}s`);
  }

  timing._voice = { name: voice.name, id: voice.voice_id, model: MODEL_ID };
  writeFileSync(TIMING, `${JSON.stringify(timing, null, 2)}\n`);

  const spoken = SCENES.reduce((n, s) => n + (timing[s.id]?.ms ?? 0), 0);
  console.log(`\nNarration total: ${(spoken / 1000).toFixed(1)}s across ${SCENES.length} scenes`);
  if (only) console.log(`(${words} words re-rendered; totals include cached scenes)`);

  // The rules cap *essential footage* at two minutes and say judges are not
  // required to watch past it. Narration alone running over is a hard fail.
  if (spoken > 115_000) {
    console.log(`\n  WARNING: narration is ${(spoken / 1000).toFixed(1)}s. Trim before recording —`);
    console.log('  the hackathon caps the video at 2 minutes of essential footage.');
  }

  console.log('\nNext: node scripts/record-demo.mjs');
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
