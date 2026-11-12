import { defineConfig } from '@playwright/test';
import shared from './playwright.config';

export default defineConfig({
  ...shared,
  testMatch: 'push-notifications.spec.ts',
  projects: [
    { name: 'push-phone-sized', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'push-tablet-sized', use: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
  ],
});
