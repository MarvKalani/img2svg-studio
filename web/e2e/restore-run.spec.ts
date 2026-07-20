import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given two runs, when older options are restored and converted, then form and SVG exactly match the older run", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  const convertButton = page.getByRole("button", { name: "Konvertieren" });
  await convertButton.click();
  const originalSvg = await serializedOutput(page);

  await page.getByRole("slider", { name: "Farbpräzision", exact: true }).fill("4");
  await page.getByRole("slider", { name: "Speckle-Filter", exact: true }).fill("12");
  await page.getByLabel("Rastergröße vor Tracing").selectOption("percent-200");
  await page.getByLabel("Rasterfilter").selectOption("grayscale");
  await page.getByLabel("Zielgröße").selectOption("50");
  await convertButton.click();
  await expect(page.locator('[data-run-id="2"]')).toBeVisible();

  await page.locator('[data-run-id="1"]').click();
  await page.getByRole("button", { name: "Einstellungen übernehmen" }).click();

  await expect(page.getByRole("slider", { name: "Farbpräzision", exact: true })).toHaveValue("7");
  await expect(page.getByRole("slider", { name: "Speckle-Filter", exact: true })).toHaveValue("4");
  await expect(page.getByLabel("Rastergröße vor Tracing")).toHaveValue("original");
  await expect(page.getByLabel("Rasterfilter")).toHaveValue("color");
  await expect(page.getByLabel("Zielgröße")).toHaveValue("100");
  await expect(page.getByLabel("Zielmaße")).toHaveText("256 × 256 px");
  expect(
    await page
      .getByLabel("Rasterbild auswählen")
      .evaluate((input: HTMLInputElement) => input.files?.length),
  ).toBe(1);
  expect(await serializedOutput(page)).toBe(originalSvg);

  await convertButton.click();

  expect(await serializedOutput(page)).toBe(originalSvg);
  await expect(page.locator('[data-run-id="3"]')).toContainText("256 × 256");
});

async function serializedOutput(page: import("@playwright/test").Page): Promise<string> {
  return page
    .getByTestId("svg-output")
    .locator("svg")
    .evaluate((svg) => new XMLSerializer().serializeToString(svg));
}
