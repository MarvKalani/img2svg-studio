import type { Page } from "@playwright/test";

export async function emulateGpuFeatures(page: Page, features: readonly string[]): Promise<void> {
  await page.addInitScript(
    (enabledFeatures) => {
      Object.defineProperty(navigator, "gpu", {
        configurable: true,
        value: {
          requestAdapter: async () => ({ features: new Set(enabledFeatures) }),
        },
      });
    },
    [...features],
  );
}
