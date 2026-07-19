import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given the circle fixture, when all parameters change, then their values and target dimensions drive the SVG", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  await page.getByRole("slider", { name: "Farbpräzision", exact: true }).fill("5");
  await page.getByRole("slider", { name: "Speckle-Filter", exact: true }).fill("12");
  await page.getByLabel("Zielgröße").selectOption("50");

  await expect(page.getByLabel("Farbpräzision Wert")).toHaveText("5 Bit");
  await expect(page.getByLabel("Speckle-Filter Wert")).toHaveText("12 px");
  await expect(page.getByLabel("Zielmaße")).toHaveText("128 × 128 px");
  await page.getByRole("button", { name: "Konvertieren" }).click();

  await expect(page.getByTestId("svg-output").locator("svg")).toHaveAttribute(
    "viewBox",
    "0 0 128 128",
  );
});
