import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given two runs, when assigned by keyboard, then 0, 50, and 100 percent align and blend A with B", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  const convertButton = page.getByRole("button", { name: "Konvertieren" });
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
  await expect(layerA.locator(":scope > svg")).toHaveAttribute("viewBox", "0 0 1 1");
  await expect(layerB.locator(":scope > svg")).toHaveAttribute("viewBox", "0 0 1 1");
  await expect(layerA.locator(":scope > svg")).toHaveAttribute(
    "preserveAspectRatio",
    "xMidYMid meet",
  );
  await expect(layerA.locator(":scope > svg")).toHaveAttribute(
    "data-source-view-box",
    "0 0 256 256",
  );
  await expect(layerB.locator(":scope > svg")).toHaveAttribute(
    "data-source-view-box",
    "0 0 128 128",
  );
  expect(await layerA.boundingBox()).toEqual(await layerB.boundingBox());
  const tracedShape = layerA.locator("path");
  const shapeBounds = await tracedShape.boundingBox();
  expect(shapeBounds).not.toBeNull();
  expect(Math.abs((shapeBounds?.width ?? 0) - (shapeBounds?.height ?? 0))).toBeLessThan(1);

  const slider = page.getByRole("slider", { name: "Anteil Variante B" });
  await expectBlend(slider, layerA, layerB, "0", "1", "0");
  await expectBlend(slider, layerA, layerB, "50", "0.5", "0.5");
  await expectBlend(slider, layerA, layerB, "100", "0", "1");
});

async function expectBlend(
  slider: import("@playwright/test").Locator,
  layerA: import("@playwright/test").Locator,
  layerB: import("@playwright/test").Locator,
  percentage: string,
  opacityA: string,
  opacityB: string,
): Promise<void> {
  await slider.fill(percentage);
  await expect(layerA).toHaveCSS("opacity", opacityA);
  await expect(layerB).toHaveCSS("opacity", opacityB);
}
