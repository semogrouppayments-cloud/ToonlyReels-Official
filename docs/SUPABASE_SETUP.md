# Fresh Supabase setup

Project: **vxenlskelqwpghclxbjj**. SDK URL: `https://vxenlskelqwpghclxbjj.supabase.co` (omit `/rest/v1/`). The supplied publishable key is in `.env.example`; it is a public client key. No server key is embedded in the Android app.

## Apply the database

1. Open this project's Supabase **SQL Editor** as its owner.
2. Run `supabase/migrations/20261111000000_initial_schema.sql` in full. It creates 44 public application tables, private PIN/session storage, RLS, indexes, foreign keys, triggers, app RPCs, three storage buckets, and selected Realtime publication entries in one transaction. It stops without applying changes if `public.profiles` already exists.
3. Do **not** run `supabase/legacy-migrations/`. Those files belong to the previous project's history, not this baseline. Do not apply the new baseline as an upgrade to a populated database.
4. Confirm the **API exposed schemas** include `public` and exclude `private`. Supabase's managed `auth` and `storage` schemas must already exist; the baseline deliberately does not recreate them.
5. Register an account through the app and confirm its email. The auth trigger creates its profile, viewer/creative role, settings, wallet, creator ledger, and messaging permission row automatically. Metadata cannot assign admin status.
6. Assign an administrator through trusted SQL, replacing the email below. Never grant admin from app metadata:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL')
on conflict (user_id, role) do nothing;
```

New uploads start `pending`; other viewers only see approved videos. Until an admin UI is wired, review uploads in the Supabase dashboard and update the selected row's `moderation_status` to `approved` or `rejected`. The authenticated admin RPC `review_video(video_id,status,reason)` also records a moderation action. Do not blanket-approve all uploads as a launch workaround.

## Auth and native callback

In **Authentication → URL Configuration**, set the website Site URL to the eventual hosted web URL and allow:

- `com.semogroup.toonlyreels://auth/callback`
- Your hosted site's `/auth` URL
- `http://localhost:8080/auth` and `http://127.0.0.1:8080/auth` for development only

Keep email confirmation enabled and configure custom SMTP for production mail delivery. Native callbacks support PKCE codes and the legacy session fragment. Email confirmation on a different device may require signing in again on the original device. Physical-device deep linking has not been tested here.

Copy `.env.example` to `.env` for local development; `.env` is no longer tracked. `npm run build` validates that the SDK URL is a project root and the embedded key is publishable/anon, rejecting service/secret keys.

## Edge Functions

Using the Supabase CLI, authenticate locally, link this project, and deploy the functions:

```sh
supabase login
supabase link --project-ref vxenlskelqwpghclxbjj
supabase functions deploy --project-ref vxenlskelqwpghclxbjj
```

The CLI config uses `verify_jwt=false` to avoid legacy gateway restrictions on modern Supabase JWTs. **Every endpoint validates caller identity/role or a scheduler secret inside its handler**; this is not anonymous service access. Deploy all current files together, including `_shared/authorize.ts`.

Supabase supplies its URL and server credentials to hosted functions. Configure optional integrations only in **Edge Function Secrets**, never in chat or `VITE_*` variables:

| Secret | Purpose |
| --- | --- |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email delivery using a verified sender domain |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Optional OpenAI-compatible streamed AI provider |
| `ELEVENLABS_API_KEY` | Optional transcription |
| `CRON_SECRET` | Long random bearer secret shared only with your scheduler |
| `ALLOWED_ORIGINS` | Comma-separated additional web origins for restricted-CORS endpoints |

Authenticated chat, transcription and manual reports have daily account quotas. Missing optional providers return configuration errors; providing the publishable key alone does not connect email, AI, or transcription services.

The job endpoints `weekly-creator-digest`, `scheduled-monthly-report`, `scheduled-cleanup` and `batch-transcribe-videos` are not scheduled automatically. When ready, configure a scheduler to POST to `/functions/v1/NAME` with `Authorization: Bearer CRON_SECRET`. Cleanup and batch transcription also accept a verified admin session. No cron secret is stored in this repository.

