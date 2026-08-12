import type { Env } from './igdb';

/**
 * OneSignal delivery.
 *
 * Every notification this app sends has to clear one bar: would the player be
 * glad it arrived? A backlog tracker has infinite excuses to nag ("you have 47
 * unplayed games!") and every one of them makes the pile feel like a debt,
 * which is the exact failure this product is designed around. So the only
 * pushes here are ones carrying information the player could act on and could
 * not have known otherwise — a wishlisted game got a release date, or it is
 * leaving a service they pay for.
 */

interface NotificationRequest {
  subscriptionIds: string[];
  title: string;
  body: string;
  /** Deep link target, e.g. backlogue://game/1030300 */
  url?: string;
}

export async function sendNotification(env: Env, request: NotificationRequest): Promise<boolean> {
  if (request.subscriptionIds.length === 0) return true;
  if (!env.ONESIGNAL_APP_ID || !env.ONESIGNAL_REST_API_KEY) return false;

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      Authorization: `Key ${env.ONESIGNAL_REST_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: env.ONESIGNAL_APP_ID,
      include_subscription_ids: request.subscriptionIds,
      headings: { en: request.title },
      contents: { en: request.body },
      ...(request.url ? { app_url: request.url } : {}),
    }),
  });

  return response.ok;
}

export function releaseDateAnnouncedMessage(gameName: string, date: string): NotificationRequest {
  return {
    subscriptionIds: [],
    title: 'It finally has a date',
    body: `${gameName} lands ${formatDate(date)}.`,
  };
}

export function releasedTodayMessage(gameName: string): NotificationRequest {
  return {
    subscriptionIds: [],
    title: 'Out now',
    body: `${gameName} is out. It has been sitting in your pile.`,
  };
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
