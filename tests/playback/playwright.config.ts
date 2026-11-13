import path from 'node:path';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 45_000,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: process.env.PLAYBACK_RESULTS || 'tests/playback/test-results/results.json' }]],
  outputDir: path.resolve(process.env.PLAYBACK_ARTIFACTS || 'tests/playback/test-results/artifacts'),
  use: {
    baseURL: 'http://127.0.0.1:8080',
    headless: true,
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ['--autoplay-policy=no-user-gesture-required'] } : {},
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone-sized-chromium', testMatch: 'playback.spec.ts', dependencies: ['desktop-encoder-audit'], use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'tablet-sized-chromium', testMatch: 'playback.spec.ts', dependencies: ['desktop-encoder-audit'], use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    { name: 'desktop-encoder-audit', testMatch: 'generator.spec.ts', use: { viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
