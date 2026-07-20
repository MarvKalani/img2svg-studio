import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given a raster image, when resized and filtered before conversion, then VTracer receives the prepared pixels", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  await page.getByLabel("Rastergröße vor Tracing").selectOption("percent-200");
  await expect(page.getByLabel("Vorbereitete Rastermaße")).toHaveText("512 × 512 px");
  await page.getByLabel("Rastergröße vor Tracing").selectOption("height-576");
  await page.getByLabel("Rasterfilter").selectOption("monochrome");
  await page.getByRole("slider", { name: "Schwarzweiß-Schwellwert" }).fill("128");

  await expect(page.getByLabel("Vorbereitete Rastermaße")).toHaveText("576 × 576 px");
  await expect(page.getByLabel("Zielmaße")).toHaveText("576 × 576 px");
  await page.getByRole("button", { name: "Variante übernehmen" }).click();

  const output = page.getByTestId("svg-output");
  await expect(output.locator("svg")).toHaveAttribute("viewBox", "0 0 576 576");
  const tracedColors = await output
    .locator("path")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("fill") ?? ""));
  expect(tracedColors.length).toBeGreaterThan(0);
  expect(
    tracedColors.every((color) => {
      const channels = /^#([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})$/u.exec(color);
      return channels?.[1] === channels?.[2] && channels?.[2] === channels?.[3];
    }),
  ).toBe(true);
  await expect(page.locator('[data-run-id="1"]')).toContainText("576 × 576");
});
