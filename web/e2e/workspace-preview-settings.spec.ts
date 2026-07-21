import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given an SVG draft, when preview size and workspace color change, then the chosen view persists without changing the SVG", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  await page.locator("#icon-preview").getByText("Icon-Vorschau").click();

  const sourceViewBox = await page.getByTestId("svg-output").locator("svg").getAttribute("viewBox");
  await page.getByLabel("Vorschaugröße").selectOption("128");
  const frame = page.getByTestId("icon-preview-frame");
  await expect(frame).toHaveCSS("width", "128px");
  await expect(frame).toHaveCSS("height", "128px");
  await expect(frame.locator("svg")).toHaveAttribute("viewBox", sourceViewBox ?? "");

  await page.getByLabel("Arbeitsflächenfarbe", { exact: true }).selectOption("black");
  await expect(page.locator("#comparison-stage")).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(frame).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(page.getByTestId("svg-output").locator("svg")).toHaveAttribute(
    "viewBox",
    sourceViewBox ?? "",
  );

  await page.reload();
  await expect(page.getByLabel("Arbeitsflächenfarbe", { exact: true })).toHaveValue("black");
  await expect(page.locator("#comparison-stage")).toHaveCSS("background-color", "rgb(0, 0, 0)");

  await page.locator("#icon-preview").getByText("Icon-Vorschau").click();
  await page.getByLabel("Arbeitsflächenfarbe", { exact: true }).selectOption("custom");
  await page.getByLabel("Eigene Arbeitsflächenfarbe").fill("#1a2b3c");
  await expect(page.locator("#comparison-stage")).toHaveCSS("background-color", "rgb(26, 43, 60)");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.locator("#icon-preview").getByText("Icon-Vorschau").click();
  await page.getByLabel("Vorschaugröße").selectOption("512");
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(0);
});
