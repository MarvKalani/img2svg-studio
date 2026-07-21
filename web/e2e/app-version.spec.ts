import { expect, test } from "@playwright/test";

test("Given the Studio is loaded, when the footer is shown, then the dated release is visible", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.locator("#app-version")).toHaveText("260721.03");
  await expect(page.locator("html")).toHaveAttribute("data-app-version", "260721.03");
});
