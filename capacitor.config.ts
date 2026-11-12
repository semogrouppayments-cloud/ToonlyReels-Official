import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.semogroup.toonlyreels',
  appName: 'ToonlyReels',
  webDir: 'dist',
  plugins: {
    // MainActivity applies native system-bar/keyboard insets once for every page.
    SystemBars: { insetsHandling: 'disable', style: 'DARK', hidden: false },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
