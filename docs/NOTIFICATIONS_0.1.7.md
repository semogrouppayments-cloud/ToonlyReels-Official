# Android notification correction — 0.1.7

The bell is restored to the bottom Alerts navigation, desktop navigation and in-app notification controls. The TR logo is reserved for Android system notification icons: a white/transparent silhouette beside the time and a full-colour large icon in the notification shade. Android controls small-icon tinting; a full-colour image cannot appear beside the time.

The launcher and PWA logo artwork is modestly larger, with orange to every edge. The app loading logo is 128px rather than 112px. Native launch assets now use this same brand instead of the leftover Capacitor placeholder, including Android 12's splash icon.

## Permission request

On the signed-in feed, Android users without permission see an in-app **Allow notifications** prompt. Tapping Allow requests the OS permission before contacting the identity service, so missing server configuration no longer prevents Android's prompt. Not now defers it for the current app session. A failed setup displays an error and does not falsely save push as enabled. Background startup and account synchronization do not display unsolicited OS prompts.

If Android has already permanently blocked permission after earlier denials, the OS may require its settings page. The app cannot override that decision. No physical device permission/delivery test was available.

## Confirmed live blocker

A read-only request to the supplied project's endpoint returned HTTP 404 with `{"code":"NOT_FOUND","message":"Requested function was not found"}` on 12 November 2026:

`https://vxenlskelqwpghclxbjj.supabase.co/functions/v1/onesignal-delivery`

The previous native flow required this service before giving OneSignal consent and logging in the user. This prevents verified device registration when the function is absent. OS permission alone does not prove the device is subscribed. The App ID is public configuration, not a sending key or an identity key.

## Owner setup needed for live delivery

1. In OneSignal, open this app → Android platform settings and confirm Firebase Cloud Messaging is configured. In Audience → Subscriptions, confirm the phone appears as **Subscribed**, not just permission allowed.
2. Run `ToonlyReels-OneSignal-upgrade.sql` in the existing Supabase project's SQL Editor if not already applied. Do not rerun the fresh-project baseline.
3. In Supabase Edge Functions → Secrets, configure `ONESIGNAL_REST_API_KEY`, the matching OneSignal-generated `ONESIGNAL_IDENTITY_VERIFICATION_SECRET_KEY` PEM, and a random 32+ character `PUSH_WEBHOOK_SECRET`. Never put these in the APK, GitHub, VITE variables or chat.
4. Deploy the included function from this repository using the owner's authenticated Supabase CLI:

   ```sh
   supabase functions deploy onesignal-delivery --project-ref vxenlskelqwpghclxbjj --no-verify-jwt
   ```

5. Enable `pg_net` and `pg_cron`, then run `SELECT public.configure_onesignal_delivery('YOUR_SAME_PRIVATE_WORKER_SECRET');` in SQL Editor. See `ONESIGNAL_SERVER_SETUP.md` for full instructions, including generating the correct identity PEM in OneSignal.
6. Install the appropriate 0.1.7 APK, sign in and choose Allow. Confirm a subscribed phone in OneSignal before sending a dashboard test. Test likes/replies from a second account with the receiving app foregrounded and backgrounded. Check Android notification channels and OneSignal delivery reports, then verify Off stops delivery.

This release does not establish live FCM delivery; the missing production function and private server/platform setup must be completed first. No real notification was sent by development tests.

## Installation and signing

`ToonlyReels-0.1.7-debug.apk` updates earlier development-signed APKs. `ToonlyReels-0.1.7-signed.apk` updates the 0.1.6 release-signed APK. Choose the same certificate as your installed app; Android rejects cross-certificate updates. The AAB is signed with the retained release upload key, not a newly generated key. No iOS build is included.

The PWA package has current icons and APK downloads; it needs HTTPS hosting. Native Android system push is separate from PWA in-app alerts. GitHub publishing remains blocked by the connected account's missing write permission until the owner grants access.
