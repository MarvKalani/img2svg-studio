import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const portraitFixturePath = resolve(import.meta.dirname, "../../fixtures/ai/input/portrait.png");

test("Given a flat background, when the Magic Wand sensitivity is previewed and accepted, then only the visible contiguous selection becomes transparent", async ({
  page,
}) => {
  const remoteRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== "http://127.0.0.1:4173") {
      remoteRequests.push(url.href);
    }
  });
  await page.goto("/");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(portraitFixturePath);
  await page.getByRole("button", { name: "Variante übernehmen" }).click();
  await expect(page.getByTestId("history-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Original", exact: true }).click();

  const magicWand = page.getByRole("button", { name: "Zauberstab", exact: true });
  await expect(magicWand).toBeEnabled();
  await magicWand.click();
  const overlay = page.getByTestId("magic-wand-overlay");
  const canvas = page.getByTestId("magic-wand-canvas");
  await expect(overlay).toBeVisible();
  await expect(page.getByTestId("workspace-raster-preview")).toBeVisible();
  await expect(page.getByTestId("svg-output")).toBeHidden();

  await clickImagePoint(canvas, 8, 8);
  const backgroundPixels = await visibleMaskPixels(canvas);
  expect(backgroundPixels).toBeGreaterThan(0);
  expect(backgroundPixels).toBeLessThan(256 * 256);
  await page.getByLabel("Zauberstab-Empfindlichkeit").fill("100");
  await expect.poll(() => visibleMaskPixels(canvas)).toBe(256 * 256);
  await page.getByRole("button", { name: "Verwerfen", exact: true }).click();
  await expect(overlay).toBeHidden();
  await expect(page.locator("#magic-wand-status")).toContainText("Bild unverändert");
  await expect(page.getByTestId("history-card")).toHaveCount(1);

  await magicWand.click();
  await expect(overlay).toBeVisible();
  await page.getByLabel("Zauberstab-Empfindlichkeit").fill("15");
  await clickImagePoint(canvas, 8, 8);
  await page.getByRole("button", { name: "Auswahl entfernen", exact: true }).click();

  await expect(page.getByText("portrait-zauberstab.png", { exact: true })).toBeVisible();
  await expect(page.locator("#source-metadata")).toContainText("Bearbeitet · V2");
  await expect(page.locator("#magic-wand-status")).toContainText("lokal entfernt");
  await expect(overlay).toBeHidden();
  await expect(page.getByTestId("history-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Verarbeitet", exact: true }).click();
  const alpha = await previewAlpha(page);
  expect(alpha.background).toBe(0);
  expect(alpha.foreground).toBe(255);
  expect(remoteRequests).toEqual([]);
});

async function clickImagePoint(canvas: Locator, xPixels: number, yPixels: number): Promise<void> {
  const bounds = await canvas.boundingBox();
  if (!bounds) {
    throw new Error("Magic Wand canvas is not visible.");
  }
  await canvas.click({
    position: {
      x: (xPixels / 256) * bounds.width,
      y: (yPixels / 256) * bounds.height,
    },
  });
}

async function visibleMaskPixels(canvas: Locator): Promise<number> {
  return canvas.evaluate((element: HTMLCanvasElement) => {
    const context = element.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Magic Wand canvas is unavailable.");
    }
    const rgba = context.getImageData(0, 0, element.width, element.height).data;
    let visible = 0;
    for (let alphaIndex = 3; alphaIndex < rgba.length; alphaIndex += 4) {
      visible += (rgba[alphaIndex] ?? 0) > 0 ? 1 : 0;
    }
    return visible;
  });
}

async function previewAlpha(
  page: Page,
): Promise<Readonly<{ background: number; foreground: number }>> {
  return page.getByTestId("workspace-raster-preview").evaluate((image: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Preview canvas is unavailable.");
    }
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const alphaAt = (x: number, y: number): number => rgba[(y * canvas.width + x) * 4 + 3] ?? 0;
    return { background: alphaAt(8, 8), foreground: alphaAt(128, 190) };
  });
}
