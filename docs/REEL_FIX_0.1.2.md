# Reels and profile update, 0.1.2

- Active reels always request audible playback. Inactive reels are paused/muted. The Android WebView allows media without a gesture; browsers can still require a tap. A custom Play with sound button handles rejection without silently muting.
- Removed home quality/settings and sound buttons and For You/Following tabs. The existing HTML media decoder is retained, with custom UI, a transparent poster, and an Android default-poster override that keeps Capacitor permissions/file selection support.
- Removed the playback readiness delay; use the play promise. The existing bounded rendition fallback remains. Mobile still cannot create low/medium/high files; a server transcoder is still needed for consistent startup on slow networks. No instant playback or all-device guarantee.
- Reel heights use actual scroll viewport measurements. Native system bar/cutout insets apply to the entire WebView. PWA uses CSS safe areas. Tablet sidebar and phone navigation remain.
- Upload preview uses custom play/pause instead of Android controls. Username input uses theme background/foreground and saves only after the database confirms the updated row, with uniqueness/error feedback.
- Active reel likes/comments and open comment/reply threads subscribe to Realtime, refresh on subscription, and poll every 15 seconds as fallback. Profile counts refresh on video changes. Deleted comments have an unfiltered delete subscription because Realtime delete filters cannot rely on non-key columns.
- Views are atomically deduplicated in a private table per authenticated user/video for a rolling 24 hours; timestamps are server-controlled.
- Cartoon-only is a reviewed classification, not a title/hashtag guess. Default category is Learning; parents can choose Music, Adventure, Comedy too in Settings → Safety & Content. Empty selections cannot be saved. Existing unclassified videos stay hidden from the viewer feed. Creators can still inspect their own uploads on Profile.
- New full-bleed store icon is 512×512; PWA icons are 192/512, adaptive Android assets use matching orange background.

## Database rollout

Already applied the November 11 schema? Run only `20261112000000_reel_safety_and_views.sql` in the Supabase SQL editor. New project? Run the combined fresh SQL (both migrations in timestamp order). Never rerun the original baseline on an existing project.

An administrator must review/classify existing videos before cartoon-only viewers can see them, e.g. after confirming the clip is a kids' learning cartoon:

```sql
-- Run as the Supabase SQL editor/database administrator after actual review.
UPDATE public.videos SET is_kids_cartoon=true, content_category='learning'
WHERE id='REPLACE-WITH-THE-REVIEWED-VIDEO-UUID';
```

A signed-in app admin can use `classify_kids_cartoon` RPC. Neither uploader tags nor title text can grant this status. Classification does not approve moderation automatically.

## Limits

Browser automation is on Linux Chromium at phone/tablet viewport sizes, not a physical Android phone/tablet. No physical-device poster/system-bar/playback confirmation. Supabase SQL is provided, not remotely applied. Debug APK is for testing; unsigned release bundle must be signed with your Play Store upload key before submission. No hosting URL was created.
