# PWA and APK downloads

The app now has an install/download page at `/install`. It is accessible before signing in, linked on the sign-in screen, and linked from Settings. Standalone PWA users can still download the Android APK. The native Android build does not offer to reinstall itself from its bundled assets.

- `Install PWA` invokes the browser's install prompt when available.
- Safari/iPhone/iPad and browsers without an install prompt show manual installation steps.
- `Download Android APK` links to `/downloads/ToonlyReels-0.1.8-signed.apk`. A separate development update link retains the certificate used by earlier test installations.
- Version, size and SHA-256 are available at `/downloads/release.json`.
- The full fresh-project SQL is at `/downloads/ToonlyReels-fresh-supabase.sql` in the hosted build.

The PWA manifest has exact 192/512 px icons, a separate maskable icon, root scope, and standalone display. The service worker precaches the app shell but excludes APK/SQL downloads from both precaching and runtime navigation caching. Account operations and videos need connectivity; video/offline account access is not promised.

`npm run android:sync` removes `dist/downloads` before Capacitor copies web assets, so a new APK cannot recursively include its prior APK. For web hosting, run `npm run build` again to restore all hosted downloads.

The included `_redirects` and `_headers` support SPA routing and attachment headers on static hosts that understand those files. Otherwise configure your host to serve existing static files normally and fall back to `index.html` only for app routes. Use HTTPS; opening `index.html` from a local file does not make an installable PWA.

## Deployment package

Extract `ToonlyReels-0.1.8-PWA.zip` and publish its contents as the website root. `index.html`, `sw.js`, `manifest.webmanifest`, assets, and downloads must remain together. Configure Supabase Auth's Site URL and allowed `/auth` redirect to the final hosted origin. Add that origin to Edge Function `ALLOWED_ORIGINS` where applicable. Apply the SQL and deploy functions per `SUPABASE_SETUP.md`.

A new Sites hosting registration was attempted, then retried with the owner's explicit approval. Registration returned an internal error without a usable project ID, so no new Site ID, published URL or live deployment is claimed. There was no change to the owner's existing hosted sites.

TypeScript/build, static artifact and phone/tablet-sized Chromium playback checks pass. A real browser installation prompt and physical device install/upgrade were not verified. Native OneSignal delivery is Android-only in this release; PWA in-app realtime alerts remain available, but PWA background Web Push was not added.

The primary downloadable APK is release-signed version 0.1.8 / code 9. The separately labelled development update APK is not a Play Store artifact. The signed AAB is supplied separately for Play Console internal testing.

For a manual hosting fallback, extract the deployment ZIP and drag its folder (the one containing `index.html`) into Netlify Drop at https://app.netlify.com/drop. This is a user-operated alternative; no Netlify deployment or URL was created during this task.
