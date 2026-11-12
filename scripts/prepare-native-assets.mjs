// Hosted APKs must not be bundled recursively inside the next APK.
import { rmSync } from 'node:fs';
rmSync('dist/downloads', { recursive: true, force: true });
