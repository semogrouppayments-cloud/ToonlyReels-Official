export const APP_ID = '627d3af8-e1fa-45be-b98c-74c47ddab90a';
export interface PushJob {
  notification_id: string;
  lease_id: string;
  user_id: string;
  event_type: string;
  video_id: string | null;
  comment_id: string | null;
  sound_enabled: boolean;
}
const copy: Record<string, string> = {
  like: 'Someone liked your post.',
  comment: 'You have a new comment.',
  reply: 'Someone replied to your comment.',
  follow: 'You have a new follower.',
  new_video: 'A creator you follow posted a new reel.',
  star_gift: 'You received stars on a reel.',
  verification: 'Your account has a new verification update.',
  system: 'You have a new ToonlyReels notification.',
};

/** Input is a server-claimed database job, never an app-supplied recipient. */
export function notificationPayload(job: PushJob) {
  return {
    app_id: APP_ID,
    include_aliases: { external_id: [job.user_id] },
    target_channel: 'push',
    idempotency_key: job.notification_id,
    headings: { en: 'ToonlyReels' },
    contents: { en: copy[job.event_type] || copy.system },
    small_icon: 'ic_stat_onesignal_default',
    large_icon: 'ic_onesignal_large_icon_default',
    existing_android_channel_id: job.sound_enabled ? 'toonly_activity' : 'toonly_activity_silent',
    ios_sound: job.sound_enabled ? 'default' : 'nil',
    data: {
      notification_id: job.notification_id,
      type: job.event_type,
      video_id: job.video_id,
      comment_id: job.comment_id,
    },
  };
}

export async function secretsMatch(provided: string, expected: string) {
  if (!provided || !expected) return false;
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [left, right] = await Promise.all([digest(provided), digest(expected)]);
  let result = 0;
  for (let index = 0; index < left.length; index++) result |= left[index] ^ right[index];
  return result === 0;
}

export function providerOutcome(status: number, body: unknown): { outcome: 'sent' | 'retry' | 'dead' | 'skipped'; providerId?: string; error?: string } {
  if (status === 429 || status >= 500 || status === 408) return { outcome: 'retry', error: `provider_http_${status}` };
  if (status < 200 || status >= 300) return { outcome: 'dead', error: `provider_http_${status}` };
  const id = body && typeof body === 'object' && 'id' in body ? body.id : null;
  return typeof id === 'string' && id.length > 0
    ? { outcome: 'sent', providerId: id }
    : { outcome: 'skipped', error: 'no_active_provider_subscriptions' };
}
