import { expect, test } from "@playwright/test";

test("Given explicit panel modes, when the Studio reloads, then docked and collapsed regions remain configured", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("img2svg-layout-preferences"));
  await page.reload();
  await page.locator("#layout-settings summary").click();

  await page.getByLabel("Verlaufs-Layout").selectOption("docked");
  await page.getByLabel("Seitenleisten-Layout").selectOption("collapsed");
  await page.getByLabel("Header-Layout").selectOption("collapsed");

  await expect(page.locator("html")).toHaveAttribute("data-history-mode", "docked");
  await expect(page.locator("html")).toHaveAttribute("data-sidebar-mode", "collapsed");
  await expect(page.locator("html")).toHaveAttribute("data-header-mode", "collapsed");
  await expect(page.getByTestId("image-dropzone")).toBeHidden();
  await expect(page.locator("#layout-settings")).toBeVisible();

  await page.reload();

  await expect(page.getByLabel("Verlaufs-Layout")).toHaveValue("docked");
  await expect(page.getByLabel("Seitenleisten-Layout")).toHaveValue("collapsed");
  await expect(page.getByLabel("Header-Layout")).toHaveValue("collapsed");

  await page.locator("#layout-settings summary").click();
  await page.getByLabel("Seitenleisten-Layout").selectOption("standard");
  await page.getByLabel("Header-Layout").selectOption("standard");
  await expect(page.getByTestId("image-dropzone")).toBeVisible();

  const comparisonBounds = await page.locator(".comparison").boundingBox();
  const historyBounds = await page.locator(".history-panel").boundingBox();
  expect(comparisonBounds).not.toBeNull();
  expect(historyBounds).not.toBeNull();
  expect(historyBounds!.x).toBeGreaterThan(comparisonBounds!.x + comparisonBounds!.width - 1);

  await page.getByLabel("Verlaufs-Layout").selectOption("collapsed");
  await expect(page.locator("#history-content")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Verlauf" })).toBeVisible();
});
