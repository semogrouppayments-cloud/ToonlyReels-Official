# Android APK and Play Store bundle

This repository packages the existing React/TypeScript application as a native Android application using **Capacitor 8**. It is not a React Native rewrite. The existing phone/tablet layouts remain. Web assets are bundled into the APK; no Lovable preview server is used.

- Application ID: `com.semogroup.toonlyreels` — confirm ownership/name before the first Play Store release; the ID cannot be changed for an existing listing.
- Version name/code: `0.1.8` / `9` in `android/app/build.gradle`; increment the code for each uploaded release.
- Minimum Android API: 24 (Android 7). Compile/target API: 36.
- JDK **21 with javac**, Node **22.12+**, Android SDK platform 36 and build tools 36.0.0.
- React, Capacitor and AndroidX dependencies are locked in the npm/Gradle files.

## Build and install a development APK

Install Android Studio and its SDK, then:

```sh
npm ci
cp .env.example .env
npm run typecheck
npm run android:debug
```

Set `ANDROID_HOME` to your SDK installation, or create ignored `android/local.properties` containing `sdk.dir=/absolute/path/to/android-sdk`. Gradle's wrapper downloads the pinned distribution. Android Studio's **Run** action also installs the debug app on a connected device or emulator.

The installable development APK is at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install via `adb install -r PATH_TO_APK`, or transfer it to an Android device and allow installation from the file source. This APK uses a development certificate and is **not a Play Store release artifact**. No physical Android device was available during preparation; build/signature checks do not establish device compatibility.

The APK embeds the supplied public Supabase configuration. For an empty project, run the fresh SQL baseline; for an existing project, apply only the needed upgrade migrations. Deploy the relevant functions as described in `SUPABASE_SETUP.md`. Email/AI/transcription/push/payment providers still need their own configuration.

## Release signing and AAB

Keep the upload signing key under your control. A new RSA 4096-bit PKCS12 upload key was generated for 0.1.8 at the owner's request. Its private backup is supplied separately from all public downloads. Retain that key and its passwords for future releases; do not generate another key for each update. Do not commit it, its password, or any Supabase server credentials. Enroll the app in Play App Signing when creating the Play listing.

Set these environment variables through your local secret store/CI settings:

```
TOONLY_RELEASE_STORE_FILE=/absolute/path/to/your-upload-key.jks
TOONLY_RELEASE_STORE_PASSWORD=...
TOONLY_RELEASE_KEY_ALIAS=...
TOONLY_RELEASE_KEY_PASSWORD=...
```

Then run `npm run android:release`. The script refuses to run without a real signing file and all four settings, checks TypeScript, rebuilds and syncs the web assets, then runs `assembleRelease bundleRelease`. Outputs:

```
android/app/build/outputs/bundle/release/app-release.aab
android/app/build/outputs/apk/release/app-release.apk
```

Upload the **signed AAB** to a Play Console internal testing track first. APK/AAB signatures were checked locally; no Play Store upload was performed. The new release certificate differs from earlier development APKs, so the signed release APK cannot update those installations in place. The separate 0.1.8 development update APK retains the earlier debug certificate. After Play App Signing enrollment, Google may use a separate app signing certificate for Play-delivered installs.

## GitHub Actions

- `android.yml` builds a debug APK for pull requests, main, and manual runs and exposes it as an Actions artifact. It also checks the database in a temporary local container.
- `android-release.yml` is manual and builds the signed APK and AAB. Configure GitHub secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` using the retained key. The decoded key exists only in the runner's temporary directory and is deleted afterwards.

The checked-in `.env.example` contains only this project's root URL and **public** publishable key. Adjust it before building for another project. `scripts/check-config.mjs` rejects service-role/secret keys in the client build. The repository connection used here has read-only access; these workflows are prepared locally until the source is pushed by an account with write access.

## Native integration

- HTTPS local WebView origin with cleartext/mixed content disabled.
- App data backup disabled to avoid exporting local authentication data/preferences.
- Shared smaller full-bleed logo used for launcher/adaptive/PWA icons; monochrome TR glyph used for Android's required small notification icon.
- Native email callback scheme: `com.semogroup.toonlyreels://auth/callback`. Allow it in Supabase Auth URL settings. PKCE is enabled. Confirm callbacks and cold starts on a real device.
- The native build unregisters web service workers; application updates are delivered through APK/AAB updates rather than a stale PWA cache.
- Camera/gallery selection uses the existing HTML file input and Android's picker. The Media3 upload compressor and OneSignal native push bridge are integrated, but still require physical-device verification. OneSignal server credentials, FCM configuration and the deployed delivery function are required; see `ONESIGNAL_SERVER_SETUP.md`. Native download/share, billing and external social-login providers require separate integration.

## Before public release

This is a **development foundation**, not a certification of Play Store approval or child-directed compliance. Complete actual parental identity/consent verification, a staffed moderation workflow and private pre-publication media handling before a child-directed public launch. Messaging and star purchases are not enabled by the new schema alone. Store listing, privacy/Data Safety forms, age/content rating, screenshots, verified contact details, hosted privacy/account-deletion URLs and actual device testing must match the final product.

Publish the web app's legal/account deletion information under your production HTTPS domain and provide the required Play Console URLs. In-app deletion is available from Settings through the authenticated deletion function. The public deletion information page explains how to sign in and request deletion.

Test phones and tablets, fresh installs, upgrades, email confirmation, back navigation, file selection, playback audio, slow networks, interrupted uploads, account switching/deletion, landscape/insets and offline recovery. Support for Android API 24+ does not guarantee every codec on every model; no universal smooth-playback claim is made.
