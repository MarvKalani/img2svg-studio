import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const screenshotDirectory = resolve(import.meta.dirname, "../docs/screenshots");

test("Given a completed comparison, when submission screenshots are captured, then they show the judge workflow", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Beispiel laden" }).click();
  await page.getByRole("switch", { name: "Native Formen aktivieren" }).click();
  const convertButton = page.getByRole("button", { name: "Konvertieren" });
  await convertButton.click();
  await page.getByRole("slider", { name: "Farbpräzision", exact: true }).fill("5");
  await convertButton.click();
  await page.getByRole("button", { name: "Run 1 als A setzen" }).click();
  await page.getByRole("button", { name: "Run 2 als B setzen" }).click();

  await expect(page.getByTestId("diff-setting-row")).toHaveCount(1);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: resolve(screenshotDirectory, "app-shell.png"),
  });
  await page.locator("main.workspace").screenshot({
    animations: "disabled",
    path: resolve(screenshotDirectory, "comparison-workflow.png"),
  });
});
