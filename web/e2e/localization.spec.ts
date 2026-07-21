import { expect, test } from "@playwright/test";

test("Given the Studio, when English is selected, then static and dynamic workflow text switches consistently and German remains available", async ({
  page,
}) => {
  await page.goto("/");

  const language = page.getByLabel("Sprache / Language");
  await expect(language).toHaveValue("de");
  await language.selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Raster before tracing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose image" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept variant" })).toBeDisabled();
  await page.locator('[data-option-key="colorPrecision"]').click({ button: "right" });
  const contextMenu = page.getByRole("menu", { name: "Context actions" });
  await expect(contextMenu.getByRole("menuitem", { name: "Explain in handbook" })).toBeVisible();
  await expect(contextMenu.getByRole("menuitem", { name: "Reset to default" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Load logo demo" }).click();
  await expect(page.locator("#status-variant-count")).toHaveText("0 variants · 1 draft");
  await page.locator('[data-option-key="shapeCircle"]').click({ button: "right" });
  await contextMenu.getByRole("menuitem", { name: "Explain in handbook" }).click();
  await page.waitForTimeout(100);
  await expect(page.locator("#context-help-title")).toHaveText("Detect circle");
  await expect(page.locator("#context-help-default")).toHaveText("Default: On");
  await page.getByRole("button", { name: "Close handbook" }).click();
  await page.getByRole("button", { name: "Accept variant" }).click();
  await expect(page.getByRole("button", { name: "Delete run 1" })).toBeVisible();
  await expect(page.locator("#status-variant-count")).toHaveText("1 variant");
  await expect(page.locator("#status-image")).toContainText("Variant 1 accepted");

  await page.getByRole("button", { name: "AI Manager" }).click();
  const modnet = page.locator('[data-model-id="modnet"]');
  await expect(modnet).toContainText("Remove background");
  await expect(modnet.locator(".model-status")).toHaveText("Not loaded");

  await language.selectOption("de");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.getByRole("heading", { name: "Raster vor Tracing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run 1 löschen" })).toBeVisible();
  await expect(page.locator("#status-variant-count")).toHaveText("1 Variante");
});
