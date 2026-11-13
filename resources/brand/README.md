# Shared ToonlyReels icon artwork

`app-icon-master.png` is the reviewed full-bleed square artwork generated from the original `public/toonreels-icon.png` identity. The centered TR mark is approximately 44% of the canvas height, giving the launcher icon more space around the logo. There are no white outside borders or pre-rounded iOS corners.

`notification-glyph-master.png` is the generated monochrome TR-and-play-arrow notification rendition. Export discards low-alpha segmentation residue and normalizes visible RGB pixels to pure white, because Android status-bar small icons use the alpha silhouette. The full-colour large notification icon remains the shared app artwork.

Re-export all platform sizes with:

```sh
python scripts/generate-brand-assets.py
```

Pillow is required. The script does mechanical resizing, platform padding/masking and alpha-only normalization; it does not redesign the artwork. It updates public/PWA/store icons, the iOS universal 1024 catalog image (when the platform exists), and Android legacy/adaptive/themed/notification resources.

Adaptive foreground art is padded to the nominal 72dp viewport within its 108dp layer, so Android's mask does not enlarge the mark by 1.5 times relative to iOS/PWA. The adaptive background remains orange rather than the original template green or white.

Notification resources:

- Android small: `ic_stat_onesignal_default` (24dp at every density, white alpha-only glyph).
- Android full-colour large: `ic_onesignal_large_icon_default` (256px, alias `ic_onesignal_large_icon`).
- Web badge: `/notification-badge-96.png` (white alpha glyph).
- Shared full-colour icon: `/pwa-icon-192.png`, `/pwa-icon-512.png`, `/app-icon-1024.png`.

Android and iOS can apply system icon masks/tints. A full-colour status-bar glyph cannot be forced on Android; the brand silhouette is used there while the expanded notification uses the full-colour logo.
