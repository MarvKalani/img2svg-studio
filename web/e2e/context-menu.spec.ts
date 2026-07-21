import { expect, test } from "@playwright/test";

test("Given a visible image source, when right-clicked, then only actions for the underlying source are offered", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Logo-Demo laden" }).click();
  await expect(page.locator("#compare-output")).toBeVisible();

  await page.locator("#compare-canvas").click({
    button: "right",
    position: { x: 40, y: 120 },
  });
  const menu = page.getByRole("menu", { name: "Kontextaktionen" });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem", { name: "Original öffnen" })).toBeEnabled();
  await expect(menu.getByRole("menuitem", { name: "Zauberstab" })).toHaveCount(0);

  await menu.getByRole("menuitem", { name: "Original öffnen" }).click();
  await expect(page.locator("#view-original")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("workspace-raster-preview").click({ button: "right" });
  await expect(menu.getByRole("menuitem", { name: "Zauberstab" })).toBeEnabled();
  await expect(menu.getByRole("menuitem", { name: "Hintergrund entfernen" })).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("Given a changed parameter, when its context actions run, then only it resets and its handbook topic opens", async ({
  page,
}) => {
  await page.goto("/");
  const colorPrecision = page.getByRole("slider", { name: "Farbpräzision" });
  await colorPrecision.fill("4");
  const parameter = page.locator('[data-option-key="colorPrecision"]');

  await parameter.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Kontextaktionen" });
  await expect(menu.getByRole("menuitem", { name: "Im Handbuch erklären" })).toBeEnabled();
  await expect(menu.getByRole("menuitem", { name: "Auf Standard zurücksetzen" })).toBeEnabled();
  await menu.getByRole("menuitem", { name: "Auf Standard zurücksetzen" }).click();
  await expect(colorPrecision).toHaveValue("6");

  await parameter.click({ button: "right" });
  await expect(menu.getByRole("menuitem", { name: "Auf Standard zurücksetzen" })).toBeDisabled();
  await menu.getByRole("menuitem", { name: "Im Handbuch erklären" }).click();
  await expect(page.getByRole("heading", { name: "Interaktives Handbuch" })).toBeVisible();
  await expect(page.locator("#context-help-title")).toHaveText("Farbpräzision");
});

test("Given changed native-shape parameters, when reset individually, then each canonical default is restored", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Logo-Demo laden" }).click();
  const menu = page.getByRole("menu", { name: "Kontextaktionen" });
  const detection = page.getByRole("switch", { name: "Native Formen aktivieren" });
  const circle = page.getByRole("checkbox", { name: "Kreis erkennen" });
  await page.locator('[data-option-key="shapeCircle"]').click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Auf Standard zurücksetzen" }).click();
  await expect(circle).toBeChecked();

  await page.locator('[data-option-key="shapeCircle"]').click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Im Handbuch erklären" }).click();
  await page.waitForTimeout(100);
  await expect(page.locator("#context-help-title")).toHaveText("Kreis erkennen");

  await detection.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Auf Standard zurücksetzen" }).click();
  await expect(detection).toHaveAttribute("aria-checked", "false");
});
