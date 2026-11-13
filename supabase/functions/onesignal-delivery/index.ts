import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';
import { importPKCS8, SignJWT } from 'npm:jose@6.1.0';
import { APP_ID, notificationPayload, providerOutcome, secretsMatch, type PushJob } from './model.ts';

const json = (status: number, body: unknown) => new Response(status === 204 ? null : JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'POST,OPTIONS' },
});

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return json(204, null);
  if (request.method !== 'POST') return json(405, { error: 'Use POST' });
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !anon) return json(503, { error: 'Supabase configuration is incomplete' });
  let mode: unknown;
  try {
    // Payload is only used to select identity mode. No client target/message is accepted.
    const body = await request.json();
    mode = body && typeof body === 'object' ? body.mode : null;
  } catch { mode = null; }
  if (mode === 'identity') {
    const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await client.auth.getUser(token);
    if (!token || error || !user) return json(401, { error: 'Valid sign-in required' });
    const privateKey = Deno.env.get('ONESIGNAL_IDENTITY_VERIFICATION_SECRET_KEY')?.replace(/\\n/g, '\n');
    if (!privateKey) return json(503, { error: 'OneSignal identity signing key is not configured' });
    const { data: allowed, error: quotaError } = await client.rpc('consume_push_identity_quota');
    if (quotaError) return json(503, { error: 'Apply the OneSignal database migration' });
    if (!allowed) return json(429, { error: 'Too many notification sign-in requests; try later' });
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const key = await importPKCS8(privateKey, 'ES256');
      const jwt = await new SignJWT({ identity: { external_id: user.id } })
        .setProtectedHeader({ alg: 'ES256', typ: 'JWT' }).setIssuer(APP_ID).setIssuedAt().setExpirationTime(expiresAt).sign(key);
      return json(200, { jwt, externalId: user.id, expiresAt });
    } catch {
      return json(503, { error: 'OneSignal identity signing key is invalid' });
    }
  }

  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET') || '';
  const cronSecret = Deno.env.get('CRON_SECRET') || '';
  if (!await secretsMatch(token, webhookSecret) && !await secretsMatch(token, cronSecret)) return json(401, { error: 'Notification worker authorization required' });
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const providerKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
  if (!serviceKey || !providerKey) return json(503, { error: 'OneSignal server configuration is incomplete; queued notifications are retained' });
  const server = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await server.rpc('claim_onesignal_notifications', { _limit: 10 });
  if (error) return json(503, { error: 'Notification queue is unavailable; apply the OneSignal migration' });
  const counts = { sent: 0, retry: 0, skipped: 0, dead: 0 };
  // Keep invocation bounded, leases survive interruption, and provider idempotency prevents duplicate sends.
  for (const job of (data || []) as PushJob[]) {
    const { data: allowed, error: checkError } = await server.rpc('onesignal_notification_allowed', { _notification_id: job.notification_id, _lease_id: job.lease_id });
    let result: ReturnType<typeof providerOutcome>;
    let status: number | null = null;
    if (checkError) result = { outcome: 'retry', error: 'eligibility_check_failed' };
    else if (!allowed) result = { outcome: 'skipped', error: 'preferences_or_content_changed' };
    else {
      try {
        const response = await fetch('https://api.onesignal.com/notifications?c=push', {
          method: 'POST', headers: { Authorization: `Key ${providerKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(notificationPayload(job)), signal: AbortSignal.timeout(8000), redirect: 'error',
        });
        status = response.status;
        const body = await response.json().catch(() => null);
        result = providerOutcome(response.status, body);
      } catch { result = { outcome: 'retry', error: 'provider_request_failed' }; }
    }
    const { data: finished, error: finishError } = await server.rpc('finish_onesignal_notification', {
      _notification_id: job.notification_id, _lease_id: job.lease_id, _outcome: result.outcome,
      _provider_id: result.providerId || null, _error: result.error || null, _response_code: status,
    });
    if (!finishError && finished === true) counts[result.outcome]++;
  }
  return json(200, { processed: Object.values(counts).reduce((sum, value) => sum + value, 0), ...counts });
}

if (import.meta.main) Deno.serve(handleRequest);
