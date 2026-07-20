import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given two runs, when assigned by keyboard, then the movable divider reveals A left and B right", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  const convertButton = page.getByRole("button", { name: "Variante übernehmen" });
  await convertButton.click();
  await page.getByLabel("Zielgröße").selectOption("50");
  await convertButton.click();

  const assignA = page.getByRole("button", { name: "Run 1 als A setzen" });
  const assignB = page.getByRole("button", { name: "Run 2 als B setzen" });
  await assignA.focus();
  await page.keyboard.press("Enter");
  await assignB.focus();
  await page.keyboard.press("Enter");

  await expect(assignA).toHaveAttribute("aria-pressed", "true");
  await expect(assignB).toHaveAttribute("aria-pressed", "true");
  await expect(assignB).toBeFocused();
  const layerA = page.getByTestId("compare-layer-a");
  const layerB = page.getByTestId("compare-layer-b");
  const contentA = page.getByTestId("compare-content-a");
  const contentB = page.getByTestId("compare-content-b");
  await expect(contentA.locator(":scope > svg")).toHaveAttribute("viewBox", "0 0 256 256");
  await expect(contentB.locator(":scope > svg")).toHaveAttribute("viewBox", "0 0 128 128");
  await expect(contentA.locator(":scope > svg")).toHaveAttribute(
    "preserveAspectRatio",
    "xMidYMid meet",
  );
  await expect(contentA.locator(":scope > svg")).toHaveAttribute(
    "data-source-view-box",
    "0 0 256 256",
  );
  await expect(contentB.locator(":scope > svg")).toHaveAttribute(
    "data-source-view-box",
    "0 0 128 128",
  );
  expect(await layerA.boundingBox()).toEqual(await layerB.boundingBox());
  const tracedShape = contentA.locator("path");
  const shapeBounds = await tracedShape.boundingBox();
  expect(shapeBounds).not.toBeNull();
  expect(Math.abs((shapeBounds?.width ?? 0) - (shapeBounds?.height ?? 0))).toBeLessThan(1);

  const slider = page.getByRole("slider", { name: "Trennposition zwischen A und B" });
  await expectSplit(
    slider,
    layerA,
    layerB,
    "0",
    "inset(0px 100% 0px 0px)",
    "inset(0px 0px 0px 0%)",
  );
  await expectSplit(
    slider,
    layerA,
    layerB,
    "50",
    "inset(0px 50% 0px 0px)",
    "inset(0px 0px 0px 50%)",
  );
  await expectSplit(
    slider,
    layerA,
    layerB,
    "100",
    "inset(0px 0% 0px 0px)",
    "inset(0px 0px 0px 100%)",
  );

  const canvas = page.getByTestId("compare-canvas");
  await slider.fill("50");
  const bounds = await canvas.boundingBox();
  const divider = page.getByRole("separator", { name: "A/B-Trenner verschieben" });
  const dividerBounds = await divider.boundingBox();
  expect(bounds).not.toBeNull();
  expect(dividerBounds).not.toBeNull();
  if (!bounds || !dividerBounds) {
    return;
  }
  await divider.hover();
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.75, bounds.y + bounds.height / 2);
  await page.mouse.up();
  await expect(slider).toHaveValue("75");
  await expect(divider).toHaveAttribute("aria-valuenow", "75");
  await expect(layerA).toHaveCSS("clip-path", "inset(0px 25% 0px 0px)");
  await expect(layerB).toHaveCSS("clip-path", "inset(0px 0px 0px 75%)");
});

async function expectSplit(
  slider: import("@playwright/test").Locator,
  layerA: import("@playwright/test").Locator,
  layerB: import("@playwright/test").Locator,
  percentage: string,
  clipA: string,
  clipB: string,
): Promise<void> {
  await slider.fill(percentage);
  await expect(layerA).toHaveCSS("clip-path", clipA);
  await expect(layerB).toHaveCSS("clip-path", clipB);
}
