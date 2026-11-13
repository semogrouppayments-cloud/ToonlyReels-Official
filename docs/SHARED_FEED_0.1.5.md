# Shared reels feed and pause controls — 0.1.5

## Rollout

Run `public/downloads/ToonlyReels-shared-feed-fix.sql` in the Supabase SQL Editor, then install the 0.1.5 APK over the previous development build and reopen the app. Use this upgrade file on the existing database, not the fresh-project baseline. Backend SQL is supplied, not remotely applied.

Both viewer and creative accounts now browse the same approved-reels feed, ordered by creation time with ID as a stable tie-breaker. Home no longer requests content preferences or applies cartoon/category clauses. The Safety & Content section and its save/read logic are removed from Settings. Related FAQ text no longer claims category/age filtering; unrelated controls remain.

The SQL removes cartoon/category checks from the video-read policy for all account types and retires the legacy preference helper's filtering behaviour while retaining its signature for the view-count RPC. It sets the old mode off for all accounts, preserves existing metadata for compatibility, and does not delete tables, videos or accounts. Blocked creators remain hidden. Pending/rejected uploads remain outside the shared Home feed, while owners can still inspect their uploads on Profile. This change does not automatically approve new uploads.

## Pause control

Normal manual pause uses an icon-only Play button. The wording "Play with sound" is restricted to an actual `NotAllowedError` from audible autoplay. Successful playback or a manual pause clears that permission state. A cancelled playback attempt cannot set prompt state on a reel that is no longer active. Manual resume requests sound on, using the media element's actual paused state.

Native upload compression, rendition selection, bounded buffering and the phone/tablet layout from previous versions are retained.

## Validation

- Targeted phone/tablet browser tests cover manual pause/resume without sound text, real permission-rejection handling, shared Home loading under each account type, no content-settings request, and removed Settings UI.
- Full playback regression suite includes these checks plus rendition fallback, sound-on activation, buffered return, constrained networks, layout/navigation bounds and desktop encoder audio.
- PostgreSQL/PGlite behaviour test reproduces the old empty viewer feed, applies the actual migration twice, confirms identical approved Home rows for viewers and creatives, confirms old cartoon/category values have no effect, and checks blocked/pending visibility.
- Application TypeScript, production web build, debug APK and unsigned release AAB build. APK uses the same development certificate for in-place update.
- Targeted ESLint retains four pre-existing `any` errors in unrelated Settings handlers and hook dependency warnings; no clean-repository lint claim.

No physical Android device was tested. Browser autoplay and native hardware-decoder behaviour can differ. The AAB is unsigned and needs the owner's upload key before Play Store submission. Source changes are local and included in the developer package; no GitHub push or hosting deployment was performed.
