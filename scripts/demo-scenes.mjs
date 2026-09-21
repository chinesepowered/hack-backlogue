// The demo video, as data. Single source of truth for all three stages of the
// pipeline, which have to agree on scene names, order and timing:
//
//   1. narrate.mjs       text  -> mp3 per scene, and measures each one
//   2. record-demo.mjs   drives the emulator, holding each scene for as long as
//                        its narration actually runs, and records one take
//   3. compose-demo.mjs  muxes the narration over the take
//
// Narration is rendered FIRST and the video is paced to it, not the other way
// round. Writing timings by hand and hoping the voice fits is how demo videos
// end up with a sentence still playing over the next scene.
//
// This is shared rather than inlined — unlike the play-*.mjs scripts, which are
// deliberately self-contained so they can be copied between app repos. These
// three are one pipeline for one video and are meaningless apart.
//
// The human-readable version, with the reasoning behind the running order, is
// docs/video-script.md. Edit the narration here; that file describes it.

export const APP_ID = 'com.chinesepowered.backlogue';
export const MAIN = `${APP_ID}/.MainActivity`;
export const CAPTURE = `${APP_ID}/.capture.CaptureActivity`;

/**
 * A share the app has to survive. Deliberately the ugly YouTube case rather
 * than a Steam URL: the parser is the interesting part and a clean title
 * demonstrates nothing.
 */
export const SHARE_TEXT = '🔥 SILKSONG IS FINALLY HERE — First 3 Hours | IGN';

/**
 * Scenes, in order.
 *
 * `narration` is what gets spoken. `minMs` is a floor, used when the line is
 * short but the action on screen needs longer — the actual hold is
 * max(minMs, narrationDuration + tailMs).
 *
 * `actions` run against the emulator via adb. Each is one of:
 *   {tap: 'Text'}      find that text with uiautomator and tap its centre
 *   {tapXY: [x, y]}    absolute tap, for things with no accessible text
 *   {swipe: [x1,y1,x2,y2,ms]}
 *   {shell: '...'}     raw adb shell command
 *   {wait: ms}
 *   {manual: '...'}    pause and ask the operator to do it by hand
 */
export const SCENES = [
  {
    id: '01-gesture',
    title: 'The gesture',
    narration:
      "You're three minutes into a review, and something looks good. " +
      'Every other backlog app wants you to leave the video, open the app, ' +
      'and search for the game. So almost nobody does. ' +
      'Backlogue is just a share target.',
    minMs: 13_000,
    actions: [
      // Chrome on a YouTube watch page, so the share has somewhere to come from.
      { shell: 'am start -a android.intent.action.VIEW -d "https://www.youtube.com/watch?v=6XGeJwsUP9c"' },
      { wait: 6_000 },
      // The real system chooser, not our activity directly. This is the shot the
      // whole submission rests on, so it has to be Android's own sheet.
      {
        shell:
          'am start -a android.intent.action.SEND -t text/plain ' +
          `--es android.intent.extra.TEXT ${JSON.stringify(SHARE_TEXT)}`,
      },
      { wait: 2_500 },
      { tap: 'Backlogue' },
    ],
  },
  {
    id: '02-landed',
    title: 'It landed, and it remembers where from',
    narration:
      "One tap, and it's saved, without leaving what you were watching. " +
      'And it remembers where you found it. From a YouTube video.',
    minMs: 10_000,
    actions: [{ wait: 3_000 }],
  },
  {
    id: '03-parser',
    title: 'The parser',
    narration:
      'That share was titled "Silksong is finally here, first three hours, IGN". ' +
      'The hard part of this app is a text parser that strips the hype and keeps ' +
      'the title. When it is not sure, it says so and opens a search box instead ' +
      'of guessing.',
    minMs: 14_000,
    actions: [
      { shell: `am start -n ${MAIN}` },
      { wait: 2_000 },
    ],
  },
  {
    id: '04-genre',
    title: 'Designed against its own genre',
    narration:
      'A backlog is guilt made visible. So there is no completion percentage ' +
      'here. No unplayed counter. No red badges. And a game you did not click ' +
      "with is not Abandoned, it is Bounced. That puts the mismatch on the game, " +
      'not on you.',
    minMs: 14_000,
    actions: [
      { swipe: [590, 1800, 590, 900, 700] },
      { wait: 1_500 },
      { tap: 'Bounced' },
      { wait: 2_000 },
      { tap: 'All' },
    ],
  },
  {
    id: '05-alerts',
    title: 'Alerts that earn their notification',
    narration:
      'For the games with no date yet, a Cloudflare Worker watches the catalogue ' +
      'and pushes through OneSignal. But only when something actually changed. ' +
      'A date appeared. A date moved. Or it is out.',
    minMs: 13_000,
    actions: [
      { manual: 'Open a wishlisted game with no release date, then trigger the test push' },
      { wait: 4_000 },
    ],
  },
  {
    id: '06-pro',
    title: 'Pro, and where the paywall is not',
    narration:
      'Saving, organising and rating thirty games is free, forever. ' +
      'Pro lifts the cap and turns on those alerts. The paywall never appears ' +
      'during a capture, because interrupting those two seconds would break the ' +
      'only thing this app is for.',
    minMs: 16_000,
    actions: [
      { tap: 'Settings' },
      { wait: 1_500 },
      { tap: 'Backlogue Pro' },
      { wait: 4_000 },
    ],
  },
  {
    id: '07-multiplatform',
    title: 'One Kotlin codebase',
    narration:
      'It is one Kotlin codebase. Android and desktop render the same Compose ' +
      'Multiplatform screens, and the shared code links for iOS too.',
    minMs: 11_000,
    // Desktop footage is captured separately and cut in — see docs/video-script.md.
    actions: [{ wait: 2_000 }],
  },
  {
    id: '08-close',
    title: 'Close',
    narration: 'Backlogue. Every game you meant to play.',
    minMs: 6_000,
    actions: [
      { shell: `am start -n ${MAIN}` },
      { wait: 2_000 },
    ],
  },
];

/** Silence left after each narration line before the next scene starts. */
export const TAIL_MS = 600;

export const totalMinMs = () => SCENES.reduce((n, s) => n + s.minMs, 0);
