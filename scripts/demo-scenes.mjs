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
export const SHARE_TEXT =
  'Hollow Knight: Silksong - Official Launch Trailer https://www.youtube.com/watch?v=pFBtc9NvSjc';

/** The result to pick out of the search hits. Exact text, so the two other
 *  Silksong entries IGDB returns ("Hollow Knight Silksong", "... Sea of
 *  Sorrow") are not matched by accident. */
export const SHARE_PICK = 'Hollow Knight: Silksong';

/**
 * Scenes, in order.
 *
 * `narration` is what gets spoken. `minMs` is a floor, used when the line is
 * short but the action on screen needs longer — the actual hold is
 * max(minMs, narrationDuration + tailMs).
 *
 * `actions` run against the emulator via adb. Each is one of:
 *   {tap: 'Text'}      find that text with uiautomator and tap its centre
 *   {tapAny: [...]}    tap the first of these labels that is on screen
 *   {dismiss: true}    clear any system permission / chooser dialog
 *   {add: 'Title'}     tap the Add button belonging to that search result
 *   {tapXY: [x, y]}    absolute tap, for things with no accessible text
 *   {swipe: [x1,y1,x2,y2,ms]}
 *   {shell: '...'}     raw adb shell command
 *   {wait: ms}
 *   {manual: '...'}    pause and ask the operator to do it by hand
 */
/**
 * Run before the recording starts, never inside it.
 *
 * Opening a browser takes several seconds and can raise YouTube's own
 * notification prompt - both of which used to happen inside scene 1's budget,
 * pushing every later scene out of sync with its narration.
 */
export const SETUP = [
  { removeIfPresent: SHARE_PICK },
  { removeIfPresent: 'Hollow Knight Silksong' },
  // Warm the cover-art cache. On a freshly booted emulator Coil has nothing in
  // memory and the pile records as a column of gradient placeholders, which is
  // the one thing this app is least willing to look like.
  { shell: `am start -n ${MAIN}` },
  { wait: 4_000 },
  { swipe: [540, 1800, 540, 700, 600] },
  { wait: 3_000 },
  { swipe: [540, 700, 540, 1800, 600] },
  { wait: 4_000 },
  { shell: `am force-stop ${APP_ID}` },
  { wait: 1_000 },
  { shell: 'am force-stop com.android.chrome' },
  { shell: 'am start -a android.intent.action.VIEW -d "https://www.youtube.com/watch?v=6XGeJwsUP9c"' },
  { wait: 9_000 },
  { dismiss: true },
  { wait: 2_000 },
  { dismiss: true },
  { wait: 1_000 },
];

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
      { wait: 3_000 },
      // The real system chooser, not our activity directly. This is the shot the
      // whole submission rests on, so it has to be Android's own sheet.
      {
        shell:
          'am start -a android.intent.action.SEND -t text/plain ' +
          `--es android.intent.extra.TEXT ${JSON.stringify(SHARE_TEXT)}`,
      },
      { wait: 3_000 },
      // The sheet reads "Share with Backlogue" and confirms with Just once /
      // Always. Never Always: a default would stop the sheet appearing at all,
      // and the sheet is the shot.
      { tapAny: ['Just once', 'Share with Backlogue'] },
    ],
  },
  {
    id: '02-landed',
    title: 'It landed, and it remembers where from',
    narration:
      "One tap, and it's saved, without leaving what you were watching. " +
      'And it remembers where you found it. From a YouTube video.',
    minMs: 15_000,
    actions: [
      { shell: 'am force-stop com.android.chrome' },
      // {add:} not {tap:} - every result row has its own Add button, so tapping
      // the first one adds whatever IGDB happened to rank first.
      { add: SHARE_PICK },
      { wait: 3_000 },
      // CaptureActivity has no finish() after an add - it stays open showing
      // "Already in your pile" so you can add a second game from one share.
      // A real user backs out here, so the take does too.
      { shell: 'input keyevent KEYCODE_BACK' },
      { wait: 1_000 },
      { shell: `am start -n ${MAIN}` },
      { wait: 3_000 },
    ],
  },
  {
    id: '03-parser',
    title: 'The parser',
    narration:
      'That share was titled "Hollow Knight Silksong, official launch trailer". ' +
      'The hard part of this app is a text parser that strips the hype and the ' +
      'channel name and keeps the title. When it is not sure, it says so and ' +
      'opens a search box instead of guessing.',
    minMs: 14_000,
    actions: [
      { tap: SHARE_PICK },
      { wait: 4_000 },
      { shell: 'input keyevent KEYCODE_BACK' },
      { wait: 1_500 },
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
      { swipe: [540, 1800, 540, 900, 700] },
      { wait: 1_200 },
      // The chip row scrolls horizontally and only reaches Beaten at this
      // width - Bounced sits off the right edge, so it has to be scrolled into
      // view before it can be tapped. The chips sit at y ~366.
      { swipe: [900, 366, 240, 366, 500] },
      { wait: 1_200 },
      // maxY keeps this on the filter chip. "Bounced" is also printed under
      // every bounced game, and tapping that opens the game instead.
      { tap: 'Bounced', maxY: 620 },
      { wait: 2_500 },
      { swipe: [240, 366, 900, 366, 500] },
      { wait: 1_000 },
      { tap: 'All', maxY: 620 },
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
    // A wishlisted game with no date is the thing the sweep is watching for, so
    // the detail screen is the honest illustration. Firing a real push mid-take
    // would need the OneSignal REST key on this machine, and a notification
    // shade sliding over the app is a worse shot than the game it is about.
    actions: [
      { tap: 'Blue Prince' },
      { wait: 5_000 },
      { shell: 'input keyevent KEYCODE_BACK' },
      { wait: 1_500 },
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
    // Ends on the paywall and the Pro state behind it. The free-tier argument
    // and the paywall's own design are what this scene sells; a store sheet is
    // the least interesting thing that could be on screen here.
    actions: [
      // Let scene 5's back-navigation finish. Under the load of screenrecord
      // the pile can be dumped while the detail screen is still animating out,
      // and a tap issued then is swallowed by the transition - the tap reports
      // success, the sheet never opens, and nothing in the log says so.
      { wait: 2_500 },
      // The Pro badge in the pile header. Until this existed the paywall could
      // only be reached by owning thirty games and trying to add a thirty-first,
      // which meant no reviewer or judge could ever see it.
      { tap: 'Pro', maxY: 620 },
      { wait: 6_000 },
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
