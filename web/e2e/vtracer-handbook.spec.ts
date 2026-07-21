import { expect, test } from "@playwright/test";

test("Given advanced tracing controls, when changed and reset, then live preview and canonical defaults remain accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Logo-Demo laden" }).click();
  await expect(page.locator("#compare-content-b svg")).toBeVisible();

  await expect(page.getByText("10 Tracing-Parameter")).toBeVisible();
  await page.getByText("Erweiterte Parameter · 7").click();
  const gradientStep = page.getByRole("slider", { name: "VTracer-Verlaufsschritt" });
  await gradientStep.fill("48");
  await expect(page.locator("#layer-difference-value")).toHaveText("48");
  await expect(page.locator("#conversion-preset")).toHaveValue("custom");

  await page.getByRole("button", { name: "Standardwerte" }).click();
  await expect(gradientStep).toHaveValue("16");
  await expect(page.getByRole("combobox", { name: "VTracer-Kurvenmodus" })).toHaveValue("spline");
  await expect(page.locator("#path-precision")).toHaveValue("2");
});

test("Given the handbook, when contextual help is enabled or disabled, then hover explanations follow that state", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Handbuch" }).click();
  await expect(page.getByRole("heading", { name: "Interaktives Handbuch" })).toBeVisible();

  await page.locator('[data-help-key="filterSpeckle"]').hover();
  await expect(page.locator("#context-help-title")).toHaveText("Speckle-Filter");
  await expect(page.locator("#context-help-default")).toHaveText("Standard: 4 px");

  await page.getByRole("switch", { name: /Hilfe beim Überfahren/ }).click();
  await page.locator('[data-help-key="colorPrecision"]').hover();
  await expect(page.locator("#context-help-title")).toHaveText("Speckle-Filter");
});
