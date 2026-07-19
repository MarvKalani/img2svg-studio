import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const unknownShapeFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/triangle.png",
);

test("Given shape detection controls, when disabled and enabled before conversion, then the unproved contour remains the exact path fallback", async ({
  page,
}) => {
  await page.goto("/");
  const shapeSwitch = page.getByRole("switch", { name: "Native Formen aktivieren" });
  const shapeTypes = page.locator("#shape-type-options input");
  await expect(shapeSwitch).toHaveAttribute("aria-checked", "false");
  await expect(shapeTypes).toHaveCount(5);
  expect(
    await shapeTypes.evaluateAll((inputs) =>
      inputs.every((input) => (input as HTMLInputElement).disabled),
    ),
  ).toBe(true);

  await page.getByLabel("Rasterbild auswählen").setInputFiles(unknownShapeFixturePath);
  const convertButton = page.getByRole("button", { name: "Konvertieren" });
  await convertButton.click();
  const fallbackSvg = await serializedOutput(page);

  await shapeSwitch.click();
  await expect(shapeSwitch).toHaveAttribute("aria-checked", "true");
  expect(
    await shapeTypes.evaluateAll((inputs) =>
      inputs.every((input) => !(input as HTMLInputElement).disabled),
    ),
  ).toBe(true);
  await expect(page.getByRole("checkbox", { name: "Kreis erkennen" })).toBeChecked();
  await convertButton.click();

  expect(await serializedOutput(page)).toBe(fallbackSvg);
  await expect(page.getByTestId("svg-output").locator("path")).toHaveCount(1);
  await expect(
    page.getByTestId("svg-output").locator("circle, rect, ellipse, line, polygon"),
  ).toHaveCount(0);
});

async function serializedOutput(page: import("@playwright/test").Page): Promise<string> {
  return page
    .getByTestId("svg-output")
    .locator("svg")
    .evaluate((svg) => new XMLSerializer().serializeToString(svg));
}
