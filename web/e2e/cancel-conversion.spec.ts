import { expect, test } from "@playwright/test";

test("Given a slow preview is pending, when it is cancelled, then work stops and the user can restart it", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Topografie-Demo laden" }).click();
  await page.getByRole("button", { name: "Abbrechen" }).click();

  await expect(page.locator("#conversion-progress")).toBeHidden();
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText(
    "Vorschau abgebrochen",
  );
  const restart = page.getByRole("button", { name: "Vorschau neu starten" });
  await expect(restart).toBeEnabled();

  await restart.click();

  await expect(page.locator("#compare-content-b svg")).toBeVisible();
  await expect(page.getByRole("button", { name: "Variante übernehmen" })).toBeEnabled();
});
