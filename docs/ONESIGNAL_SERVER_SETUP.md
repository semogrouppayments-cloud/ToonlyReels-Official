# OneSignal server setup

App ID: `627d3af8-e1fa-45be-b98c-74c47ddab90a`. This ID is public; it is not a sending credential or an identity signing key. The supplied implementation has not been deployed or tested against real devices/provider credentials. No real push was sent during development.

## How activity becomes push

Existing database activity triggers create in-app notifications for likes, comments, replies, comment likes, follows and stars. The new migration also emits follower `new_video` notifications when a reel becomes approved, including approval through dashboard SQL. The admin review RPC now relies on that one publication trigger, so it does not emit a duplicate alert. Publication fan-out retains the existing limit of 1,000 followers per approval; larger audiences require a separate batched fan-out worker.

An AFTER INSERT trigger adds eligible notifications to a private durable outbox. It checks the master push preference, individual event preference, blocked relationships, approval/privacy, and whether the underlying like/follow/comment still exists. Enabling push does not replay old notifications.

When configured, `pg_net` wakes `onesignal-delivery`; a once-per-minute `pg_cron` job drains deferred/retry work. Each invocation claims at most ten jobs with leases. OneSignal gets the notification UUID as its idempotency key and the recipient's Supabase user UUID as a verified External ID. Request bodies cannot choose a recipient or message. Consent/privacy is checked again before the provider request.

Temporary failures retry with backoff, at most eight attempts within 24 hours. Provider rejection becomes a dead job; no active subscriptions becomes skipped. A `sent` status means OneSignal accepted the request, not that a phone displayed it. OneSignal dashboard delivery reports and a physical-device test are still needed.

## Configure the Android platform

In OneSignal, open the existing app and configure its Android Firebase Cloud Messaging platform credentials if not already configured. The App ID alone does not establish that FCM is ready. Never put an FCM service-account file, OneSignal App API key, Supabase service role or identity private key into VITE variables or the APK.

The Android app creates channels `toonly_activity` and `toonly_activity_silent`. Provider payloads use the TR logo resources `ic_stat_onesignal_default` and `ic_onesignal_large_icon_default`; Android requires its small status icon to be a monochrome silhouette. Sound preference selects the corresponding channel. OS notification/channel settings still apply.

## Secure device-to-account binding

Use **OneSignal → Settings → Keys & IDs → Identity Verification → Generate New Keys**, then download the generated private PEM. OneSignal holds its matching public key. A random locally generated EC key is not usable unless its public key has actually been registered with OneSignal; no such dashboard upload flow was established here.

The backend verifies a Supabase access token, then signs an ES256 token whose issuer is the App ID and whose `identity.external_id` is that verified user's UUID. The client must not supply its own trusted user ID. The native Android bridge needs OneSignal SDK 5.9.0 or newer and calls `OneSignal.login(externalId, jwt)`.

Only enable OneSignal's **Token Identity Verification** toggle after every deployed client that calls OneSignal login can send these JWTs. OneSignal's Web SDK and Capacitor/Cordova wrapper do not currently support this token flow; the custom native bridge is required. This release does not add OneSignal Web Push to the PWA. PWA in-app realtime alerts continue independently.

Official reference: https://documentation.onesignal.com/docs/en/identity-verification

## Install the database update

For an existing project, apply `supabase/migrations/20261112030000_onesignal_delivery.sql` once in Supabase SQL Editor. It is rerunnable, creates only private delivery state, keeps row-level access, and does not require secrets or extensions to be present when applied. It does not backfill historical alerts or turn push on for users.

## Set server secrets and deploy

Set these in **Supabase → Edge Functions → Secrets**:

- `ONESIGNAL_REST_API_KEY`: the OneSignal App API key with notification send permission.
- `ONESIGNAL_IDENTITY_VERIFICATION_SECRET_KEY`: the exact matching OneSignal-generated ES256 private PKCS8 PEM, keeping line breaks. Literal `\n` escapes are accepted.
- `PUSH_WEBHOOK_SECRET`: a newly generated random value of at least 32 characters; use the same value below in database configuration.

Supabase supplies the project's `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions. Do not send real secrets in chat or commit an `.env` containing them. `supabase/functions/.env.example` lists empty placeholders.

Deploy using the owner's Supabase access:

```sh
supabase functions deploy onesignal-delivery --project-ref vxenlskelqwpghclxbjj --no-verify-jwt
```

JWT gateway verification is disabled only because the worker uses a dedicated job secret. The handler verifies Supabase user JWTs for identity mode and checks the private worker secret for delivery mode.

In **Database → Extensions**, enable `pg_net` and `pg_cron` if not already enabled. Then run in SQL Editor with your own private random value:

```sql
SELECT public.configure_onesignal_delivery('REPLACE_WITH_YOUR_RANDOM_32_PLUS_CHARACTER_WORKER_SECRET');
```

The same named cron job is updated on repeated configuration. A true result means a wakeup was queued, not that provider delivery or all setup steps succeeded. If the function returns false, `pg_net` is missing or wakeup was unavailable; queued work remains. Configure/verify both extensions and secrets. Check without exposing secret values:

```sql
SELECT extname FROM pg_extension WHERE extname IN ('pg_net','pg_cron');
SELECT status,count(*) FROM private.notification_push_outbox GROUP BY status;
SELECT created_at,status,response_code FROM public.notification_delivery_logs
ORDER BY created_at DESC LIMIT 20;
```

After `pg_cron` is enabled, verify that its scheduled retry job exists:

```sql
SELECT jobname,schedule,active FROM cron.job
WHERE jobname='toonly-onesignal-delivery';
```

The queue/configuration/lease RPCs are server-only. `configure_onesignal_delivery` is intentionally unavailable to ordinary signed-in users. Supabase's SQL editor database owner can execute it.

## Client endpoint contract

Identity can be requested while push is off, before the user chooses to enable notifications:

```text
POST /functions/v1/onesignal-delivery
Authorization: Bearer SUPABASE_USER_ACCESS_TOKEN
Content-Type: application/json

{"mode":"identity"}
```

Response: `{jwt, externalId, expiresAt}` where `expiresAt` is Unix seconds, normally one hour ahead. User ID fields in the request are ignored. There is a per-user quota of 30 identity requests per hour. Missing/invalid signing configuration returns 503, not an insecure unsigned login.

The worker endpoint uses the same URL, POST `{}`, and `Authorization: Bearer PUSH_WEBHOOK_SECRET` (or the configured `CRON_SECRET` for an external scheduler). Do not expose either worker secret to the app. No client dispatch call is needed: database triggers and the periodic drain deliver activity while the app is closed.

## Local verification

No provider/network delivery is used by these checks:

```sh
deno check --node-modules-dir=none supabase/functions/onesignal-delivery/index.ts
deno test --allow-env --node-modules-dir=none supabase/functions/onesignal-delivery/model_test.ts
```

Nine tests cover recipient binding, brand resources/channels, provider outcome classification, secret matching, rejection of client dispatch, authenticated ES256 identity, private opt-out rechecks, retained work without a provider key, and preflight handling. Provider and Supabase HTTP calls are mocked.

The PostgreSQL behavioural fixture `database_test.mjs` can use a temporary PGlite installation via `PGLITE_MODULE`. It checks migration repeat, master/type opt-out, private schema/RPC grants, identity quota, leases/backoff/stale acknowledgements, block/pending privacy, audit logging, direct SQL publication and admin-RPC publication deduplication.
