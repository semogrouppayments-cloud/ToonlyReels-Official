import { APP_ID, notificationPayload, providerOutcome, secretsMatch, type PushJob } from './model.ts';
import { handleRequest } from './index.ts';
import { exportPKCS8, generateKeyPair, jwtVerify } from 'npm:jose@6.1.0';
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const recipient = '11111111-1111-4111-8111-111111111111';
const job: PushJob = { notification_id: '22222222-2222-4222-8222-222222222222', lease_id: '33333333-3333-4333-8333-333333333333', user_id: recipient, event_type: 'reply', video_id: '44444444-4444-4444-8444-444444444444', comment_id: null, sound_enabled: false };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const env = () => {
 Deno.env.set('SUPABASE_URL', 'https://fixture.supabase.co'); Deno.env.set('SUPABASE_ANON_KEY', 'fixture-anon');
 Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'fixture-service'); Deno.env.set('PUSH_WEBHOOK_SECRET', 'fixture-worker-secret'); Deno.env.set('ONESIGNAL_REST_API_KEY', 'fixture-provider-key');
};
Deno.test('payload uses server recipient, stable idempotency, brand icons and silent channel', () => {
 const payload = notificationPayload(job);
 assert(payload.include_aliases.external_id[0] === recipient, 'wrong recipient');
 assert(payload.idempotency_key === job.notification_id, 'unstable dedupe key');
 assert(payload.app_id === APP_ID && payload.small_icon === 'ic_stat_onesignal_default', 'brand not configured');
 assert(payload.large_icon === 'ic_onesignal_large_icon_default', 'large icon wrong');
 assert(payload.existing_android_channel_id === 'toonly_activity_silent' && payload.ios_sound === 'nil', 'sound preference ignored');
 assert(payload.contents.en.includes('replied'), 'reply event copy missing');
});
Deno.test('provider outcomes distinguish retryable errors and no subscriptions', () => {
 assert(providerOutcome(429, {}).outcome === 'retry', '429 not retryable');
 assert(providerOutcome(503, {}).outcome === 'retry', '503 not retryable');
 assert(providerOutcome(400, {}).outcome === 'dead', '400 should not retry');
 assert(providerOutcome(200, {}).outcome === 'skipped', 'empty provider success counted sent');
 assert(providerOutcome(200, { id: 'message' }).outcome === 'sent', 'accepted send not recorded');
});
Deno.test('worker secrets require exact matching and nonempty configuration', async () => {
 assert(await secretsMatch('secret', 'secret'), 'exact secret rejected');
 assert(!await secretsMatch('secret2', 'secret') && !await secretsMatch('', ''), 'incorrect secret accepted');
});
Deno.test('client cannot trigger delivery or choose a target', async () => {
 env(); const before = globalThis.fetch;
 globalThis.fetch = () => { throw new Error('Unexpected network request'); };
 try {
  const result = await handleRequest(new Request('https://fixture/onesignal-delivery', { method: 'POST', headers: { Authorization: 'Bearer normal-user-token' }, body: JSON.stringify({ user_id: recipient }) }));
  assert(result.status === 401, 'client delivery accepted');
 } finally { globalThis.fetch = before; }
});
Deno.test('configured worker ignores body target and submits only a claimed eligible job', async () => {
 env(); const before = globalThis.fetch; let payload: Record<string, unknown> | null = null; let ack = false;
 globalThis.fetch = async (input, options) => {
  const url = String(input);
  if (url.endsWith('/rpc/claim_onesignal_notifications')) return response([job]);
  if (url.endsWith('/rpc/onesignal_notification_allowed')) return response(true);
  if (url.endsWith('/rpc/finish_onesignal_notification')) { ack = true; return response(true); }
  if (url.startsWith('https://api.onesignal.com/notifications')) { payload = JSON.parse(String(options?.body)); return response({ id: 'provider-message-id' }); }
  throw new Error('Unexpected URL: ' + url);
 };
 try {
  const result = await handleRequest(new Request('https://fixture/onesignal-delivery', { method: 'POST', headers: { Authorization: 'Bearer fixture-worker-secret' }, body: JSON.stringify({ user_id: 'attacker-target', contents: 'forged' }) }));
  assert(result.status === 200 && ack && payload, 'worker did not complete');
  const parsed = payload as unknown as ReturnType<typeof notificationPayload>;
  assert(parsed.include_aliases.external_id[0] === recipient && parsed.contents.en !== 'forged', 'client data influenced provider message');
 } finally { globalThis.fetch = before; }
});
Deno.test('permission or privacy changes after claim suppress provider request', async () => {
 env(); const before = globalThis.fetch; let outcome = '';
 globalThis.fetch = async (input, options) => {
  const url = String(input);
  if (url.endsWith('/rpc/claim_onesignal_notifications')) return response([job]);
  if (url.endsWith('/rpc/onesignal_notification_allowed')) return response(false);
  if (url.endsWith('/rpc/finish_onesignal_notification')) { outcome = JSON.parse(String(options?.body))._outcome; return response(true); }
  throw new Error('Provider must not be called');
 };
 try {
  await handleRequest(new Request('https://fixture/onesignal-delivery', { method: 'POST', headers: { Authorization: 'Bearer fixture-worker-secret' }, body: '{}' }));
  assert(outcome === 'skipped', 'privacy change ignored');
 } finally { globalThis.fetch = before; }
});
Deno.test('missing provider key retains the queue without claiming work', async () => {
 env(); Deno.env.delete('ONESIGNAL_REST_API_KEY'); const before = globalThis.fetch;
 globalThis.fetch = () => { throw new Error('Queue must not be claimed without provider configuration'); };
 try {
  const result = await handleRequest(new Request('https://fixture/onesignal-delivery', { method: 'POST', headers: { Authorization: 'Bearer fixture-worker-secret' }, body: '{}' }));
  assert(result.status === 503, 'missing provider key not reported');
 } finally { globalThis.fetch = before; }
});
Deno.test('identity token uses verified Supabase ID, ES256, app issuer and expiry', async () => {
 env(); const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
 Deno.env.set('ONESIGNAL_IDENTITY_VERIFICATION_SECRET_KEY', await exportPKCS8(privateKey));
 const before = globalThis.fetch;
 globalThis.fetch = async input => {
  const url = String(input);
  if (url.endsWith('/auth/v1/user')) return response({ id: recipient, aud: 'authenticated', email: 'fixture@example.test', user_metadata: {}, app_metadata: {} });
  if (url.endsWith('/rpc/consume_push_identity_quota')) return response(true);
  throw new Error('Unexpected URL: ' + url);
 };
 try {
  const result = await handleRequest(new Request('https://fixture/onesignal-delivery', { method: 'POST', headers: { Authorization: 'Bearer verified-user-token' }, body: JSON.stringify({ mode: 'identity', externalId: 'attacker-target' }) }));
  const body = await result.json();
  assert(result.status === 200 && body.externalId === recipient, 'identity was not authenticated');
  const verified = await jwtVerify(body.jwt, publicKey, { issuer: APP_ID, algorithms: ['ES256'] });
  assert((verified.payload.identity as { external_id: string }).external_id === recipient, 'identity claim wrong');
  assert(Number(verified.payload.exp) > Date.now() / 1000, 'token expired');
 } finally { globalThis.fetch = before; }
});
Deno.test('OPTIONS returns an empty valid preflight', async () => {
 assert((await handleRequest(new Request('https://fixture/', { method: 'OPTIONS' }))).status === 204, 'preflight failed');
});
