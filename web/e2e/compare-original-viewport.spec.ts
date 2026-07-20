import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given an original and one SVG run, when compared and navigated, then zoom and pan stay synchronized", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  await page.getByRole("button", { name: "Konvertieren" }).click();

  const originalCard = page.getByTestId("history-original-card");
  await expect(originalCard).toContainText("Original");
  await page.getByRole("button", { name: "Original als A setzen" }).click();
  await page.getByRole("button", { name: "Run 1 als B setzen" }).click();

  const layerA = page.getByTestId("compare-content-a");
  const layerB = page.getByTestId("compare-content-b");
  await expect(layerA.locator("img")).toHaveAttribute("alt", "Original circle.png");
  await expect(layerB.locator(":scope > svg")).toBeVisible();
  await page.getByRole("button", { name: "Vergrößern" }).click();
  await expect(page.getByTestId("zoom-value")).toHaveText("125%");
  await expectSharedTransform(layerA, layerB, "scale(1.25)");

  const canvas = page.getByTestId("compare-canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) {
    return;
  }
  await page.mouse.move(bounds.x + bounds.width / 4, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 4 + 30, bounds.y + bounds.height / 2 + 20);
  await page.mouse.up();

  await expectSharedTransform(layerA, layerB, "translate(30px, 20px)");
});

async function expectSharedTransform(
  layerA: import("@playwright/test").Locator,
  layerB: import("@playwright/test").Locator,
  expectedPart: string,
): Promise<void> {
  const transformA = await layerA.getAttribute("style");
  const transformB = await layerB.getAttribute("style");
  expect(transformA).toBe(transformB);
  expect(transformA).toContain(expectedPart);
}
