# Foundation validation — 11 November 2026

Prepared locally for Supabase project `vxenlskelqwpghclxbjj`.

- Fresh baseline applies to PostgreSQL 16 with the Supabase auth/storage platform fixture: **44 public application tables, 2 private tables, RLS on all 44 public tables, 96 policies, 30 public functions**.
- Behaviour/security tests pass: signup/default settings, role escalation denial, private financial/notification data, pending video visibility, PIN hashing and lockout, session parent access, idempotent atomic gifts, insufficient funds, social counters/notifications, storage prefixes, daily quotas, screen-time counting, and account deletion cascades.
- **19 Chromium checks pass** across phone-sized (390×844), tablet-sized (820×1180), and desktop encoder contexts. Desktop-generated files have an audio stream and nonzero decoded PCM, in addition to video. Tests use synthetic media and mock Supabase HTTP calls.
- Production browser smoke checks pass at both touch sizes for acknowledgement, sign-in and public account-deletion information, with no observed page errors.
- Frontend TypeScript, production web build, all 15 Edge Function Deno type checks, and npm clean-install resolution checks pass.
- Android `assembleDebug` succeeds using a full JDK 21, SDK/build-tools 36 and the pinned Gradle wrapper. APK signature verification passes (v2 signature), package `com.semogroup.toonlyreels`, version `0.1.0`/`1`, min API 24, target API 36.
- APK inspection confirms local bundled assets, the new Supabase project URL, no old Supabase URL, no remote preview server and no `sb_secret_` client key.
- Signed release script refuses to proceed without the upload keystore and all signing variables. No release key was supplied/generated, no signed AAB was produced, and no store upload was made.

The supplied project root URL/key returned HTTP 200 from Supabase Auth settings. A read-only REST table check returned `PGRST205` for `profiles`, confirming the remote database still needs the prepared SQL. No hosted SQL, function deployment, user-data migration or account creation was performed.

The local PostgreSQL fixture does not reproduce the complete Supabase platform. Actual mail, Storage, deployed Realtime/functions, deep links, installation, Android hardware, and provider integrations remain to be validated after setup. There was no physical-device/emulator test. Existing general ESLint warnings/type cleanups outside this foundation were not represented as fully resolved.

Prepared artifacts are development deliverables. Read `SUPABASE_SETUP.md` and `ANDROID_BUILD_GUIDE.md` for required setup and release steps. The historical playback audit's original silent-encoder observation has been addressed in the later foundation change; its original records/measurements describe the old project only.
