# Feed layout and Auth logo — 0.1.8

Home/Toonz now has a 12px inset below the existing safe top edge. The player height accounts for that inset, so moving it lower does not push controls beneath the mobile navigation. The feed's reserved navigation space is black rather than the page's white background. Tablet sidebar placement and Android system-bar insets are retained.

Videos use their uploaded aspect ratio with `object-fit: contain` on phones as well as tablets. The full portrait, landscape or square frame fits within the available player; it is not stretched or cropped to fill the phone. Wider clips naturally have black space above and below. Existing creator/action/progress overlays remain.

Auth now displays the shared ToonlyReels logo at 80px with rounded corners and a light shadow, replacing the generic play symbol on both sign-in and sign-up.

Validation: TypeScript, Android debug/release APK and AAB builds, APK signatures and bundletool validation passed. Existing feed startup/swipe checks passed for viewer and creator accounts at 390×844 and 820×1180, using real portrait and landscape MP4 fixtures. Checks cover the inset, full-frame sizing mode, navigation clearance, sound-on playback and advancing to the next reel. The real Auth component was separately checked and captured at both sizes after its entrance animation; the logo loaded with rounded corners and no horizontal overflow. Supabase data was mocked in browser checks. No physical Android device was available.

No SQL or backend change is needed for this layout update. Existing OneSignal deployment and FCM requirements remain unchanged. Install the development update APK over earlier development builds, or the signed APK over an earlier release-signed APK. The existing signing certificates are retained; this update does not create another key. PWA files require HTTPS hosting.
