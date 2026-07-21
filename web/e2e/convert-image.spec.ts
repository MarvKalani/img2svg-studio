import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given the loaded circle fixture, when its live preview is accepted, then a deterministic transparent SVG is recorded", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);

  await page.getByRole("button", { name: "Variante übernehmen" }).click();

  const svgOutput = page.locator("#compare-content-b");
  await expect(svgOutput.locator("svg")).toHaveAttribute("viewBox", "0 0 256 256");
  await expect(svgOutput.locator("path").first()).toBeVisible();
  await expect(page.getByRole("status", { name: "Anwendungsstatus" })).toContainText(
    "Variante 1 übernommen",
  );
});

test("Given a canvas image uses every preferred transparency key, when loaded, then its preview remains convertible", async ({
  page,
}) => {
  await page.goto("/");
  const pngBytes = await canvasImageWithOccupiedTransparencyKeys(page);

  await page.getByLabel("Rasterbild auswählen").setInputFiles({
    buffer: Buffer.from(pngBytes),
    mimeType: "image/png",
    name: "palette-with-transparency.png",
  });

  await expect(page.getByRole("alert")).toBeHidden();
  await expect(page.locator("#compare-content-b svg")).toHaveAttribute("viewBox", "0 0 9 1");
  await expect(page.getByRole("button", { name: "Variante übernehmen" })).toBeEnabled();
});

async function canvasImageWithOccupiedTransparencyKeys(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 9;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is required by this browser test.");
    const rgba = [
      [255, 0, 255, 255],
      [0, 255, 255, 255],
      [255, 255, 0, 255],
      [255, 0, 0, 255],
      [0, 255, 0, 255],
      [0, 0, 255, 255],
      [255, 255, 255, 255],
      [1, 1, 1, 255],
      [0, 0, 0, 0],
    ].flat();
    context.putImageData(new ImageData(new Uint8ClampedArray(rgba), 9, 1), 0, 0);
    const png = await new Promise<Blob>((resolveBlob, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolveBlob(blob);
        else reject(new Error("Canvas PNG encoding failed."));
      }, "image/png");
    });
    return [...new Uint8Array(await png.arrayBuffer())];
  });
}
