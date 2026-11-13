import { defineConfig } from '@playwright/test';
import shared from './playwright.config';

export default defineConfig({
  ...shared,
  testMatch: 'actual-reel.spec.ts',
  timeout: 90_000,
  projects: [
    { name: 'actual-phone-sized', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'actual-tablet-sized', use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
  ],
});
