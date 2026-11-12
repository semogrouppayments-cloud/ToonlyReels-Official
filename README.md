# ToonlyReels

React + TypeScript + Supabase, with a Capacitor 8 Android project. Existing phone/tablet layouts and the tested playback fallback fix are retained.

```sh
npm ci
cp .env.example .env
npm run dev
```

Use Node 22.12+; Android builds additionally require a full JDK 21 and Android SDK 36.

- **Fresh Supabase database:** [setup instructions](docs/SUPABASE_SETUP.md) and [complete SQL baseline](supabase/migrations/20261111000000_initial_schema.sql).
- **Installable APK / signed AAB:** [Android build guide](docs/ANDROID_BUILD_GUIDE.md).
- **Playback audit and evidence:** [audit](docs/PLAYBACK_AUDIT.md), with [regression suite](tests/playback/README.md). The later foundation update additionally preserves audio in desktop-generated renditions; the audit's original video-only observations describe the earlier baseline.

Commands: `npm run typecheck`, `npm run build`, `npm run test:database` (Docker required), `npm run test:playback` (FFmpeg and Chromium required), `npm run android:debug`, `npm run android:release` (upload signing key required).

Run the new SQL **once in an empty Supabase project**. Archived migrations under `supabase/legacy-migrations/` are not part of the fresh setup. The provided publishable key is client-safe but cannot create database tables or deploy functions. Server credentials belong only in Supabase/CI secrets.

This is a development foundation. Supabase SQL/functions, SMTP, AI/transcription, push, Google Play Billing, verified guardian consent, native downloads and a durable media processing service require the setup or further integration documented above. No Play Store release or physical-device playback certification has been performed.
