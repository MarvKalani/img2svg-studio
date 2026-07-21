import { expect, test } from "@playwright/test";

const storageKey = "img2svg-hardware-profile-v1";

test("Given no hardware profile, when the Studio starts twice, then one measured start scale is persisted and reused", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload();

  const storedProfile = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(storedProfile).not.toBeNull();
  const profile = JSON.parse(storedProfile ?? "null") as { initialRasterScale: number };
  expect([25, 50, 75, 100]).toContain(profile.initialRasterScale);
  await expect(page.getByLabel("Rastergröße vor Tracing")).toHaveValue(
    profile.initialRasterScale === 100
      ? "original"
      : `percent-${String(profile.initialRasterScale)}`,
  );
  await expect(page.locator("#hardware-profile-summary")).toContainText("Einmalig gemessen");

  await page.reload();

  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(storedProfile);
});
