import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "submission-screenshots.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "chrome",
    viewport: { height: 1200, width: 1920 },
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    reuseExistingServer: true,
    url: "http://127.0.0.1:4173",
  },
});
