# Snag API

A Cloudflare Worker doing two jobs: proxying IGDB so no secret ships inside the
app, and running the hourly sweep that produces alerts.

## Why this exists

IGDB authenticates through Twitch with a **client secret**. An app binary is a
public artifact — anything compiled into it is published, not hidden — so the
secret lives here and only here. The app talks to this Worker; this Worker talks
to IGDB.

That indirection pays for itself twice more:

- **Shape.** IGDB returns deeply nested, id-referenced objects. The Worker
  flattens them into the exact records the app renders, so a breaking change in
  a schema we do not control is a Worker deploy rather than an app store
  release.
- **Alerts.** Something has to be awake when a player is not, to notice that a
  wishlisted game got a release date.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/v1/health` | Liveness check |
| `GET` | `/v1/search?q=&limit=` | Game search |
| `GET` | `/v1/games/:igdbId` | Single game |
| `POST` | `/v1/watch` | Register games for alerts |

## Setup

```bash
npm install

# One-off: create the KV namespace, then paste its id into wrangler.toml
npx wrangler kv namespace create SNAG_KV

npx wrangler secret put TWITCH_CLIENT_ID
npx wrangler secret put TWITCH_CLIENT_SECRET
npx wrangler secret put ONESIGNAL_APP_ID
npx wrangler secret put ONESIGNAL_REST_API_KEY

npm run deploy
```

Get the Twitch credentials at <https://dev.twitch.tv/console/apps> — IGDB uses
Twitch as its identity provider, so a Twitch app *is* an IGDB app. No separate
IGDB signup exists.

Then put the deployed URL in the app's `local.properties`:

```properties
SNAG_API_BASE_URL=https://snag-api.<your-subdomain>.workers.dev
```

## Alert rules

The sweep runs hourly and pushes only on a genuine transition:

- a watched game **gained** a release date, or its date **moved**
- a watched game **came out**

The snapshot in KV is what makes this bearable. Without it, the obvious
implementation re-sends "out now" every hour for a week — which is exactly the
kind of notification that gets an app muted and then deleted. First sight of a
game writes a baseline and sends nothing.

## Local development

```bash
npm run dev        # local server at http://localhost:8787
npm run typecheck
npm run tail       # live logs from the deployed Worker
```

For a local run, put the same secrets in a git-ignored `.dev.vars` file.
