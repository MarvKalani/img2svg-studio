import { expect, test } from "@playwright/test";

test("Given a fresh browser, when the start page loads, then the complete studio shell is visible", async ({
  page,
}) => {
  const javascriptErrors: Error[] = [];
  page.on("pageerror", (error) => javascriptErrors.push(error));

  await page.goto("/");

  await expect(page.getByRole("banner")).toContainText("img2svg Studio");
  await expect(page.getByRole("complementary", { name: "Konvertierungsparameter" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Arbeitsfläche" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Parameterunterschiede" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Verlauf" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toBeVisible();

  expect(await hasHorizontalOverflow(page)).toBe(false);
  expect(javascriptErrors).toEqual([]);
});

test("Given a narrow viewport, when the start page loads, then the studio has no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  expect(await hasHorizontalOverflow(page)).toBe(false);
});

async function hasHorizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}
