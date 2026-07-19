import { defineConfig } from "@playwright/test";

const localDemoUrl = "http://127.0.0.1:4173";
const deployedDemoUrl = process.env.IMG2SVG_DEMO_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "deployed-demo.spec.ts",
  use: {
    baseURL: deployedDemoUrl ?? localDemoUrl,
    browserName: "chromium",
    channel: "chrome",
  },
  webServer: deployedDemoUrl
    ? undefined
    : {
        command: "npm run preview -- --host 127.0.0.1 --port 4173",
        reuseExistingServer: true,
        url: localDemoUrl,
      },
});
