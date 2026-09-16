import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: ['**/online-audit.spec.ts', '**/play.spec.ts'],
  use: { ...base.use, browserName: 'firefox', channel: undefined },
});
