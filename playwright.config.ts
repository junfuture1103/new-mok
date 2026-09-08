import {defineConfig} from '@playwright/test';
const baseURL=`http://127.0.0.1:4190${process.env.NEXT_PUBLIC_BASE_PATH||''}/`;
export default defineConfig({
  testDir:'tests/browser',workers:1,timeout:60000,
  use:{baseURL,channel:'msedge',headless:true,viewport:{width:1440,height:1000},screenshot:'only-on-failure'},
  reporter:[['list']],
  webServer:{command:'node scripts/serve.mjs',url:baseURL,reuseExistingServer:true},
});
