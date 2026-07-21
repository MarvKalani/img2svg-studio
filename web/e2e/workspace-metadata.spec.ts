import { expect, test } from "@playwright/test";

test("Given a live vector preview, when workspace information is opened, then size and conversion metrics are visible", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Logo-Demo laden" }).click();

  const information = page.locator("#workspace-metadata");
  await expect(information).toBeVisible();
  await expect(information.locator("summary")).toContainText(/SVG · [\d,.]+ (?:KiB|MiB)/);
  await information.locator("summary").click();
  await expect(information).toContainText("Abmessungen");
  await expect(information).toContainText("Pfade");
  await expect(information).toContainText("Rechenzeit");
});
