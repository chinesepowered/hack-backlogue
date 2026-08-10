import { getGame, getGames, RateLimitError, searchGames, type Env, type GameRecord } from './igdb';
import { sendNotification } from './onesignal';

/**
 * Snag's API and alert engine.
 *
 * Two jobs. On request, it is the IGDB proxy that lets the app search without
 * shipping a secret. On a schedule, it walks the set of games players are
 * watching and pushes only when something changed that they could act on.
 */

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  // The app is the only intended consumer, but a permissive CORS header costs
  // nothing here: every endpoint is read-only public catalogue data, and /watch
  // is scoped to a subscription id the caller must already possess.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

const error = (message: string, status: number) => json({ error: message }, status);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: JSON_HEADERS });
    }

    try {
      if (url.pathname === '/v1/health') {
        return json({ ok: true });
      }

      if (url.pathname === '/v1/search' && request.method === 'GET') {
        const term = url.searchParams.get('q') ?? '';
        const limit = Number(url.searchParams.get('limit') ?? '20');
        const games = await searchGames(env, term, Number.isFinite(limit) ? limit : 20);
        return json({ games });
      }

      const gameMatch = url.pathname.match(/^\/v1\/games\/(\d+)$/);
      if (gameMatch && request.method === 'GET') {
        const game = await getGame(env, Number(gameMatch[1]));
        return game ? json(game) : error('Not found', 404);
      }

      if (url.pathname === '/v1/watch' && request.method === 'POST') {
        return await handleWatch(request, env);
      }

      return error('Not found', 404);
    } catch (caught) {
      if (caught instanceof RateLimitError) {
        return error('Rate limited', 429);
      }
      console.error('Unhandled error', caught);
      return error('Internal error', 500);
    }
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runAlertSweep(env));
  },
};

interface WatchBody {
  subscriptionId?: string;
  igdbIds?: number[];
}

/**
 * Registers the games a device wants alerts for.
 *
 * Two KV records are written per call: the device's list (so a re-register
 * replaces cleanly) and a reverse index per game (so the sweep can find
 * watchers without scanning every device).
 */
async function handleWatch(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as WatchBody | null;
  const subscriptionId = body?.subscriptionId?.trim();
  const igdbIds = (body?.igdbIds ?? []).filter((id) => Number.isInteger(id)).slice(0, 500);

  if (!subscriptionId) {
    return error('subscriptionId required', 400);
  }

  const previousRaw = await env.SNAG_KV.get<number[]>(`watch:${subscriptionId}`, 'json');
  const previous = new Set(previousRaw ?? []);
  const next = new Set(igdbIds);

  await env.SNAG_KV.put(`watch:${subscriptionId}`, JSON.stringify(igdbIds));

  const added = [...next].filter((id) => !previous.has(id));
  const removed = [...previous].filter((id) => !next.has(id));

  await Promise.all([
    ...added.map((id) => addWatcher(env, id, subscriptionId)),
    ...removed.map((id) => removeWatcher(env, id, subscriptionId)),
  ]);

  return json({ watching: igdbIds.length });
}

async function addWatcher(env: Env, igdbId: number, subscriptionId: string): Promise<void> {
  const key = `watchers:${igdbId}`;
  const current = (await env.SNAG_KV.get<string[]>(key, 'json')) ?? [];
  if (!current.includes(subscriptionId)) {
    current.push(subscriptionId);
    await env.SNAG_KV.put(key, JSON.stringify(current));
    await addToIndex(env, igdbId);
  }
}

async function removeWatcher(env: Env, igdbId: number, subscriptionId: string): Promise<void> {
  const key = `watchers:${igdbId}`;
  const current = (await env.SNAG_KV.get<string[]>(key, 'json')) ?? [];
  const next = current.filter((id) => id !== subscriptionId);
  if (next.length === 0) {
    await env.SNAG_KV.delete(key);
    await removeFromIndex(env, igdbId);
  } else {
    await env.SNAG_KV.put(key, JSON.stringify(next));
  }
}

const INDEX_KEY = 'watched:index';

async function addToIndex(env: Env, igdbId: number): Promise<void> {
  const index = (await env.SNAG_KV.get<number[]>(INDEX_KEY, 'json')) ?? [];
  if (!index.includes(igdbId)) {
    index.push(igdbId);
    await env.SNAG_KV.put(INDEX_KEY, JSON.stringify(index));
  }
}

async function removeFromIndex(env: Env, igdbId: number): Promise<void> {
  const index = (await env.SNAG_KV.get<number[]>(INDEX_KEY, 'json')) ?? [];
  await env.SNAG_KV.put(INDEX_KEY, JSON.stringify(index.filter((id) => id !== igdbId)));
}

interface GameSnapshot {
  firstReleaseDate: string | null;
  notifiedReleased?: boolean;
}

/**
 * The alert sweep.
 *
 * Runs on cron, compares each watched game against the snapshot from the last
 * run, and pushes only on a real transition. Snapshotting is what keeps this
 * honest: without it the obvious implementation re-sends "out now" every hour
 * for a week, which is precisely the kind of notification that gets an app
 * muted and never opened again.
 */
async function runAlertSweep(env: Env): Promise<void> {
  const index = (await env.SNAG_KV.get<number[]>(INDEX_KEY, 'json')) ?? [];
  if (index.length === 0) return;

  // IGDB caps a where-in query at 100 ids.
  for (let offset = 0; offset < index.length; offset += 100) {
    const batch = index.slice(offset, offset + 100);
    const games = await getGames(env, batch);
    await Promise.all(games.map((game) => processGame(env, game)));
  }
}

async function processGame(env: Env, game: GameRecord): Promise<void> {
  const snapshotKey = `snapshot:${game.id}`;
  const previous = await env.SNAG_KV.get<GameSnapshot>(snapshotKey, 'json');
  const next: GameSnapshot = {
    firstReleaseDate: game.firstReleaseDate,
    notifiedReleased: previous?.notifiedReleased ?? false,
  };

  // First sight of a game is a baseline, never an alert — otherwise every
  // newly watched game would immediately fire.
  if (!previous) {
    await env.SNAG_KV.put(snapshotKey, JSON.stringify(next));
    return;
  }

  const watchers = (await env.SNAG_KV.get<string[]>(`watchers:${game.id}`, 'json')) ?? [];
  if (watchers.length === 0) return;

  const gainedDate = !previous.firstReleaseDate && !!game.firstReleaseDate;
  const dateMoved =
    !!previous.firstReleaseDate &&
    !!game.firstReleaseDate &&
    previous.firstReleaseDate !== game.firstReleaseDate;

  if (gainedDate || dateMoved) {
    await sendNotification(env, {
      subscriptionIds: watchers,
      title: gainedDate ? 'It finally has a date' : 'New release date',
      body: `${game.name} lands ${formatDate(game.firstReleaseDate!)}.`,
      url: `snag://game/${game.id}`,
    });
  }

  const releasedNow =
    !!game.firstReleaseDate &&
    game.firstReleaseDate <= new Date().toISOString().slice(0, 10) &&
    !next.notifiedReleased;

  if (releasedNow) {
    await sendNotification(env, {
      subscriptionIds: watchers,
      title: 'Out now',
      body: `${game.name} is out. It has been sitting in your pile.`,
      url: `snag://game/${game.id}`,
    });
    next.notifiedReleased = true;
  }

  await env.SNAG_KV.put(snapshotKey, JSON.stringify(next));
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