Manual activity reports require parent/verified guardian access and are delivered only to the caller's confirmed account email. Verified guardian links and consent records are server-owned; a client cannot verify itself as a guardian. These tables do not, by themselves, implement a legally verified parental-consent service.

## Storage and privacy

- `videos`: public UGC/media, 250 MiB limit, allowed video and thumbnail formats. Existing playback uses public media URLs. **Pending moderation hides database rows from other viewers but does not make a known public object URL private.** A private pre-publication media pipeline is a separate deployment decision before a child-directed public release.
- `avatars`: public, 10 MiB, image formats.
- `verification-documents`: private, 10 MiB, image/PDF, readable only by its owner or an admin.

Uploads must use a path beginning with the caller's UUID. Account deletion recursively removes that prefix in all three buckets and then deletes the auth account; foreign keys cascade through account-owned records, including private PINs. Ledger references are nulled where audit history must survive. Live deletion/storage behaviour must be verified after deployment.

## Schema coverage

- Identity/settings: profiles, user_roles, user_type_changes, profile_secrets (legacy empty-PIN contract), parental_controls, content_settings, playback_settings, notification_preferences.
- Video/social: videos, video_renditions, video_processing_jobs, video_analytics, video_downloads, likes, comments, comment_likes, follows, blocks, saved_videos.
- Notifications: notifications, device_tokens, push_templates, notification_delivery_logs.
- Family controls: guardian_links, parental_consents, screen_time_usage, pin_attempts, monthly_report_settings; actual PIN hashes and temporary parent access grants are in unexposed `private` tables.
- Trust/operations: reports, creator_verifications, moderation_actions, cleanup_logs, api_usage, account_deletion_requests.
- Messaging foundations: conversations, conversation_members, messages, messaging_permissions. Permission starts off; conversations/permission grants are server-owned. A messaging UI/service is not implemented by these tables.
- Money foundations: star_packs, star_balances, star_transactions, creator_monetization, billing_events, payout_requests. Browser minting and direct wallet edits are denied. Gifts are one atomic idempotent RPC. Packs remain inactive; no Google Play Billing, payment receipt verification, or payout provider is connected.

Daily screen-time records use the database's UTC day. The client records visible time at most once per 55 seconds across sessions, and a verified parent can grant an extension. Client time checks and PINs are not a substitute for separate guardian identities or operating-system parental controls.

Media job/rendition tables are foundations only: there is no deployed transcoding worker and mobile uploads still skip browser rendition generation. Desktop-generated renditions now preserve audio; the existing fallback-loop fix remains. Real-device playback is not certified by the schema or APK build.

## Verification

`npm run test:database` starts a temporary PostgreSQL 16 container, installs a minimal fixture for Supabase-managed auth/storage objects, applies the complete baseline and exercises security/behaviour. It never touches the hosted project. The fixture file is **not** an installation script for Supabase. The local suite is not a replacement for testing Supabase Storage, Auth mail, Realtime and deployed functions on the actual project.

The generated TypeScript contract covers the fresh schema. After future hosted migrations, regenerate with `supabase gen types typescript --project-id vxenlskelqwpghclxbjj > src/integrations/supabase/types.ts`.

## November 12 reels update

For a fresh database, apply both files in `supabase/migrations` in timestamp order, or use the combined `public/downloads/ToonlyReels-fresh-supabase.sql`. If the initial schema is already installed, apply only `20261112000000_reel_safety_and_views.sql`. See `REEL_FIX_0.1.2.md` for reviewed cartoon classification and rollout.

## Viewer feed visibility fix

Apply `supabase/migrations/20261112010000_viewer_feed_visibility.sql` to an existing project after the prior schema updates. This switches existing viewer accounts to all approved reels by turning Cartoon-Only Mode off, while preserving category selections, comments, limits, blocks and PINs. New accounts default to that general feed. Cartoon/category filtering still works when re-enabled in Settings. Pending uploads are not published by this migration. Restart the viewer's app after applying it.
