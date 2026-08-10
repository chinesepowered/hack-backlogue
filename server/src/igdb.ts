/**
 * IGDB access.
 *
 * IGDB authenticates through Twitch with a client secret, which is exactly why
 * this code runs in a Worker instead of on device: an app binary is a public
 * artifact, and a secret shipped inside one is a secret published. The Worker is
 * the only thing that ever holds it.
 *
 * The second job here is shape. IGDB returns deeply nested, id-referenced
 * objects; the app wants flat records with a cover URL it can hand straight to
 * an image loader. Flattening at the edge keeps parsing code for a schema we do
 * not control out of the client, where a breaking change would need an app
 * store release to fix.
 */

export interface Env {
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  ONESIGNAL_APP_ID: string;
  ONESIGNAL_REST_API_KEY: string;
  SNAG_KV: KVNamespace;
}

export interface GameRecord {
  id: number;
  name: string;
  coverUrl: string | null;
  firstReleaseDate: string | null;
  summary: string | null;
  platforms: string[];
  genres: string[];
  criticRating: number | null;
}

const TOKEN_KEY = 'twitch:app_token';
const IGDB_ENDPOINT = 'https://api.igdb.com/v4/games';

interface CachedToken {
  token: string;
  expiresAtMs: number;
}

/**
 * Twitch app tokens last ~60 days. Caching in KV rather than module scope
 * matters because Workers isolates are recycled constantly — without it, a
 * cold start on every few requests would mean re-minting tokens often enough
 * to get rate limited.
 */
async function getAccessToken(env: Env): Promise<string> {
  const cached = await env.SNAG_KV.get<CachedToken>(TOKEN_KEY, 'json');
  // Refresh a minute early so a token cannot expire mid-flight.
  if (cached && cached.expiresAtMs > Date.now() + 60_000) {
    return cached.token;
  }

  const params = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID,
    client_secret: env.TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });

  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`Twitch token request failed: ${response.status}`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  const record: CachedToken = {
    token: body.access_token,
    expiresAtMs: Date.now() + body.expires_in * 1000,
  };
  await env.SNAG_KV.put(TOKEN_KEY, JSON.stringify(record));
  return record.token;
}

const FIELDS =
  'fields name,cover.image_id,first_release_date,summary,platforms.name,genres.name,aggregated_rating;';

async function query(env: Env, body: string): Promise<unknown[]> {
  const token = await getAccessToken(env);
  const response = await fetch(IGDB_ENDPOINT, {
    method: 'POST',
    headers: {
      'Client-ID': env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
  });

  if (response.status === 429) {
    throw new RateLimitError();
  }
  if (!response.ok) {
    throw new Error(`IGDB query failed: ${response.status}`);
  }
  return (await response.json()) as unknown[];
}

export class RateLimitError extends Error {
  constructor() {
    super('IGDB rate limit');
  }
}

interface RawGame {
  id: number;
  name?: string;
  cover?: { image_id?: string };
  first_release_date?: number;
  summary?: string;
  platforms?: Array<{ name?: string }>;
  genres?: Array<{ name?: string }>;
  aggregated_rating?: number;
}

function flatten(raw: RawGame): GameRecord {
  return {
    id: raw.id,
    name: raw.name ?? 'Unknown',
    coverUrl: raw.cover?.image_id
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${raw.cover.image_id}.jpg`
      : null,
    // IGDB gives unix seconds; the app wants a calendar date, and a release
    // date is a calendar fact rather than an instant.
    firstReleaseDate: raw.first_release_date
      ? new Date(raw.first_release_date * 1000).toISOString().slice(0, 10)
      : null,
    summary: raw.summary ?? null,
    platforms: (raw.platforms ?? []).map((p) => p.name).filter((n): n is string => !!n),
    genres: (raw.genres ?? []).map((g) => g.name).filter((n): n is string => !!n),
    criticRating: raw.aggregated_rating ? Math.round(raw.aggregated_rating) : null,
  };
}

/** Escapes a user-supplied query for IGDB's quoted search syntax. */
function escapeSearch(term: string): string {
  return term.replace(/\\/g, '').replace(/"/g, '');
}

export async function searchGames(env: Env, term: string, limit: number): Promise<GameRecord[]> {
  const safeTerm = escapeSearch(term).slice(0, 120);
  if (!safeTerm.trim()) return [];

  const rows = (await query(
    env,
    `search "${safeTerm}"; ${FIELDS} limit ${Math.min(Math.max(limit, 1), 50)};`,
  )) as RawGame[];

  return rows.map(flatten);
}

export async function getGame(env: Env, id: number): Promise<GameRecord | null> {
  const rows = (await query(env, `where id = ${id}; ${FIELDS} limit 1;`)) as RawGame[];
  return rows.length > 0 ? flatten(rows[0]) : null;
}

export async function getGames(env: Env, ids: number[]): Promise<GameRecord[]> {
  if (ids.length === 0) return [];
  const list = ids.slice(0, 100).join(',');
  const rows = (await query(
    env,
    `where id = (${list}); ${FIELDS} limit ${Math.min(ids.length, 100)};`,
  )) as RawGame[];
  return rows.map(flatten);
}
