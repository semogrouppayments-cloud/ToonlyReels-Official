# Android upload compression — 0.1.4

No new database migration is required for automatic compression of future uploads.

## App behaviour

The Android APK now tries to reduce videos of at least 8 MiB before uploading. It copies the chosen file to scoped native cache in 256 KiB chunks, then uses AndroidX Media3 Transformer 1.8.0 / MediaCodec to produce H.264 MP4 with AAC audio. The target is at most 854 pixels high, roughly 750 kbps video plus 80 kbps audio, with two-second keyframe intervals. Codec fallback is enabled. It does not upload the original as a second high-quality copy.

Files already below approximately 1 Mbps at the target height are skipped. The result is accepted only when at least 10% smaller. A larger result, unavailable codec, insufficient temporary storage, or encoder failure keeps the original. If the input has audio, a completed native export without AAC audio/channel information is rejected. Native export has a five-minute timeout, and cache files/listeners are released after use or cancellation.

The screen shows Checking video, Preparing smaller video, then Uploading. Compression progress comes from the native encoder. Network-upload progress remains an explicitly labelled estimate. Conversion takes time and uses battery; stay in the app while preparing. Navigation away cancels an in-flight conversion. Duplicate submits are blocked during validation/preparation/upload.

Successful compression changes the actual file sent to Storage, filename extension and MIME type. Thumbnail generation uses that prepared file. Native uploads do not also start the desktop canvas encoder. The app keeps the phone/tablet layout, top bubble and navigation spacing from 0.1.3.

Browser/PWA and iOS uploads do not use this Android plugin. The existing desktop background rendition generator remains. This change produces one smaller primary upload, not a guaranteed three-quality ladder for every future upload.

## Verification

- Application TypeScript, production web build, debug APK and unsigned release bundle build.
- Eight Chromium checks across phone/tablet viewport sizes: upload waits for native conversion, submitted multipart File is the smaller MP4, fallback sends the original File, no whole-file bridge payload, listener/cache release, larger-result rejection, and cancellation without returning an upload File. The native bridge is mocked in these checks.
- Existing 23 playback regressions run separately. Actual-reel comparison is separate again.

No physical Android device or Android emulator was available. The Android plugin compiles and the bridge contract is tested, but actual hardware encoding, its speed, quality, audio output and device support still need a phone test. The FFmpeg results for the supplied existing clip are not a test of the Android encoder.

## Supplied existing reel

The original file is 29,909,377 bytes, 720×1280, 25 fps, H.264 High video with AAC stereo, about 106.643 seconds and 2.244 Mbps. Its server supports byte ranges. It is already indexed at the front but is fragmented, with a large initial media fragment. The supplied clip therefore needs smaller media as well as app-side startup fixes.

Actual offline encodes with audio:

| Rendition | Dimensions | Bytes | Average total bitrate |
| --- | --- | ---: | ---: |
| Low | 360×640 | 6,677,321 | 500,910 bps |
| Medium | 480×854 | 10,739,213 | 805,619 bps |
| High | 720×1280 | 17,388,321 | 1,304,413 bps |

The separate clip package contains these three files and guarded activation SQL. None has been uploaded to the live bucket or linked in the production database.

Using the real player and clip over local HTTP constrained to 1 Mbps / 150 ms latency, the original showed no first decoded frame within 15 seconds in either viewport. Low showed its first frame at approximately 1.31 seconds (phone-sized) and 1.41 seconds (tablet-sized), with an audio track and audible playback requested. About 13.5 seconds were played during each 15-second low observation. These are controlled Linux Chromium tests, not phone or Supabase-CDN timing guarantees.

The activation SQL was checked with PostgreSQL through PGlite: missing files block activation, only the matching reel changes, original/custom metadata remain, and repeat execution succeeds. It does not approve videos or change cartoon/category settings.

## Install

Install the 0.1.4 debug APK over the previous development APK. Keep app data to retain local login state. The AAB is unsigned and requires the owner's upload key for Play Store submission. Source changes are local and included in the developer archive; no GitHub push or live hosting deployment was performed.
