import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'.',
 testMatch:'reward-box-ui.spec.mjs',
 retries:0,
 timeout:30000,
 use:{baseURL:'http://127.0.0.1:4173',viewport:{width:390,height:844},isMobile:true,hasTouch:true},
 webServer:{
  command:'npm run dev -- --host 127.0.0.1 --port 4173',
  url:'http://127.0.0.1:4173/reward-box/index.html',
  timeout:120000,reuseExistingServer:!process.env.CI
 },
 reporter:'line'
});