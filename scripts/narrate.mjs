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
// Voice: ELEVENLABS_VOICE takes a name or a voice id. Unset, it walks
// DEFAULT_VOICES in order and takes the first one the account actually has —
// voice ids are not stable across accounts, and hardcoding one is how this
// script would fail on someone else's machine with a 404 that says nothing.
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

// Young female voices from ElevenLabs' default library, best first. Named
// rather than id'd on purpose — see the header.
const DEFAULT_VOICES = ['Rachel', 'Sarah', 'Laura', 'Bella', 'Elli', 'Alice', 'Lily', 'Matilda'];

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
    throw new Error(`GET /voices failed — ${res.status} ${await res.text()}`);
  }
  const { voices } = await res.json();
  return voices ?? [];
}

function pickVoice(voices, wanted) {
  if (wanted) {
    const byId = voices.find((v) => v.voice_id === wanted);
    if (byId) return byId;
    const byName = voices.find((v) => v.name?.toLowerCase() === wanted.toLowerCase());
    if (byName) return byName;
    // An id for a voice not in the library still works with the TTS endpoint,
    // so pass it through rather than refusing.
    if (/^[A-Za-z0-9]{20,}$/.test(wanted)) return { voice_id: wanted, name: `(id ${wanted})` };
    console.error(`No voice named or id'd "${wanted}" on this account.`);
    console.error('Run: node scripts/narrate.mjs --voices');
    process.exit(1);
  }

  for (const name of DEFAULT_VOICES) {
    const hit = voices.find((v) => v.name?.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
  }
  if (voices.length) return voices[0];

  console.error('The account has no voices at all.');
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
