import { defineConfig } from "@playwright/test";

const testedHardwareProfile = JSON.stringify({
  deviceMemoryGigabytes: 8,
  hardwareConcurrency: 10,
  initialRasterScale: 100,
  measurementMilliseconds: 6,
  schemaVersion: 1,
});

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "chrome",
    launchOptions: {
      args: ["--enable-features=WebMCP"],
    },
    storageState: {
      cookies: [],
      origins: [
        {
          localStorage: [
            {
              name: "img2svg-hardware-profile-v1",
              value: testedHardwareProfile,
            },
          ],
          origin: "http://127.0.0.1:4173",
        },
      ],
    },
  },
  webServer: {
    command: "npm run dev -- --port 4173",
    reuseExistingServer: true,
    url: "http://127.0.0.1:4173",
  },
});
