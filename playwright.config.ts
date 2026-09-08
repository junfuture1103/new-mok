import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'tests/browser',workers:1,timeout:60000,
  use:{baseURL:'http://127.0.0.1:4190',channel:'msedge',headless:true,viewport:{width:1440,height:1000},screenshot:'only-on-failure'},
  reporter:[['list']],
  webServer:{command:'node scripts/serve.mjs',url:'http://127.0.0.1:4190',reuseExistingServer:true},
});
