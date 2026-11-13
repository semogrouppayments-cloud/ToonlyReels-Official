# ToonlyReels 0.1.6 — Android and PWA

iOS was skipped as requested. No IPA is included.

## Which download to use

- **Already using the earlier test APK:** install `ToonlyReels-0.1.6-debug.apk` as an update. It retains the earlier development certificate and Android application ID. This is the simplest way to keep the existing installation and login.
- **New release installation:** use `ToonlyReels-0.1.6-signed.apk`. It uses the new release key. Android cannot install this over a development-signed version with the same application ID; uninstalling removes local app data. Account data already stored in Supabase remains there.
- **Play Console:** upload `ToonlyReels-0.1.6-signed.aab` to internal testing first. An AAB is not directly installable. No Play submission was performed.
- **Website/PWA:** extract `ToonlyReels-0.1.6-PWA.zip` and host its contents over HTTPS. The public `/install` page includes the PWA instructions and current APK downloads. This package is not a live website URL.

## What changed

Android now has a native OneSignal 5.9.0 integration for app `627d3af8-e1fa-45be-b98c-74c47ddab90a`. Notification settings save the master On/Off preference and event preferences. The OS permission prompt is requested only when the user explicitly enables push. Account switching/logout disables the previous subscription, and verified server-issued identity tokens bind a device to the signed-in account. Notification taps open app-owned routes.

Likes, comments, replies, comment likes, follows, stars and newly approved creator reels can enter a private server delivery queue. Delivery rechecks preferences and access, uses deduplication and retries, and does not replay past notifications when enabled. Realtime in-app Alerts continue separately.

The smaller centered logo is shared by Android launcher/adaptive icons, PWA icons and the Play Store 512px icon. Android notifications use the TR silhouette for the small status icon and the full-colour app logo for the large icon. Android renders small status icons in monochrome.

The existing phone/tablet layouts, sound-on reel attempts, native upload compression and playback changes are retained. Browser autoplay restrictions can still require a deliberate sound-enabling tap. No claim is made that playback is fixed on every phone model.

## Enable live Android push

The App ID alone cannot send notifications. Follow `ONESIGNAL_SERVER_SETUP.md` in this package:

1. Configure the Android Firebase Cloud Messaging platform in the OneSignal dashboard.
2. In the existing Supabase project's **SQL Editor**, run only `ToonlyReels-OneSignal-upgrade.sql`. It is rerunnable. Do not run the fresh-project SQL over the existing database. If the earlier shared-feed migration has not been applied, apply `ToonlyReels-shared-feed-fix.sql` first; this push migration does not change reel visibility.
3. Generate the matching identity-verification key pair in OneSignal. Put the OneSignal App API key, its generated private PEM and a random worker secret in **Supabase Edge Functions → Secrets**, as described in the server guide. Never paste those private values into chat or put them in the app.
4. Deploy `supabase/functions/onesignal-delivery`, enable `pg_net` and `pg_cron`, then configure the database with the same worker secret using the SQL in the server guide.
5. On an Android device, sign in, open **Settings → Notifications → Notification Settings**, turn push on, save and allow the OS notification permission. Confirm the subscription and delivery result in OneSignal. With a second account, like/reply while the recipient app is backgrounded; then disable push and repeat to verify opt-out.

Until those server/platform steps are complete, the app reports that push needs owner setup. No live push was sent or tested in this session. PWA background Web Push is outside this release.

## Signing key

A new RSA 4096-bit upload key was generated at the owner's request. Public certificate SHA-256:

`C0:15:40:ED:1D:1E:6C:6A:59:99:F4:07:CA:4A:1C:77:D2:69:C6:C0:AA:3C:34:49:B9:F4:89:50:C8:F5:9E:41`

The private signing backup is supplied separately in the workspace, never in the public download package. Keep it and its password file in private, backed-up storage. Reuse this key for future signed releases. `docs/ANDROID_BUILD_GUIDE.md` explains local and GitHub Actions builds.

## Verification and limits

TypeScript, Android debug/release APK and release AAB builds passed. APK signatures and the AAB signature were verified; APK and AAB release certificates match. Bundletool validation passed. The development certificate matches the previous 0.1.5 APK. The launcher/notification asset generator validates sizes and transparency.

Chromium checks at 390×844 and 820×1180 passed 31 playback/settings regressions, 18 push-controller tests and four Settings integration tests. Push tests mock the native bridge and provider; they do not prove actual FCM delivery. Nine backend tests and the PostgreSQL migration fixture cover verified identity, recipient binding, opt-out, privacy, retries, deduplication and approved-video notifications. Test reports are included.

No physical Android device, live OneSignal delivery, Play Store upload, production SQL execution or production function deployment was available/performed. Hosting registration previously failed without a usable Site ID; no live PWA URL is claimed. Source changes are local and are included for the repository owner to push.
