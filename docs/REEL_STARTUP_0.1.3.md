# Reels startup and layout — 0.1.3

No database changes are needed for this update. Existing approval, cartoon-only and category settings are preserved.

## Changes

- Home no longer waits for profile, role or follow lookups. Only the session and content-preference check precede the feed request. Server RLS continues enforcing blocked creators and visibility.
- Removed obsolete Following-tab fetch/filter code after the tabs were removed. Stable feed ordering keeps adjacent buffers useful.
- The active video requests automatic buffering and plays immediately. Inactive neighbours pause and mute while retaining their existing source/buffer. The feed still mounts only the current reel and its immediate neighbours.
- After playback starts, only the next reel may load metadata. Save-data and slow-network flags disable this warmup. No background video is played for preloading.
- Network stall events no longer seek/reload the video and discard partial downloads. Actual media errors still use bounded fallback through the available sources.
- The mobile breakpoint is correct on the first render. Trending-tag requests wait until playback starts.
- Phone video fills the available area, starts at the safe top, and ends above bottom navigation, reserving 112 CSS pixels for the bar and raised upload button. Tablet sidebar and contained video framing remain.
- Branding is smaller, near the top left, in a standalone rounded, dark translucent bubble.
- Android explicitly lays out edge-to-edge, then applies native status-bar, cutout, navigation and keyboard insets once. Capacitor's separate CSS inset handler is disabled. Visible system bars use white indicators over a black background.

## Evidence

The startup test mounts the real Feed with synthetic media, mocked Supabase responses and required context providers. Profile/role/follow/block requests are held pending. The earlier indexed Feed never requests video rows within the four-second assertion window while those calls are held. The new Feed plays before the held requests are released, then advances to the next reel with sound and pauses the previous one.

The initial test-harness runs were invalid because ThemeProvider was missing. They are excluded from the baseline evidence. `startup-before-valid.json` uses the required providers and the earlier indexed Feed; it fails at the feed-request assertion as expected. The final suite exercises the updated implementation.

All 23 controlled tests pass: one desktop audio-preserving encoder audit and eleven scenarios each at 390×844 and 820×1180, including buffering/fallback, sound-on replay, network stalls, startup request ordering, brand bounds, reel paging and phone navigation separation. Source TypeScript checking and production/Android builds pass. APK signature matches 0.1.2 for in-place installation.

## Installation

Install `ToonlyReels-0.1.3-debug.apk` over the previous debug build. Do not uninstall or clear app data to update; keeping app data preserves local login state. The archive also includes an unsigned AAB, which needs the owner's upload key for Play Store submission.

## Remaining limits

These are Linux Chromium viewport checks, not physical Android tests. Native system-bar behaviour, audible playback and hardware-decoder performance still require device testing.

The public Supabase key received HTTP 401 / permission denied reading video records anonymously. No authenticated production clip URLs were supplied, so the four actual uploads were not inspected, recompressed or backfilled. Existing mobile uploads still lack guaranteed low/medium/high renditions; the browser encoder skips touch devices. A large original or unsupported codec can still load slowly. UI and startup fixes cannot promise instant playback on every connection or device.

No SQL was applied to production and no source was pushed. The PWA archive is deployable output, not an existing live hosting URL.
