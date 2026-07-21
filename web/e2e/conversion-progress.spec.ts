import { expect, test } from "@playwright/test";

test("Given a local conversion, when VTracer runs, then native progress is visible until the preview is ready", async ({
  page,
}) => {
  await page.goto("/");
  const progress = page.getByRole("status", { name: "Tracing-Fortschritt" });

  await page.getByRole("button", { name: "Topografie-Demo laden" }).click();
  await expect(progress).toBeVisible();
  await expect(page.locator("#conversion-progress-label")).toHaveText(
    /Farbflächen erkennen|Ausschnitte aufbereiten|SVG-Konturen erzeugen/u,
  );
  await expect(page.locator("#conversion-progress-detail")).not.toHaveText("…");
  await expect(page.locator("#status-image")).toContainText("Vorschau bereit", {
    timeout: 15_000,
  });
  await expect(progress).toBeHidden();
});

test("Given English is active, when tracing progresses, then the live status is translated", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Sprache / Language").selectOption("en");
  const progress = page.getByRole("status", { name: "Tracing progress" });

  await page.getByRole("button", { name: "Load logo demo" }).click();
  await expect(progress).toBeVisible();
  await expect(page.locator("#conversion-progress-label")).toHaveText(
    /Detecting color areas|Creating SVG contours/u,
  );
  await expect(page.locator("#status-image")).toContainText("Preview ready", {
    timeout: 10_000,
  });
  await expect(progress).toBeHidden();
});
