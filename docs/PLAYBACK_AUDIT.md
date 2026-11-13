# Toonz upload/playback audit — 11 November 2026

Base: `cda4167fde784ae40760dc18b7a6330f9d212f77`.

## What changed

Only the playback fallback logic in `src/components/VideoPlayer.tsx` changed. It now remembers failed source URLs, tries an unfailed fallback, and stops once all sources fail. The history clears for a different video or explicit quality change. No player markup, CSS, phone/tablet breakpoints, controls, navigation, or new product features changed. The existing HTML video player remains in place.

## Trace: upload to mobile playback

- `Upload.tsx` uploads the original, inserts a video record, and starts `uploadPlaybackVariants()` without waiting. Navigation to the feed follows after 500 ms. Transcription is separate and does not encode video.
- `toonVariantGenerator.ts` performs actual canvas/MediaRecorder encoding in the upload browser. It skips generation if there are any touch points **or** the viewport is at most 1024 px wide. Eligible desktop browsers can generate low (640 px long edge, 520 kbps target), and medium (854 px long edge, 900 kbps target) only when the input exceeds 35 MiB. Empty results and results at least 92% of original size are discarded. No high rendition is generated.
- Both encodes finish before the caller starts uploading the results as WebM objects. The URLs are saved in `videos.video_variants` using `update_video_variants()`, which checks ownership/admin status. The caller does not check that RPC's returned error. This is not a durable server processing queue: closing the page/browser can interrupt generation.
- `Feed.tsx` passes the record and its variants to the player. It renders the active reel and its neighbours and skips adjacent-media preloading on touch/constrained/PWA views. On touch views only the active video has its source attached.
- `toonPlayback.ts` chooses available URLs, not new encodes:

| Mode | Preference order |
| --- | --- |
| Auto on touch/constrained/PWA | low → tiny → medium → original |
| SD/medium | low → tiny → medium → original |
| HD/high or unconstrained desktop Auto | high → original → medium → low → tiny |

Labels do not guarantee resolution. Auto is a source preference based on flags, not continuous adaptive bitrate streaming. There is no server transcoding worker or HLS/DASH ladder in this pipeline.

## Existing hosted records: read-only observations

An anonymous metadata query returned **15 accessible records, all with empty `video_variants`**. None had low, medium, high, tiny, or original variant entries. These records use their original video on mobile too.

HEAD requests to three originals returned HTTP 200, MP4 content type, and byte-range support. Their sizes were **105,641,250; 104,912,173; and 68,695,292 bytes**. These header checks do not establish real-device playback performance. Customer clips were not downloaded for reproduction, and no production uploads, database writes, or deployments were performed.

## Controlled reproduction and fix

With low and medium fixture URLs returning 404 but a working original available, the old player stayed at playback time zero:

| Chromium touch viewport | Baseline media errors | Baseline source loads |
| --- | ---: | ---: |
| Phone-sized 390×844 | 344 | 345 |
| Tablet-sized 820×1180 | 798 | 799 |

It repeatedly chose the other failed rendition and never reached the original. The minimal fix excludes every URL already failed, after normalizing relative/absolute URLs. The regression reaches the original after exactly two variant failures. A separate terminal-failure test verifies exactly one request per low/medium/original candidate rather than an endless loop.

**The fallback loop alone cannot explain freezes in the current original-only records**, because they have no variant chain. A separate test at 1 Mbps and 150 ms latency shows bandwidth starvation: the 6.15 MB synthetic original repeatedly enters `waiting` and advances about 1.3 seconds over ten seconds. The 0.75 MB low H.264 comparison fixture completes its eight-second played range at the same limit. Played ranges, rather than `currentTime` alone, distinguish successful looping from buffering.

The desktop production encoder was also executed on a synthetic eight-second MP4 padded above 35 MiB to exercise medium creation. Padding affects size, not bitrate/duration. FFprobe confirmed actual VP9 WebM results at **360×640 and 480×854, both video-only with no audio track**. No high file was created. The generated low WebM plays in both tested Chromium touch views. This encoder/audio finding was documented, not changed in the minimal fallback fix.

## Validation and limits

The standalone suite under `tests/playback/` covers source selection, actual generated-low playback, existing HD/SD controls, active/inactive transitions, failed-source fallback, terminal failures, constrained-network delivery, and player bounds in both viewports. Fixture media is synthetic, Supabase HTTP requests are intercepted, and no real accounts are needed. See its README for commands and prerequisites.

**All 19 checks passed** (one desktop encoder audit plus nine scenarios in each touch viewport). Production build and application TypeScript checking pass with the installed audit dependencies. The changed player file has zero lint errors and four pre-existing hook warnings. Unrelated repository install/lockfile and default Playwright-config problems remain outside this narrowed repair.

The fix does not shrink existing originals, create missing renditions, repair generated audio, or establish compatibility with every device. A different player library cannot generate the missing media ladder. Durable, audio-preserving mobile-compatible encoding and backfilling existing originals would require a separate change.

**No physical Android/iPhone/iPad/tablet or Safari was tested.** These are responsive Chromium checks, not a claim that real-device lag is fixed. Actual clips, hardware decoders, codec support, memory pressure, connection changes, and PWA/backgrounding need device validation. No source changes have been pushed or deployed.


## Saved evidence

- [Sanitized metrics and media events](playback-evidence.json)
- Phone-sized fallback: [before](playback-phone-before.png), [after](playback-phone-after.png)
- Tablet-sized fallback: [before](playback-tablet-before.png), [after](playback-tablet-after.png)

Screenshots show the unchanged player UI over a synthetic fixture. They do not show a physical device or an actual user clip.
