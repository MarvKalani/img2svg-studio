import { expect, test } from "@playwright/test";

test("Given adjusted settings, when a named preset is saved and reloaded, then the visible controls recover it", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("img2svg-conversion-presets"));
  await page.reload();

  await page.getByRole("slider", { name: "Farbpräzision", exact: true }).fill("4");
  await page.getByLabel("Name für eigene Einstellung").fill("Mein Logo");
  await page.getByRole("button", { name: "Preset speichern" }).click();
  await expect(page.getByLabel("Preset", { exact: true })).toHaveValue("saved:Mein Logo");

  await page.getByRole("slider", { name: "Farbpräzision", exact: true }).fill("7");
  await page.getByLabel("Preset", { exact: true }).selectOption({ label: "Mein Logo" });
  await expect(page.getByRole("slider", { name: "Farbpräzision", exact: true })).toHaveValue("4");

  await page.reload();
  await page.getByLabel("Preset", { exact: true }).selectOption({ label: "Mein Logo" });
  await expect(page.getByRole("slider", { name: "Farbpräzision", exact: true })).toHaveValue("4");
});
